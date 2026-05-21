"""
export_tflite.py — Export ONNX model to TFLite format (for future on-device inference).

Usage:
    python scripts/export_tflite.py --onnx models/gesture_classifier.onnx --output models/gesture_classifier.tflite

Note:
    Requires: pip install onnx2tf tensorflow
    This is optional and intended for future mobile on-device inference (Phase v2).
"""

import argparse
import sys


def export_to_tflite(onnx_path: str, output_path: str) -> None:
    """Export ONNX model to TFLite."""
    try:
        import onnx2tf
    except ImportError:
        print("Error: onnx2tf is not installed.")
        print("Install it with: pip install onnx2tf tensorflow")
        sys.exit(1)

    print(f"Converting {onnx_path} → {output_path}")

    # Convert ONNX → SavedModel → TFLite
    onnx2tf.convert(
        input_onnx_file_path=onnx_path,
        output_folder_path="models/_tf_temp",
        non_verbose=True,
    )

    # Convert SavedModel to TFLite
    try:
        import tensorflow as tf
    except ImportError:
        print("Error: tensorflow is not installed.")
        print("Install it with: pip install tensorflow")
        sys.exit(1)

    converter = tf.lite.TFLiteConverter.from_saved_model("models/_tf_temp")
    converter.optimizations = [tf.lite.Optimize.DEFAULT]
    tflite_model = converter.convert()

    with open(output_path, "wb") as f:
        f.write(tflite_model)

    print(f"TFLite model saved to: {output_path}")
    print(f"Model size: {len(tflite_model) / 1024:.1f} KB")

    # Cleanup temp files
    import shutil
    shutil.rmtree("models/_tf_temp", ignore_errors=True)


def main():
    parser = argparse.ArgumentParser(description="Export ONNX model to TFLite")
    parser.add_argument("--onnx", type=str, default="models/gesture_classifier.onnx", help="Input ONNX path")
    parser.add_argument("--output", type=str, default="models/gesture_classifier.tflite", help="Output TFLite path")
    args = parser.parse_args()

    export_to_tflite(args.onnx, args.output)


if __name__ == "__main__":
    main()
