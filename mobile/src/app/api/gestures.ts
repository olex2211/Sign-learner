import apiClient from "./client";
import type { Gesture } from "./types";

export async function getGestures(languageCode: string = "ukr"): Promise<Gesture[]> {
  const response = await apiClient.get<Gesture[]>("/gestures", {
    params: { language_code: languageCode },
  });
  return response.data;
}

export async function getGesture(gestureId: number): Promise<Gesture> {
  const response = await apiClient.get<Gesture>(`/gestures/${gestureId}`);
  return response.data;
}
