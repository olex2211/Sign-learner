import { requireNativeModule } from "expo";

export type NativePredictionResponse = {
  gesture: string;
  confidence: number;
  label_index: number;
};

type DaktildoMlModule = {
  isAvailable(): boolean;
  predictFromImageUri(imageUri: string): Promise<NativePredictionResponse>;
};

const DaktildoMl = requireNativeModule<DaktildoMlModule>("DaktildoMl");

export function isAvailable(): boolean {
  return DaktildoMl.isAvailable();
}

export async function predictFromImageUri(
  imageUri: string
): Promise<NativePredictionResponse> {
  return DaktildoMl.predictFromImageUri(imageUri);
}
