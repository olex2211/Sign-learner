import type { PredictionResponse } from "./types";
import { predictGestureLocally } from "../ml/localGesturePredictor";

export async function predictGesture(file: Blob): Promise<PredictionResponse> {
  return predictGestureLocally(file);
}
