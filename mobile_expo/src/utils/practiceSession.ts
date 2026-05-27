import type { Lesson, PracticeProgress } from "../api/types";

// In-memory queue (replaces sessionStorage from web client)
let practiceQueue: number[] = [];

function getActiveLessonIds(
  lessons: Lesson[],
  progress: PracticeProgress[]
): number[] {
  return [...lessons]
    .sort((a, b) => a.order - b.order)
    .filter((lesson) => {
      const lessonProgress = progress.find(
        (item) => item.lesson_id === lesson.lesson_id
      );
      return lessonProgress?.status !== "mastered";
    })
    .map((lesson) => lesson.lesson_id);
}

function getInitialQueue(
  lessons: Lesson[],
  progress: PracticeProgress[],
  startLessonId: number
): number[] {
  const sortedLessons = [...lessons].sort((a, b) => a.order - b.order);
  const startIndex = sortedLessons.findIndex(
    (lesson) => lesson.lesson_id === startLessonId
  );
  if (startIndex === -1) {
    return [];
  }

  const rotatedLessons = [
    ...sortedLessons.slice(startIndex),
    ...sortedLessons.slice(0, startIndex),
  ];
  return rotatedLessons
    .filter(
      (lesson) =>
        progress.find((item) => item.lesson_id === lesson.lesson_id)?.status !==
        "mastered"
    )
    .map((lesson) => lesson.lesson_id);
}

export function ensurePracticeQueue(
  lessons: Lesson[],
  progress: PracticeProgress[],
  currentLessonId: number
): number[] {
  const activeLessonIds = getActiveLessonIds(lessons, progress);

  if (
    practiceQueue.length > 0 &&
    practiceQueue.includes(currentLessonId)
  ) {
    const filteredStored = practiceQueue.filter((lessonId) =>
      activeLessonIds.includes(lessonId)
    );
    if (filteredStored.length > 0) {
      const currentIndex = filteredStored.indexOf(currentLessonId);
      if (currentIndex === -1) {
        practiceQueue = filteredStored;
        return filteredStored;
      }
      const normalizedQueue =
        currentIndex > 0
          ? [
              ...filteredStored.slice(currentIndex),
              ...filteredStored.slice(0, currentIndex),
            ]
          : filteredStored;
      practiceQueue = normalizedQueue;
      return normalizedQueue;
    }
  }

  const initialQueue = getInitialQueue(lessons, progress, currentLessonId);
  practiceQueue = initialQueue;
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

  practiceQueue = workingQueue;
  return workingQueue[0] ?? null;
}

export function clearPracticeQueue(): void {
  practiceQueue = [];
}
