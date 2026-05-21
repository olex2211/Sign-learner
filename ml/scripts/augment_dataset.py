"""
augment_dataset.py - Build a balanced image dataset with deterministic augmentations.

The script reads a dataset shaped like:

    DataSet/
      а/*.jpg
      б/*.jpg
      ...

and writes an output dataset with the same class directories. By default it creates
up to --target-per-class images for every class: strong classes are sampled down,
weak classes are topped up with augmented variants of real images.

This intentionally does not generate synthetic hands from scratch. The goal is to
improve class balance while keeping the model grounded in real photos.

Docker usage from repository root:

    docker compose run --rm ml-tools scripts/augment_dataset.py \
      --input /DataSet \
      --output /DataSet_augmented \
      --target-per-class 500 \
      --force
"""

from __future__ import annotations

import argparse
import json
import random
import shutil
from dataclasses import asdict, dataclass
from pathlib import Path

import cv2
import numpy as np


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


@dataclass
class ClassStats:
    class_name: str
    source_images: int
    copied_originals: int
    augmented_images: int
    output_images: int


def read_image(path: Path) -> np.ndarray | None:
    """Read an image using a Unicode-safe path method for Windows."""
    try:
        data = np.fromfile(str(path), dtype=np.uint8)
        return cv2.imdecode(data, cv2.IMREAD_COLOR)
    except Exception:
        return None


def write_jpeg(path: Path, image: np.ndarray, quality: int = 95) -> None:
    """Write a JPEG using a Unicode-safe path method for Windows."""
    path.parent.mkdir(parents=True, exist_ok=True)
    ok, encoded = cv2.imencode(".jpg", image, [int(cv2.IMWRITE_JPEG_QUALITY), quality])
    if not ok:
        raise RuntimeError(f"Failed to encode image: {path}")
    encoded.tofile(str(path))


def list_images(class_dir: Path) -> list[Path]:
    return sorted(
        path
        for path in class_dir.iterdir()
        if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
    )


def safe_stem(path: Path) -> str:
    return "".join(ch if ch.isalnum() or ch in {"-", "_"} else "_" for ch in path.stem)


def apply_affine(image: np.ndarray, rng: random.Random) -> np.ndarray:
    height, width = image.shape[:2]
    angle = rng.uniform(-12.0, 12.0)
    scale = rng.uniform(0.9, 1.12)
    tx = rng.uniform(-0.06, 0.06) * width
    ty = rng.uniform(-0.06, 0.06) * height

    matrix = cv2.getRotationMatrix2D((width / 2.0, height / 2.0), angle, scale)
    matrix[0, 2] += tx
    matrix[1, 2] += ty

    return cv2.warpAffine(
        image,
        matrix,
        (width, height),
        flags=cv2.INTER_LINEAR,
        borderMode=cv2.BORDER_REFLECT_101,
    )


def apply_photometric(image: np.ndarray, rng: random.Random) -> np.ndarray:
    alpha = rng.uniform(0.82, 1.22)
    beta = rng.uniform(-24.0, 24.0)
    image = cv2.convertScaleAbs(image, alpha=alpha, beta=beta)

    if rng.random() < 0.35:
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV).astype(np.float32)
        hsv[:, :, 1] *= rng.uniform(0.85, 1.15)
        hsv[:, :, 2] *= rng.uniform(0.9, 1.1)
        hsv = np.clip(hsv, 0, 255).astype(np.uint8)
        image = cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)

    if rng.random() < 0.25:
        sigma = rng.uniform(0.4, 1.0)
        image = cv2.GaussianBlur(image, (3, 3), sigma)

    if rng.random() < 0.35:
        noise_std = rng.uniform(2.0, 8.0)
        noise = np.random.default_rng(rng.randrange(2**32)).normal(0, noise_std, image.shape)
        image = np.clip(image.astype(np.float32) + noise, 0, 255).astype(np.uint8)

    return image


def augment_image(image: np.ndarray, rng: random.Random, allow_horizontal_flip: bool) -> np.ndarray:
    augmented = apply_affine(image, rng)

    if allow_horizontal_flip and rng.random() < 0.25:
        augmented = cv2.flip(augmented, 1)

    augmented = apply_photometric(augmented, rng)
    return augmented


def copy_original(src: Path, dst: Path) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)


def prepare_output_dir(output_dir: Path, force: bool) -> None:
    if output_dir.exists():
        if not force:
            raise SystemExit(
                f"Output directory already exists: {output_dir}. "
                "Pass --force to replace it or --resume to continue it."
            )
        for child in output_dir.iterdir():
            if child.is_dir():
                shutil.rmtree(child)
            else:
                child.unlink()
    else:
        output_dir.mkdir(parents=True, exist_ok=True)


def process_class(
    class_dir: Path,
    output_dir: Path,
    target_per_class: int,
    keep_all_originals: bool,
    allow_horizontal_flip: bool,
    resume: bool,
    rng: random.Random,
) -> ClassStats:
    class_name = class_dir.name
    images = list_images(class_dir)
    if not images:
        return ClassStats(class_name, 0, 0, 0, 0)

    class_output = output_dir / class_name
    class_output.mkdir(parents=True, exist_ok=True)

    existing_count = len(list_images(class_output)) if resume else 0
    if existing_count >= target_per_class:
        return ClassStats(class_name, len(images), 0, 0, existing_count)

    if keep_all_originals or len(images) <= target_per_class:
        selected_originals = images
    else:
        selected_originals = sorted(rng.sample(images, target_per_class))

    copied = 0
    if not resume:
        for index, image_path in enumerate(selected_originals):
            destination = class_output / f"orig_{index:05d}_{safe_stem(image_path)}.jpg"
            image = read_image(image_path)
            if image is None:
                continue
            write_jpeg(destination, image)
            copied += 1

    current_count = existing_count + copied
    target = max(target_per_class, current_count) if keep_all_originals else target_per_class
    needed = max(0, target - current_count)
    augmented = 0
    attempts = 0
    max_attempts = max(needed * 5, 50)

    while augmented < needed and attempts < max_attempts:
        attempts += 1
        source = rng.choice(images)
        image = read_image(source)
        if image is None:
            continue

        result = augment_image(image, rng, allow_horizontal_flip)
        destination = class_output / f"aug_{existing_count + copied + augmented:05d}_from_{safe_stem(source)}.jpg"
        write_jpeg(destination, result)
        augmented += 1

    output_images = len(list_images(class_output))
    return ClassStats(class_name, len(images), copied, augmented, output_images)


def build_augmented_dataset(args: argparse.Namespace) -> list[ClassStats]:
    input_dir = Path(args.input)
    output_dir = Path(args.output)

    if not input_dir.exists():
        raise SystemExit(f"Input directory not found: {input_dir}")

    input_resolved = input_dir.resolve()
    output_resolved = output_dir.resolve()
    if output_resolved == input_resolved:
        raise SystemExit("Output directory must be different from input directory.")
    if input_resolved in output_resolved.parents:
        raise SystemExit("Output directory must not be inside the input dataset directory.")

    class_dirs = sorted(path for path in input_dir.iterdir() if path.is_dir())
    if not class_dirs:
        raise SystemExit(f"No class directories found in: {input_dir}")

    if args.force and args.resume:
        raise SystemExit("Use either --force or --resume, not both.")

    if args.resume:
        output_dir.mkdir(parents=True, exist_ok=True)
    else:
        prepare_output_dir(output_dir, args.force)

    rng = random.Random(args.seed)
    stats: list[ClassStats] = []

    for class_dir in class_dirs:
        class_stats = process_class(
            class_dir=class_dir,
            output_dir=output_dir,
            target_per_class=args.target_per_class,
            keep_all_originals=args.keep_all_originals,
            allow_horizontal_flip=args.allow_horizontal_flip,
            resume=args.resume,
            rng=rng,
        )
        stats.append(class_stats)
        print(
            f"{class_stats.class_name}: source={class_stats.source_images}, "
            f"originals={class_stats.copied_originals}, "
            f"augmented={class_stats.augmented_images}, "
            f"output={class_stats.output_images}"
        )

    manifest = {
        "input": str(input_dir),
        "output": str(output_dir),
        "target_per_class": args.target_per_class,
        "keep_all_originals": args.keep_all_originals,
        "allow_horizontal_flip": args.allow_horizontal_flip,
        "seed": args.seed,
        "classes": [asdict(item) for item in stats],
    }
    with (output_dir / "_augmentation_manifest.json").open("w", encoding="utf-8") as file:
        json.dump(manifest, file, ensure_ascii=False, indent=2)

    return stats


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create an augmented balanced dataset.")
    parser.add_argument("--input", required=True, help="Input dataset directory.")
    parser.add_argument("--output", required=True, help="Output dataset directory.")
    parser.add_argument(
        "--target-per-class",
        type=int,
        default=500,
        help="Desired output images per class in balanced mode.",
    )
    parser.add_argument(
        "--keep-all-originals",
        action="store_true",
        help="Copy all originals and only top up weak classes instead of sampling strong classes down.",
    )
    parser.add_argument(
        "--allow-horizontal-flip",
        action="store_true",
        help="Allow mirror augmentation. Disabled by default because sign handedness may matter.",
    )
    parser.add_argument("--seed", type=int, default=42, help="Random seed.")
    parser.add_argument("--force", action="store_true", help="Replace the output directory if it exists.")
    parser.add_argument("--resume", action="store_true", help="Continue an existing output directory.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.target_per_class < 1:
        raise SystemExit("--target-per-class must be positive.")

    stats = build_augmented_dataset(args)
    total = sum(item.output_images for item in stats)
    print(f"\nDone. Wrote {total} images across {len(stats)} classes.")


if __name__ == "__main__":
    main()
