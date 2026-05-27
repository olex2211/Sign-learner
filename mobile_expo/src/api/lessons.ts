import { apiGet } from "./client";
import type { Lesson, LessonDetail } from "./types";

export async function getLessons(): Promise<Lesson[]> {
  return apiGet<Lesson[]>("/lessons/");
}

export async function getLesson(lessonId: number): Promise<LessonDetail> {
  return apiGet<LessonDetail>(`/lessons/${lessonId}`);
}
