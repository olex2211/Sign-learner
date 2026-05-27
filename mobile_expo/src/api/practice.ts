import { apiGet, apiPost } from "./client";
import type {
  PracticeProgress,
  PracticeAttemptRequest,
  PracticeAttemptResponse,
  PracticeSkipResponse,
} from "./types";

export async function getPracticeProgress(): Promise<PracticeProgress[]> {
  return apiGet<PracticeProgress[]>("/practice/progress");
}

export async function recordPracticeAttempt(
  lessonId: number,
  data: PracticeAttemptRequest
): Promise<PracticeAttemptResponse> {
  return apiPost<PracticeAttemptResponse>(
    `/practice/${lessonId}/attempt`,
    data
  );
}

export async function skipPracticeLesson(
  lessonId: number
): Promise<PracticeSkipResponse> {
  return apiPost<PracticeSkipResponse>(`/practice/${lessonId}/skip`);
}
