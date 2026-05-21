"""
export_onnx.py — Export trained PyTorch model to ONNX format.

Usage:
    python scripts/export_onnx.py --checkpoint models/best.pt --output models/gesture_classifier.onnx
"""

import argparse
import sys

import numpy as np
import onnx
import onnxruntime as ort
import torch

# Add parent directory to path so we can import the model class
sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent.parent))
from train.train import GestureMLP


def export_to_onnx(checkpoint_path: str, output_path: str) -> None:
    """Export PyTorch checkpoint to ONNX."""
    # Load checkpoint
    checkpoint = torch.load(checkpoint_path, map_location="cpu", weights_only=True)
    input_dim = checkpoint["input_dim"]
    num_classes = checkpoint["num_classes"]

    print(f"Model: input_dim={input_dim}, num_classes={num_classes}")
    print(f"Trained for {checkpoint['epoch']} epochs, val_acc={checkpoint['val_acc']:.4f}")

    # Rebuild model and load weights
    model = GestureMLP(input_dim=input_dim, num_classes=num_classes)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    # Create dummy input
    dummy_input = torch.randn(1, input_dim)

    # Export to ONNX
    torch.onnx.export(
        model,
        dummy_input,
        output_path,
        export_params=True,
        opset_version=17,
        do_constant_folding=True,
        input_names=["landmarks"],
        output_names=["logits"],
        dynamic_axes={
            "landmarks": {0: "batch_size"},
            "logits": {0: "batch_size"},
        },
    )

    print(f"ONNX model saved to: {output_path}")

    # Verify ONNX model
    onnx_model = onnx.load(output_path)
    onnx.checker.check_model(onnx_model)
    print("ONNX model verification: ✓ PASSED")

    # Compare PyTorch vs ONNX outputs
    test_input = torch.randn(5, input_dim)

    # PyTorch output
    with torch.no_grad():
        pt_output = model(test_input).numpy()

    # ONNX Runtime output
    session = ort.InferenceSession(output_path)
    ort_output = session.run(None, {"landmarks": test_input.numpy()})[0]

    # Compare
    max_diff = np.abs(pt_output - ort_output).max()
    print(f"Max difference PyTorch vs ONNX: {max_diff:.8f}")

    if max_diff < 1e-5:
        print("Output comparison: ✓ PASSED (diff < 1e-5)")
    else:
        print("Output comparison: ⚠ WARNING (diff >= 1e-5)")


def main():
    parser = argparse.ArgumentParser(description="Export PyTorch model to ONNX")
    parser.add_argument("--checkpoint", type=str, default="models/best.pt", help="Path to PyTorch checkpoint")
    parser.add_argument("--output", type=str, default="models/gesture_classifier.onnx", help="Output ONNX path")
    args = parser.parse_args()

    export_to_onnx(args.checkpoint, args.output)


if __name__ == "__main__":
    main()
