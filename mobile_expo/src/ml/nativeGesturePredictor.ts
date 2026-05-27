import { requireOptionalNativeModule } from "expo";
import { ApiError } from "../api/client";
import type { PredictionResponse } from "../api/types";

type DaktildoMlModule = {
  isAvailable(): boolean;
  predictFromImageUri(imageUri: string): Promise<PredictionResponse>;
};

const DaktildoMl = requireOptionalNativeModule<DaktildoMlModule>("DaktildoMl");

export function isNativeGesturePredictorAvailable(): boolean {
  try {
    return Boolean(DaktildoMl?.isAvailable());
  } catch {
    return false;
  }
}

export async function predictGestureOnDevice(
  imageUri: string
): Promise<PredictionResponse> {
  if (!DaktildoMl) {
    throw new Error("DaktildoMl native module is not linked");
  }

  try {
    return await DaktildoMl.predictFromImageUri(imageUri);
  } catch (error: any) {
    const code = String(error?.code ?? "");
    const message = String(error?.message ?? "");

    if (code.includes("NO_HAND") || message.toLowerCase().includes("no hand")) {
      throw new ApiError(422, "No hand detected");
    }

    if (
      code.includes("INVALID_IMAGE") ||
      message.toLowerCase().includes("invalid image")
    ) {
      throw new ApiError(422, "Invalid image");
    }

    throw error;
  }
}
