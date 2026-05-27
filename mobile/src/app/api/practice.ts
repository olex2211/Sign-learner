import apiClient from "./client";
import type {
  PracticeProgress,
  PracticeAttemptRequest,
  PracticeAttemptResponse,
  PracticeSkipResponse,
} from "./types";

export async function getPracticeProgress(): Promise<PracticeProgress[]> {
  const response = await apiClient.get<PracticeProgress[]>("/practice/progress");
  return response.data;
}

export async function recordPracticeAttempt(
  lessonId: number,
  data: PracticeAttemptRequest
): Promise<PracticeAttemptResponse> {
  const response = await apiClient.post<PracticeAttemptResponse>(
    `/practice/${lessonId}/attempt`,
    data
  );
  return response.data;
}

export async function skipPracticeLesson(
  lessonId: number
): Promise<PracticeSkipResponse> {
  const response = await apiClient.post<PracticeSkipResponse>(
    `/practice/${lessonId}/skip`
  );
  return response.data;
}
