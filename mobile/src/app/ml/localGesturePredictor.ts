import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import * as ort from "onnxruntime-web";
import ortWasmModuleUrl from "onnxruntime-web/ort-wasm-simd-threaded.jsep.mjs?url";
import ortWasmBinaryUrl from "onnxruntime-web/ort-wasm-simd-threaded.jsep.wasm?url";
import type { PredictionResponse } from "../api/types";

type LabelMap = Record<string, number>;

const MODEL_PATH = "/ml/gesture_classifier.onnx";
const MODEL_EXTERNAL_DATA_PATH = "/ml/gesture_classifier.onnx.data";
const LABEL_MAP_PATH = "/ml/label_map.json";
const HAND_LANDMARKER_PATH = "/ml/hand_landmarker.task";
const VISION_WASM_PATH = "/mp-wasm";

let predictorPromise: Promise<LocalGesturePredictor> | null = null;

class NoHandDetectedError extends Error {
  response = { status: 422 };

  constructor() {
    super("No hand detected");
    this.name = "NoHandDetectedError";
  }
}

class LocalMlError extends Error {
  code = "LOCAL_ML_UNAVAILABLE";

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "LocalMlError";
  }
}

class LocalGesturePredictor {
  private constructor(
    private readonly handLandmarker: HandLandmarker,
    private readonly session: ort.InferenceSession,
    private readonly inputName: string,
    private readonly indexToLabel: Record<number, string>,
  ) {}

  static async create(): Promise<LocalGesturePredictor> {
    ort.env.wasm.wasmPaths = {
      mjs: ortWasmModuleUrl,
      wasm: ortWasmBinaryUrl,
    };

    const [vision, session, labelMap] = await Promise.all([
      FilesetResolver.forVisionTasks(VISION_WASM_PATH),
      ort.InferenceSession.create(MODEL_PATH, {
        executionProviders: ["wasm"],
        externalData: [
          {
            path: "gesture_classifier.onnx.data",
            data: MODEL_EXTERNAL_DATA_PATH,
          },
        ],
      }),
      fetchLabelMap(),
    ]);

    const handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: HAND_LANDMARKER_PATH,
      },
      runningMode: "IMAGE",
      numHands: 1,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
    });

    const inputName = session.inputNames[0];
    const indexToLabel = Object.fromEntries(
      Object.entries(labelMap).map(([label, index]) => [index, label]),
    ) as Record<number, string>;

    return new LocalGesturePredictor(handLandmarker, session, inputName, indexToLabel);
  }

  async predict(blob: Blob): Promise<PredictionResponse> {
    const image = await createImageBitmap(blob);

    try {
      const detection = this.handLandmarker.detect(image);
      const handLandmarks = detection.landmarks[0];

      if (!handLandmarks) {
        throw new NoHandDetectedError();
      }

      const normalizedLandmarks = normalizeLandmarks(handLandmarks);
      if (!normalizedLandmarks) {
        throw new NoHandDetectedError();
      }

      const inputTensor = new ort.Tensor("float32", normalizedLandmarks, [1, normalizedLandmarks.length]);
      const outputs = await this.session.run({ [this.inputName]: inputTensor });
      const logits = outputs[this.session.outputNames[0]].data as Float32Array;
      const probabilities = softmax(logits);
      const labelIndex = argmax(probabilities);
      const gesture = this.indexToLabel[labelIndex];

      return {
        gesture,
        confidence: round4(probabilities[labelIndex]),
        label_index: labelIndex,
      };
    } finally {
      image.close();
    }
  }
}

async function fetchLabelMap(): Promise<LabelMap> {
  const response = await fetch(LABEL_MAP_PATH);
  if (!response.ok) {
    throw new Error("Failed to load gesture label map");
  }
  return response.json();
}

function normalizeLandmarks(landmarks: Array<{ x: number; y: number; z: number }>): Float32Array | null {
  const wrist = landmarks[0];
  const middleMcp = landmarks[9];
  if (!wrist || !middleMcp) return null;

  const centered = landmarks.map((landmark) => ({
    x: landmark.x - wrist.x,
    y: landmark.y - wrist.y,
    z: landmark.z - wrist.z,
  }));

  const scaleVector = centered[9];
  const scale = Math.hypot(scaleVector.x, scaleVector.y, scaleVector.z);
  if (scale < 1e-6) return null;

  const values = new Float32Array(centered.length * 3);
  centered.forEach((landmark, index) => {
    const offset = index * 3;
    values[offset] = landmark.x / scale;
    values[offset + 1] = landmark.y / scale;
    values[offset + 2] = landmark.z / scale;
  });

  return values;
}

function softmax(logits: Float32Array): Float32Array {
  const maxLogit = Math.max(...logits);
  const exps = logits.map((value) => Math.exp(value - maxLogit));
  const sum = exps.reduce((total, value) => total + value, 0);
  return exps.map((value) => value / sum);
}

function argmax(values: Float32Array): number {
  let bestIndex = 0;
  let bestValue = values[0];

  for (let index = 1; index < values.length; index += 1) {
    if (values[index] > bestValue) {
      bestValue = values[index];
      bestIndex = index;
    }
  }

  return bestIndex;
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

export async function predictGestureLocally(blob: Blob): Promise<PredictionResponse> {
  try {
    predictorPromise ??= LocalGesturePredictor.create();
    const predictor = await predictorPromise;
    return await predictor.predict(blob);
  } catch (error) {
    if (error instanceof NoHandDetectedError) {
      throw error;
    }

    predictorPromise = null;
    console.error("[local-ml] gesture prediction failed", error);
    throw new LocalMlError(getReadableErrorMessage(error), { cause: error });
  }
}

function getReadableErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Локальна модель не змогла обробити кадр.";
}
