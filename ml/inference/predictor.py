"""
predictor.py — Gesture prediction using ONNX Runtime + MediaPipe.

Loads an ONNX model and label map, processes images through MediaPipe Hand Landmarker,
normalizes landmarks, and returns gesture predictions.
"""

import json
import os
import urllib.request

import cv2
import mediapipe as mp
import numpy as np
import onnxruntime as ort
from mediapipe.tasks.python import BaseOptions
from mediapipe.tasks.python.vision import (
    HandLandmarker,
    HandLandmarkerOptions,
    RunningMode,
)

MODEL_URL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task"


class GesturePredictor:
    """Predict hand gestures from images using ONNX model."""

    def __init__(self, model_path: str, label_map_path: str, hand_model_path: str | None = None):
        """
        Initialize predictor.

        Args:
            model_path: Path to ONNX model file
            label_map_path: Path to label_map.json
            hand_model_path: Path to MediaPipe hand_landmarker.task (auto-downloaded if None)
        """
        # Load ONNX model
        self.session = ort.InferenceSession(
            model_path,
            providers=["CPUExecutionProvider"],
        )
        self.input_name = self.session.get_inputs()[0].name

        # Load label map
        with open(label_map_path, "r", encoding="utf-8") as f:
            self.label_map = json.load(f)
        self.idx_to_label = {v: k for k, v in self.label_map.items()}

        # Download MediaPipe model if needed
        if hand_model_path is None:
            hand_model_path = os.path.join(os.path.dirname(model_path), "hand_landmarker.task")
        if not os.path.exists(hand_model_path):
            print(f"Downloading hand landmarker model...")
            os.makedirs(os.path.dirname(hand_model_path), exist_ok=True)
            urllib.request.urlretrieve(MODEL_URL, hand_model_path)

        # Initialize MediaPipe Hand Landmarker (Tasks API)
        options = HandLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=hand_model_path),
            running_mode=RunningMode.IMAGE,
            num_hands=1,
            min_hand_detection_confidence=0.5,
            min_hand_presence_confidence=0.5,
        )
        self.landmarker = HandLandmarker.create_from_options(options)

        print(f"GesturePredictor initialized:")
        print(f"  Model: {model_path}")
        print(f"  Classes: {list(self.label_map.keys())}")

    def _normalize_landmarks(self, landmarks) -> np.ndarray | None:
        """
        Normalize 21 hand landmarks (same as training pipeline).

        1. Subtract wrist (landmark 0)
        2. Divide by distance wrist → landmark 9
        """
        coords = np.array([[lm.x, lm.y, lm.z] for lm in landmarks])

        wrist = coords[0].copy()
        coords -= wrist

        scale = np.linalg.norm(coords[9])
        if scale < 1e-6:
            return None

        coords /= scale
        return coords.flatten().astype(np.float32)

    def predict_from_image(self, image: np.ndarray) -> dict | None:
        """
        Predict gesture from an OpenCV image (BGR).

        Args:
            image: OpenCV BGR image

        Returns:
            dict with {gesture, confidence, label_index} or None if no hand detected
        """
        # Convert BGR → RGB
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

        # Create MediaPipe Image
        mp_image = mp.Image(
            image_format=mp.ImageFormat.SRGB,
            data=image_rgb,
        )

        # Detect hand landmarks
        result = self.landmarker.detect(mp_image)

        if not result.hand_landmarks:
            return None

        # Take first detected hand
        hand_landmarks = result.hand_landmarks[0]

        # Normalize landmarks
        landmarks = self._normalize_landmarks(hand_landmarks)
        if landmarks is None:
            return None

        # Run ONNX inference
        input_data = landmarks.reshape(1, -1)
        logits = self.session.run(None, {self.input_name: input_data})[0]

        # Softmax
        exp_logits = np.exp(logits - np.max(logits))
        probabilities = exp_logits / exp_logits.sum()

        # Get prediction
        predicted_idx = int(np.argmax(probabilities))
        confidence = float(probabilities[0][predicted_idx])
        gesture = self.idx_to_label[predicted_idx]

        return {
            "gesture": gesture,
            "confidence": round(confidence, 4),
            "label_index": predicted_idx,
        }

    def predict_from_bytes(self, image_bytes: bytes) -> dict | None:
        """
        Predict gesture from raw image bytes.

        Args:
            image_bytes: Raw image file bytes (JPEG, PNG, etc.)

        Returns:
            dict with {gesture, confidence, label_index} or None if no hand detected
        """
        # Decode image bytes
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if image is None:
            return None

        return self.predict_from_image(image)

    def close(self):
        """Release MediaPipe resources."""
        self.landmarker.close()
