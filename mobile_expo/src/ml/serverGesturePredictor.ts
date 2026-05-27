import { authenticatedFetch } from "../api/client";
import type { PredictionResponse } from "../api/types";

export async function predictGestureOnServer(
  imageUri: string
): Promise<PredictionResponse> {
  const filename = imageUri.split("/").pop() || "photo.jpg";
  const formData = new FormData();

  formData.append("file", {
    uri: imageUri,
    name: filename,
    type: "image/jpeg",
  } as any);

  const response = await authenticatedFetch("/ml/predict", {
    method: "POST",
    body: formData as any,
    isFormData: true,
  });

  return response.json() as Promise<PredictionResponse>;
}
