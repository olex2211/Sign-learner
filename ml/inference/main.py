"""
main.py — FastAPI ML inference server.

Endpoints:
    POST /predict — accept image, return gesture prediction
    GET  /health  — health check

Usage:
    uvicorn inference.main:app --host 0.0.0.0 --port 8001
"""

import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from pydantic import BaseModel

from .predictor import GesturePredictor

# ── Config ──

MODEL_PATH = os.getenv("MODEL_PATH", "models/gesture_classifier.onnx")
LABEL_MAP_PATH = os.getenv("LABEL_MAP_PATH", "models/label_map.json")

# ── Response schemas ──

class PredictionResponse(BaseModel):
    gesture: str
    confidence: float
    label_index: int


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    classes: list[str]


# ── App ──

predictor: GesturePredictor | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load model on startup, cleanup on shutdown."""
    global predictor
    print(f"Loading model from {MODEL_PATH}...")
    predictor = GesturePredictor(MODEL_PATH, LABEL_MAP_PATH)
    print("Model loaded successfully!")
    yield
    if predictor:
        predictor.close()
        print("Model resources released.")


app = FastAPI(
    title="Sign-Learner ML Service",
    description="Gesture recognition API using MediaPipe + ONNX",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="ok",
        model_loaded=predictor is not None,
        classes=list(predictor.label_map.keys()) if predictor else [],
    )


@app.post("/predict", response_model=PredictionResponse)
async def predict(file: UploadFile = File(...)):
    """
    Predict gesture from uploaded image.

    Accepts: multipart/form-data with 'file' field (JPEG, PNG, etc.)
    Returns: gesture label, confidence score, and label index
    """
    if predictor is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    # Validate file type
    content_type = file.content_type or ""
    if not content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type: {content_type}. Expected an image.",
        )

    # Read image bytes
    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty file")

    # Predict
    result = predictor.predict_from_bytes(image_bytes)

    if result is None:
        raise HTTPException(
            status_code=422,
            detail="No hand detected in the image. Please ensure your hand is clearly visible.",
        )

    return PredictionResponse(**result)
