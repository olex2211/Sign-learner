import { apiGet } from "./client";
import type { Gesture } from "./types";

export async function getGestures(
  languageCode: string = "ukr"
): Promise<Gesture[]> {
  return apiGet<Gesture[]>(`/gestures/?language_code=${languageCode}`);
}

export async function getGesture(gestureId: number): Promise<Gesture> {
  return apiGet<Gesture>(`/gestures/${gestureId}`);
}
