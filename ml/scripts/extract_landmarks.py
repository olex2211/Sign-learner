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

    label_map = {d.name: idx for idx, d in enumerate(class_dirs)}
    print(f"Found {len(label_map)} classes: {label_map}")

    # Download model if needed
    model_path = download_model_if_needed()

    # Initialize MediaPipe Hand Landmarker (new Tasks API)
    options = HandLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=model_path),
        running_mode=RunningMode.IMAGE,
        num_hands=1,
        min_hand_detection_confidence=0.5,
        min_hand_presence_confidence=0.5,
    )
    landmarker = HandLandmarker.create_from_options(options)

    # Prepare output directory
    os.makedirs(os.path.dirname(output_csv), exist_ok=True)

    # CSV header: label, x0, y0, z0, x1, y1, z1, ..., x20, y20, z20
    landmark_names = []
    for i in range(21):
        landmark_names.extend([f"x{i}", f"y{i}", f"z{i}"])
    header = ["label"] + landmark_names

    total_processed = 0
    total_skipped = 0
    class_counts = {}

    with open(output_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(header)

        for class_dir in class_dirs:
            label = class_dir.name
            class_count = 0
            skipped = 0

            image_files = sorted([
                p for p in class_dir.iterdir()
                if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
            ])

            print(f"\nProcessing class '{label}': {len(image_files)} images...")

            for img_path in image_files:
                # Read image with Unicode-safe method (cv2.imread fails with Cyrillic paths on Windows)
                try:
                    img_data = np.fromfile(str(img_path), dtype=np.uint8)
                    image = cv2.imdecode(img_data, cv2.IMREAD_COLOR)
                except Exception:
                    image = None
                if image is None:
                    skipped += 1
                    continue

                # Convert BGR → RGB
                image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

                # Create MediaPipe Image
                mp_image = mp.Image(
                    image_format=mp.ImageFormat.SRGB,
                    data=image_rgb,
                )

                # Detect hand landmarks
                result = landmarker.detect(mp_image)

                if not result.hand_landmarks:
                    skipped += 1
                    continue

                # Take the first detected hand
                hand_landmarks = result.hand_landmarks[0]

                # Normalize
                normalized = normalize_landmarks(hand_landmarks)
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
    args = parser.parse_args()

    extract_from_dataset(args.dataset_dir, args.output, args.label_map)


if __name__ == "__main__":
    main()
