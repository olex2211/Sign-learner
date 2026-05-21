"""
train.py — Train a PyTorch MLP classifier on hand landmarks.

Usage:
    python train/train.py --data data/landmarks.csv --output models/

Output:
    - models/best.pt — best model checkpoint
    - models/label_map.json — copy of label map for inference
    - models/confusion_matrix.png — confusion matrix visualization
    - models/training_history.json — loss/accuracy per epoch
"""

import argparse
import json
import os
import sys
from pathlib import Path

import matplotlib
matplotlib.use("Agg")  # non-interactive backend
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
import torch
import torch.nn as nn
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
)
from sklearn.model_selection import train_test_split
from torch.utils.data import DataLoader, Dataset, WeightedRandomSampler


# ──────────────────────────────────────────────
# Dataset
# ──────────────────────────────────────────────

class LandmarkDataset(Dataset):
    """PyTorch Dataset for hand landmarks."""

    def __init__(
        self,
        features: np.ndarray,
        labels: np.ndarray,
        augment: bool = False,
        noise_std: float = 0.01,
    ):
        self.features = torch.FloatTensor(features)
        self.labels = torch.LongTensor(labels)
        self.augment = augment
        self.noise_std = noise_std

    def __len__(self):
        return len(self.labels)

    def __getitem__(self, idx):
        x = self.features[idx].clone()
        y = self.labels[idx]

        if self.augment:
            x = self._apply_augmentation(x)

        return x, y

    def _apply_augmentation(self, x: torch.Tensor) -> torch.Tensor:
        """Apply random augmentation to landmark vector."""
        # Gaussian noise
        noise = torch.randn_like(x) * self.noise_std
        x = x + noise

        # Random horizontal flip (mirror hand) — negate x coordinates
        if torch.rand(1).item() > 0.5:
            # x coords are at indices 0, 3, 6, 9, ... (every 3rd starting from 0)
            x_indices = torch.arange(0, len(x), 3)
            x[x_indices] = -x[x_indices]

        return x


# ──────────────────────────────────────────────
# Model
# ──────────────────────────────────────────────

class GestureMLP(nn.Module):
    """MLP classifier for hand gesture recognition."""

    def __init__(self, input_dim: int = 63, num_classes: int = 2):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, 256),
            nn.BatchNorm1d(256),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(256, 128),
            nn.BatchNorm1d(128),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(128, num_classes),
        )

    def forward(self, x):
        return self.net(x)


# ──────────────────────────────────────────────
# Training utilities
# ──────────────────────────────────────────────

def create_weighted_sampler(labels: np.ndarray) -> WeightedRandomSampler:
    """Create a weighted random sampler for class balancing."""
    class_counts = np.bincount(labels)
    class_weights = 1.0 / class_counts
    sample_weights = class_weights[labels]
    return WeightedRandomSampler(
        weights=sample_weights,
        num_samples=len(labels),
        replacement=True,
    )


def train_one_epoch(
    model: nn.Module,
    dataloader: DataLoader,
    criterion: nn.Module,
    optimizer: torch.optim.Optimizer,
    device: torch.device,
) -> tuple[float, float]:
    """Train for one epoch. Returns (avg_loss, accuracy)."""
    model.train()
    total_loss = 0.0
    correct = 0
    total = 0

    for features, labels in dataloader:
        features, labels = features.to(device), labels.to(device)

        optimizer.zero_grad()
        outputs = model(features)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()

        total_loss += loss.item() * features.size(0)
        _, predicted = torch.max(outputs, 1)
        correct += (predicted == labels).sum().item()
        total += labels.size(0)

    return total_loss / total, correct / total


@torch.no_grad()
def evaluate(
    model: nn.Module,
    dataloader: DataLoader,
    criterion: nn.Module,
    device: torch.device,
) -> tuple[float, float, np.ndarray, np.ndarray]:
    """Evaluate model. Returns (avg_loss, accuracy, all_preds, all_labels)."""
    model.eval()
    total_loss = 0.0
    all_preds = []
    all_labels = []

    for features, labels in dataloader:
        features, labels = features.to(device), labels.to(device)

        outputs = model(features)
        loss = criterion(outputs, labels)

        total_loss += loss.item() * features.size(0)
        _, predicted = torch.max(outputs, 1)

        all_preds.extend(predicted.cpu().numpy())
        all_labels.extend(labels.cpu().numpy())

    all_preds = np.array(all_preds)
    all_labels = np.array(all_labels)
    accuracy = accuracy_score(all_labels, all_preds)

    return total_loss / len(all_labels), accuracy, all_preds, all_labels


def plot_confusion_matrix(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    class_names: list[str],
    output_path: str,
) -> None:
    """Save confusion matrix as PNG."""
    cm = confusion_matrix(y_true, y_pred)
    n = len(class_names)
    fig_size = max(8, n * 0.5)
    plt.figure(figsize=(fig_size, fig_size * 0.85))
    sns.heatmap(
        cm,
        annot=True,
        fmt="d",
        cmap="Blues",
        xticklabels=class_names,
        yticklabels=class_names,
        annot_kws={"size": max(6, 12 - n // 5)},
    )
    plt.xlabel("Predicted")
    plt.ylabel("True")
    plt.title("Confusion Matrix")
    plt.tight_layout()
    plt.savefig(output_path, dpi=150)
    plt.close()
    print(f"Confusion matrix saved to: {output_path}")


def plot_training_history(history: dict, output_path: str) -> None:
    """Save training history plots (loss + accuracy) as PNG."""
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

    epochs = range(1, len(history["train_loss"]) + 1)

    # Loss
    ax1.plot(epochs, history["train_loss"], label="Train Loss")
    ax1.plot(epochs, history["val_loss"], label="Val Loss")
    ax1.set_xlabel("Epoch")
    ax1.set_ylabel("Loss")
    ax1.set_title("Training & Validation Loss")
    ax1.legend()
    ax1.grid(True, alpha=0.3)

    # Accuracy
    ax2.plot(epochs, history["train_acc"], label="Train Acc")
    ax2.plot(epochs, history["val_acc"], label="Val Acc")
    ax2.set_xlabel("Epoch")
    ax2.set_ylabel("Accuracy")
    ax2.set_title("Training & Validation Accuracy")
    ax2.legend()
    ax2.grid(True, alpha=0.3)

    plt.tight_layout()
    plt.savefig(output_path, dpi=150)
    plt.close()
    print(f"Training history saved to: {output_path}")


def feature_columns(df: pd.DataFrame) -> list[str]:
    """Return landmark feature columns, ignoring optional split/video metadata."""
    return [col for col in df.columns if col.startswith(("x", "y", "z"))]


def load_label_map(path: str) -> dict[str, int]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_single_csv_data(args, label_map: dict[str, int]):
    df = pd.read_csv(args.data)
    print(f"Loaded {len(df)} samples")

    labels_str = df["label"].values

    # Filter out classes with too few samples for stratified split
    class_counts_raw = dict(zip(*np.unique(labels_str, return_counts=True)))
    dropped_classes = [c for c, n in class_counts_raw.items() if n < args.min_samples]
    if dropped_classes:
        print(f"\nWARNING: Dropping {len(dropped_classes)} classes with < {args.min_samples} samples: {dropped_classes}")
        mask = ~np.isin(labels_str, dropped_classes)
        df = df[mask].reset_index(drop=True)
        labels_str = df["label"].values
        remaining = sorted(set(labels_str))
        label_map = {name: idx for idx, name in enumerate(remaining)}
        print(f"Remaining classes ({len(label_map)}): {list(label_map.keys())}")

    columns = feature_columns(df)
    label_indices = np.array([label_map[l] for l in labels_str])
    features = df[columns].values.astype(np.float32)

    print(f"Feature shape: {features.shape}")
    print(f"Class distribution: {dict(zip(*np.unique(labels_str, return_counts=True)))}")

    X_train, X_temp, y_train, y_temp = train_test_split(
        features, label_indices, test_size=0.3, random_state=args.seed, stratify=label_indices
    )
    X_val, X_test, y_val, y_test = train_test_split(
        X_temp, y_temp, test_size=0.5, random_state=args.seed, stratify=y_temp
    )

    print(f"\nSplit sizes: train={len(X_train)}, val={len(X_val)}, test={len(X_test)}")
    return X_train, y_train, X_val, y_val, X_test, y_test, label_map


def load_presplit_data(args, label_map: dict[str, int]):
    split_frames = {
        "train": pd.read_csv(args.train_data),
        "val": pd.read_csv(args.val_data),
        "test": pd.read_csv(args.test_data),
    }
    print(
        "Loaded split samples: "
        + ", ".join(f"{name}={len(df)}" for name, df in split_frames.items())
    )

    train_labels = split_frames["train"]["label"].values
    train_counts = dict(zip(*np.unique(train_labels, return_counts=True)))
    dropped_classes = [c for c, n in train_counts.items() if n < args.min_samples]
    missing_from_train = [label for label in label_map if label not in train_counts]
    dropped_classes.extend(missing_from_train)

    if dropped_classes:
        dropped_classes = sorted(set(dropped_classes))
        print(f"\nWARNING: Dropping {len(dropped_classes)} classes unavailable/low in train: {dropped_classes}")

    remaining = [label for label in label_map if label not in dropped_classes]
    label_map = {name: idx for idx, name in enumerate(remaining)}
    print(f"Remaining classes ({len(label_map)}): {remaining}")

    arrays = {}
    for split, df in split_frames.items():
        df = df[df["label"].isin(label_map)].reset_index(drop=True)
        labels = df["label"].values
        columns = feature_columns(df)
        arrays[split] = (
            df[columns].values.astype(np.float32),
            np.array([label_map[l] for l in labels]),
        )
        print(f"{split} class distribution: {dict(zip(*np.unique(labels, return_counts=True)))}")

    X_train, y_train = arrays["train"]
    X_val, y_val = arrays["val"]
    X_test, y_test = arrays["test"]
    print(f"\nSplit sizes: train={len(X_train)}, val={len(X_val)}, test={len(X_test)}")
    return X_train, y_train, X_val, y_val, X_test, y_test, label_map


# ──────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Train gesture classifier MLP")
    parser.add_argument("--data", type=str, default="data/landmarks.csv", help="Path to landmarks CSV")
    parser.add_argument("--train-data", type=str, default=None, help="Path to pre-split train landmarks CSV")
    parser.add_argument("--val-data", type=str, default=None, help="Path to pre-split validation landmarks CSV")
    parser.add_argument("--test-data", type=str, default=None, help="Path to pre-split test landmarks CSV")
    parser.add_argument("--label-map", type=str, default="data/label_map.json", help="Path to label map JSON")
    parser.add_argument("--output", type=str, default="models/", help="Output directory for model artifacts")
    parser.add_argument("--epochs", type=int, default=100, help="Max training epochs")
    parser.add_argument("--batch-size", type=int, default=64, help="Batch size")
    parser.add_argument("--lr", type=float, default=1e-3, help="Learning rate")
    parser.add_argument("--patience", type=int, default=15, help="Early stopping patience")
    parser.add_argument("--min-samples", type=int, default=10, help="Min samples per class (classes with fewer are dropped)")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    args = parser.parse_args()

    # Set seeds
    torch.manual_seed(args.seed)
    np.random.seed(args.seed)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")

    # ── Load data ──
    label_map = load_label_map(args.label_map)
    idx_to_label = {v: k for k, v in label_map.items()}
    num_classes = len(label_map)
    class_names = [idx_to_label[i] for i in range(num_classes)]
    print(f"Classes: {class_names}")

    has_presplit_data = bool(args.train_data or args.val_data or args.test_data)
    if has_presplit_data and not (args.train_data and args.val_data and args.test_data):
        parser.error("--train-data, --val-data, and --test-data must be provided together")

    if has_presplit_data:
        X_train, y_train, X_val, y_val, X_test, y_test, label_map = load_presplit_data(args, label_map)
    else:
        X_train, y_train, X_val, y_val, X_test, y_test, label_map = load_single_csv_data(args, label_map)

    idx_to_label = {v: k for k, v in label_map.items()}
    num_classes = len(label_map)
    class_names = [idx_to_label[i] for i in range(num_classes)]

    # ── Create datasets & dataloaders ──
    train_dataset = LandmarkDataset(X_train, y_train, augment=True)
    val_dataset = LandmarkDataset(X_val, y_val, augment=False)
    test_dataset = LandmarkDataset(X_test, y_test, augment=False)

    sampler = create_weighted_sampler(y_train)

    train_loader = DataLoader(train_dataset, batch_size=args.batch_size, sampler=sampler)
    val_loader = DataLoader(val_dataset, batch_size=args.batch_size, shuffle=False)
    test_loader = DataLoader(test_dataset, batch_size=args.batch_size, shuffle=False)

    # ── Model, optimizer, criterion ──
    input_dim = X_train.shape[1]
    model = GestureMLP(input_dim=input_dim, num_classes=num_classes).to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=args.lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, mode="min", factor=0.5, patience=5,
    )
    criterion = nn.CrossEntropyLoss()

    print(f"\nModel:\n{model}")
    total_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"Total trainable parameters: {total_params:,}")

    # ── Training loop ──
    os.makedirs(args.output, exist_ok=True)
    best_val_acc = 0.0
    patience_counter = 0
    history = {"train_loss": [], "train_acc": [], "val_loss": [], "val_acc": []}

    print(f"\n{'='*60}")
    print(f"Starting training for max {args.epochs} epochs...")
    print(f"{'='*60}\n")

    for epoch in range(1, args.epochs + 1):
        train_loss, train_acc = train_one_epoch(model, train_loader, criterion, optimizer, device)
        val_loss, val_acc, _, _ = evaluate(model, val_loader, criterion, device)

        scheduler.step(val_loss)

        history["train_loss"].append(train_loss)
        history["train_acc"].append(train_acc)
        history["val_loss"].append(val_loss)
        history["val_acc"].append(val_acc)

        print(
            f"Epoch {epoch:3d}/{args.epochs} | "
            f"Train Loss: {train_loss:.4f} Acc: {train_acc:.4f} | "
            f"Val Loss: {val_loss:.4f} Acc: {val_acc:.4f}"
        )

        # Save best model
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            patience_counter = 0
            checkpoint = {
                "epoch": epoch,
                "model_state_dict": model.state_dict(),
                "optimizer_state_dict": optimizer.state_dict(),
                "val_acc": val_acc,
                "val_loss": val_loss,
                "num_classes": num_classes,
                "input_dim": input_dim,
                "label_map": label_map,
            }
            torch.save(checkpoint, os.path.join(args.output, "best.pt"))
            print(f"  * New best model saved (val_acc={val_acc:.4f})")
        else:
            patience_counter += 1
            if patience_counter >= args.patience:
                print(f"\nEarly stopping at epoch {epoch} (no improvement for {args.patience} epochs)")
                break

    # ── Evaluate on test set ──
    print(f"\n{'='*60}")
    print("Evaluating on test set...")
    print(f"{'='*60}\n")

    # Load best model
    checkpoint = torch.load(os.path.join(args.output, "best.pt"), map_location=device, weights_only=True)
    model.load_state_dict(checkpoint["model_state_dict"])

    test_loss, test_acc, test_preds, test_labels = evaluate(model, test_loader, criterion, device)

    print(f"Test Loss: {test_loss:.4f}")
    print(f"Test Accuracy: {test_acc:.4f}")
    print(f"\nClassification Report:")
    print(classification_report(test_labels, test_preds, target_names=class_names, zero_division=0))

    f1 = f1_score(test_labels, test_preds, average="weighted")
    print(f"Weighted F1 Score: {f1:.4f}")

    # ── Save artifacts ──
    # Confusion matrix
    plot_confusion_matrix(
        test_labels, test_preds, class_names,
        os.path.join(args.output, "confusion_matrix.png"),
    )

    # Training history
    plot_training_history(history, os.path.join(args.output, "training_history.png"))

    with open(os.path.join(args.output, "training_history.json"), "w") as f:
        json.dump(history, f, indent=2)

    # Save the effective label map used by the trained model. This may differ
    # from the input label map when low-sample classes were dropped.
    with open(os.path.join(args.output, "label_map.json"), "w", encoding="utf-8") as f:
        json.dump(label_map, f, ensure_ascii=False, indent=2)

    print(f"\n{'='*60}")
    print(f"Training complete!")
    print(f"Best val accuracy: {best_val_acc:.4f}")
    print(f"Test accuracy: {test_acc:.4f}")
    print(f"Artifacts saved to: {args.output}")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
