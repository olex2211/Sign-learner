import type { PredictionResponse } from "./types";
import { ApiError } from "./client";
import { resolveMlMode, shouldFallbackToServer } from "../ml/localMlMode";
import {
  isNativeGesturePredictorAvailable,
  predictGestureOnDevice,
} from "../ml/nativeGesturePredictor";
import { predictGestureOnServer } from "../ml/serverGesturePredictor";

/**
 * Predict a gesture with local native ML first, falling back to the backend.
 *
 * EXPO_PUBLIC_ML_MODE:
 * - auto: local native ML, server fallback when native ML is unavailable
 * - local: local native ML only
 * - server: backend /ml/predict only
 */
export async function predictGesture(
  imageUri: string
): Promise<PredictionResponse> {
  const mode = resolveMlMode(process.env.EXPO_PUBLIC_ML_MODE);

  if (mode === "server") {
    return predictGestureOnServer(imageUri);
  }

  if (mode === "local") {
    if (!isNativeGesturePredictorAvailable()) {
      throw new ApiError(503, "Local ML is not available in this build");
    }

    return predictGestureOnDevice(imageUri);
  }

  if (!isNativeGesturePredictorAvailable()) {
    return predictGestureOnServer(imageUri);
  }

  try {
    return await predictGestureOnDevice(imageUri);
  } catch (error) {
    if (!shouldFallbackToServer(error)) {
      throw error;
    }

    return predictGestureOnServer(imageUri);
  }
}
