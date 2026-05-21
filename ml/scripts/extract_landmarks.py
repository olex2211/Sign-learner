"""
extract_landmarks.py — Extract hand landmarks from gesture images using MediaPipe.

Usage:
    python scripts/extract_landmarks.py --dataset-dir ../DataSet --output data/landmarks.csv

Output:
    - data/landmarks.csv — normalized landmarks (label, 63 floats)
    - data/label_map.json — mapping label_name -> label_index
"""

import argparse
import csv
import json
import os
import sys
import unicodedata
import urllib.request
from pathlib import Path

import cv2
import mediapipe as mp
import numpy as np

# MediaPipe Tasks API
from mediapipe.tasks.python import BaseOptions
from mediapipe.tasks.python.vision import (
    HandLandmarker,
    HandLandmarkerOptions,
    RunningMode,
)

MODEL_URL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task"
MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "models", "hand_landmarker.task")
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
SPLITS = ("train", "val", "test")


def download_model_if_needed() -> str:
    """Download the MediaPipe hand landmarker model bundle if not present."""
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    if not os.path.exists(MODEL_PATH):
        print(f"Downloading hand landmarker model...")
        urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
        print(f"Model saved to: {MODEL_PATH}")
    return MODEL_PATH


def normalize_landmarks(landmarks) -> np.ndarray | None:
    """
    Normalize 21 hand landmarks to be position- and scale-invariant.

    1. Subtract wrist (landmark 0) coordinates → position-invariant
    2. Divide by distance from wrist to middle finger MCP (landmark 9) → scale-invariant
    3. Flatten to 63-dim vector
    """
    coords = np.array([[lm.x, lm.y, lm.z] for lm in landmarks])  # (21, 3)

    # Subtract wrist position
    wrist = coords[0].copy()
    coords -= wrist

    # Normalize by distance wrist → middle finger MCP (landmark 9)
    scale = np.linalg.norm(coords[9])
    if scale < 1e-6:
        return None  # degenerate hand detection

    coords /= scale

    return coords.flatten()  # (63,)


def normalize_label(label: str) -> str:
    """Normalize visually identical Ukrainian folder names to a stable form."""
    return unicodedata.normalize("NFC", label)


def make_landmarker() -> HandLandmarker:
    """Create a MediaPipe hand landmarker instance."""
    model_path = download_model_if_needed()
    options = HandLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=model_path),
        running_mode=RunningMode.IMAGE,
        num_hands=1,
        min_hand_detection_confidence=0.5,
        min_hand_presence_confidence=0.5,
    )
    return HandLandmarker.create_from_options(options)


def landmark_header(include_metadata: bool = False) -> list[str]:
    landmark_names = []
    for i in range(21):
        landmark_names.extend([f"x{i}", f"y{i}", f"z{i}"])
    if include_metadata:
        return ["label", "split", "video_id", "frame_path"] + landmark_names
    return ["label"] + landmark_names


def read_image(img_path: Path) -> np.ndarray | None:
    """Read image with Unicode-safe method (cv2.imread fails with Cyrillic paths on Windows)."""
    try:
        img_data = np.fromfile(str(img_path), dtype=np.uint8)
        return cv2.imdecode(img_data, cv2.IMREAD_COLOR)
    except Exception:
        return None


def extract_image_landmarks(landmarker: HandLandmarker, img_path: Path) -> np.ndarray | None:
    image = read_image(img_path)
    if image is None:
        return None

    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    mp_image = mp.Image(
        image_format=mp.ImageFormat.SRGB,
        data=image_rgb,
    )
    result = landmarker.detect(mp_image)
    if not result.hand_landmarks:
        return None

    return normalize_landmarks(result.hand_landmarks[0])


def iter_class_images(class_dir: Path) -> list[Path]:
    return sorted([
        p for p in class_dir.iterdir()
        if p.is_file() and p.suffix.lower() in IMAGE_EXTENSIONS
    ])


def iter_class_images_recursive(class_dir: Path) -> list[Path]:
    return sorted([
        p for p in class_dir.rglob("*")
        if p.is_file() and p.suffix.lower() in IMAGE_EXTENSIONS
    ])


def extract_from_dataset(dataset_dir: str, output_csv: str, output_label_map: str) -> None:
    """Process all images in dataset_dir and save landmarks to CSV."""
    dataset_path = Path(dataset_dir)
    if not dataset_path.exists():
        print(f"Error: Dataset directory '{dataset_dir}' not found.")
        sys.exit(1)

    # Discover classes (subdirectory names)
    class_dirs = sorted([
        d for d in dataset_path.iterdir()
        if d.is_dir()
    ])
    if not class_dirs:
        print(f"Error: No subdirectories found in '{dataset_dir}'.")
        sys.exit(1)

    label_map = {normalize_label(d.name): idx for idx, d in enumerate(class_dirs)}
    print(f"Found {len(label_map)} classes: {label_map}")

    landmarker = make_landmarker()

    # Prepare output directory
    os.makedirs(os.path.dirname(output_csv), exist_ok=True)

    total_processed = 0
    total_skipped = 0
    class_counts = {}

    with open(output_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(landmark_header())

        for class_dir in class_dirs:
            label = normalize_label(class_dir.name)
            class_count = 0
            skipped = 0

            image_files = iter_class_images(class_dir)

            print(f"\nProcessing class '{label}': {len(image_files)} images...")

            for img_path in image_files:
                normalized = extract_image_landmarks(landmarker, img_path)
                if normalized is None:
                    skipped += 1
                    continue

                # Write row
                row = [label] + normalized.tolist()
                writer.writerow(row)
                class_count += 1

            class_counts[label] = class_count
            total_processed += class_count
            total_skipped += skipped
            print(f"  Done '{label}': {class_count} landmarks extracted, {skipped} skipped")

    landmarker.close()

    # Save label map
    with open(output_label_map, "w", encoding="utf-8") as f:
        json.dump(label_map, f, ensure_ascii=False, indent=2)

    print(f"\n{'='*50}")
    print(f"Total: {total_processed} landmarks extracted, {total_skipped} images skipped")
    print(f"Saved to: {output_csv}")
    print(f"Label map: {output_label_map}")
    print(f"Class distribution: {class_counts}")


def discover_split_labels(dataset_path: Path) -> list[str]:
    labels = set()
    for split in SPLITS:
        split_dir = dataset_path / split
        if not split_dir.exists():
            continue
        labels.update(normalize_label(d.name) for d in split_dir.iterdir() if d.is_dir())
    return sorted(labels)


def extract_from_split_dataset(dataset_dir: str, output_dir: str, output_label_map: str) -> None:
    """Process train/val/test dataset with nested video folders."""
    dataset_path = Path(dataset_dir)
    if not dataset_path.exists():
        print(f"Error: Dataset directory '{dataset_dir}' not found.")
        sys.exit(1)

    labels = discover_split_labels(dataset_path)
    if not labels:
        print(f"Error: No split class directories found in '{dataset_dir}'.")
        sys.exit(1)

    label_map = {label: idx for idx, label in enumerate(labels)}
    print(f"Found {len(label_map)} classes: {label_map}")

    os.makedirs(output_dir, exist_ok=True)
    with open(output_label_map, "w", encoding="utf-8") as f:
        json.dump(label_map, f, ensure_ascii=False, indent=2)

    landmarker = make_landmarker()
    totals = {}

    try:
        for split in SPLITS:
            split_dir = dataset_path / split
            if not split_dir.exists():
                print(f"\nSkipping missing split: {split}")
                continue

            output_csv = Path(output_dir) / f"{split}_landmarks.csv"
            split_processed = 0
            split_skipped = 0
            split_counts = {}

            with open(output_csv, "w", newline="", encoding="utf-8") as f:
                writer = csv.writer(f)
                writer.writerow(landmark_header(include_metadata=True))

                class_dirs = sorted(d for d in split_dir.iterdir() if d.is_dir())
                for class_dir in class_dirs:
                    label = normalize_label(class_dir.name)
                    image_files = iter_class_images_recursive(class_dir)
                    class_count = 0
                    skipped = 0
                    print(f"\nProcessing {split}/{label}: {len(image_files)} frames...")

                    for img_path in image_files:
                        normalized = extract_image_landmarks(landmarker, img_path)
                        if normalized is None:
                            skipped += 1
                            continue

                        video_id = img_path.parent.name
                        frame_path = img_path.relative_to(dataset_path).as_posix()
                        row = [label, split, video_id, frame_path] + normalized.tolist()
                        writer.writerow(row)
                        class_count += 1

                    split_counts[label] = class_count
                    split_processed += class_count
                    split_skipped += skipped
                    print(f"  Done {split}/{label}: {class_count} landmarks extracted, {skipped} skipped")

            totals[split] = split_counts
            print(f"\n{split}: {split_processed} landmarks extracted, {split_skipped} frames skipped")
            print(f"Saved to: {output_csv}")
    finally:
        landmarker.close()

    print(f"\n{'='*50}")
    print(f"Label map: {output_label_map}")
    print(f"Class distribution by split: {totals}")


def main():
    parser = argparse.ArgumentParser(description="Extract hand landmarks from gesture dataset")
    parser.add_argument(
        "--dataset-dir",
        type=str,
        default="../DataSet",
        help="Path to dataset directory with subdirectories per class",
    )
    parser.add_argument(
        "--output",
        type=str,
        default="data/landmarks.csv",
        help="Output CSV file path",
    )
    parser.add_argument(
        "--label-map",
        type=str,
        default="data/label_map.json",
        help="Output label map JSON file path",
    )
    parser.add_argument(
        "--split-aware",
        action="store_true",
        help="Read dataset_dir/train|val|test/<label>/<video_id>/*.jpg and write one CSV per split.",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="data/zenodo",
        help="Output directory for split-aware CSV files.",
    )
    args = parser.parse_args()

    if args.split_aware:
        extract_from_split_dataset(args.dataset_dir, args.output_dir, args.label_map)
    else:
        extract_from_dataset(args.dataset_dir, args.output, args.label_map)


if __name__ == "__main__":
    main()
