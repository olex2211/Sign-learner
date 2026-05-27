import type { Lesson, PracticeProgress } from "../api/types";

const STORAGE_KEY = "sign-learner-practice-queue";

function getActiveLessonIds(lessons: Lesson[], progress: PracticeProgress[]): number[] {
  return [...lessons]
    .sort((a, b) => a.order - b.order)
    .filter((lesson) => {
      const lessonProgress = progress.find((item) => item.lesson_id === lesson.lesson_id);
      return lessonProgress?.status !== "mastered";
    })
    .map((lesson) => lesson.lesson_id);
}

function getInitialQueue(lessons: Lesson[], progress: PracticeProgress[], startLessonId: number): number[] {
  const sortedLessons = [...lessons].sort((a, b) => a.order - b.order);
  const startIndex = sortedLessons.findIndex((lesson) => lesson.lesson_id === startLessonId);
  if (startIndex === -1) {
    return [];
  }

  const rotatedLessons = [...sortedLessons.slice(startIndex), ...sortedLessons.slice(0, startIndex)];
  return rotatedLessons
    .filter((lesson) => progress.find((item) => item.lesson_id === lesson.lesson_id)?.status !== "mastered")
    .map((lesson) => lesson.lesson_id);
}

function readQueue(): number[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((value): value is number => Number.isInteger(value)) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: number[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export function ensurePracticeQueue(
  lessons: Lesson[],
  progress: PracticeProgress[],
  currentLessonId: number
): number[] {
  const activeLessonIds = getActiveLessonIds(lessons, progress);
  const storedQueue = readQueue();

  if (storedQueue.length > 0 && storedQueue.includes(currentLessonId)) {
    const filteredStored = storedQueue.filter((lessonId) => activeLessonIds.includes(lessonId));
    if (filteredStored.length > 0) {
      const currentIndex = filteredStored.indexOf(currentLessonId);
      if (currentIndex === -1) {
        writeQueue(filteredStored);
        return filteredStored;
      }
      const normalizedQueue =
        currentIndex > 0
          ? [...filteredStored.slice(currentIndex), ...filteredStored.slice(0, currentIndex)]
          : filteredStored;
      writeQueue(normalizedQueue);
      return normalizedQueue;
    }
  }

  const initialQueue = getInitialQueue(lessons, progress, currentLessonId);
  writeQueue(initialQueue);
  return initialQueue;
}

export function advancePracticeQueue(
  lessons: Lesson[],
  progress: PracticeProgress[],
  currentLessonId: number,
  strategy: "complete" | "reinsert_after_three"
): number | null {
  const queue = ensurePracticeQueue(lessons, progress, currentLessonId);
  if (queue.length === 0) {
    return null;
  }

  const workingQueue = [...queue];
  const currentIndex = workingQueue.indexOf(currentLessonId);
  if (currentIndex !== -1) {
    workingQueue.splice(currentIndex, 1);
  }

  if (strategy === "reinsert_after_three") {
    const insertIndex = Math.min(3, workingQueue.length);
    workingQueue.splice(insertIndex, 0, currentLessonId);
  }

  writeQueue(workingQueue);
  return workingQueue[0] ?? null;
}

export function clearPracticeQueue() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(STORAGE_KEY);
}
