import apiClient from "./client";
import type { Lesson, LessonDetail } from "./types";

export async function getLessons(): Promise<Lesson[]> {
  const response = await apiClient.get<Lesson[]>("/lessons");
  return response.data;
}

export async function getLesson(lessonId: number): Promise<LessonDetail> {
  const response = await apiClient.get<LessonDetail>(`/lessons/${lessonId}`);
  return response.data;
}
