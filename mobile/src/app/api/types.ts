// ── Backend API Types ──
// These match the backend response shapes exactly.

export type Complexity = "easy" | "medium" | "hard";
export type ProgressStatus = "not_started" | "in_progress" | "mastered";
export type LessonStatus = "locked" | "available" | "passed" | "skipped";

export interface User {
  user_id: number;
  username: string;
  email: string;
  experience_points: number;
  current_streak: number;
  created_at: string;
}

export interface UserStats {
  experience_points: number;
  current_streak: number;
  level: number;
  achievements_count: number;
}

export interface Lesson {
  lesson_id: number;
  gesture_id: number;
  title: string;
  description: string | null;
  order: number;
  status: LessonStatus | null;
}

export interface MediaItem {
  media_id: number;
  media_type: "photo" | "gif" | "video" | string;
  file_path: string;
}

export interface GestureMediaItem {
  role: "icon" | "demo_image";
  file_path: string;
}

export interface GestureMedia {
  icon: GestureMediaItem | null;
  demo_image: GestureMediaItem | null;
}

export interface LessonDetail extends Lesson {
  media_items: MediaItem[];
}

export interface Gesture {
  gesture_id: number;
  language_id: number;
  symbol: string;
  complexity: Complexity;
  media: GestureMedia;
}

export interface PracticeProgress {
  lesson_id: number;
  gesture_id: number;
  symbol: string;
  complexity: Complexity;
  successful_attempts: number;
  required_attempts: number;
  status: ProgressStatus;
  lesson_status: LessonStatus;
  last_practiced_at: string | null;
}

export interface Achievement {
  achievement_id: number;
  name: string;
  description: string | null;
  icon_path: string | null;
}

export interface UserAchievement extends Achievement {
  earned_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
}

export interface PredictionResponse {
  gesture: string;
  confidence: number;
  label_index: number;
}

export interface PracticeAttemptRequest {
  predicted_gesture: string;
  confidence: number;
}

export interface PracticeAttemptResponse {
  lesson_id: number;
  gesture_id: number;
  expected_gesture: string;
  predicted_gesture: string;
  confidence: number;
  success: boolean;
  is_completed: boolean;
  successful_attempts: number;
  required_attempts: number;
  progress_status: ProgressStatus;
  lesson_status: LessonStatus;
  xp_earned: number;
  attempt_xp_earned: number;
  completion_bonus_xp: number;
  message: string;
}

export interface PracticeSkipResponse {
  lesson_id: number;
  gesture_id: number;
  status: ProgressStatus;
  lesson_status: LessonStatus;
  message: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

// ── View Model ──
// Merged entity for screens that combine gesture + lesson + progress

export interface GestureLearningCard {
  lessonId: number;
  gestureId: number;
  symbol: string;
  title: string;
  description: string | null;
  complexity: Complexity;
  successfulAttempts: number;
  requiredAttempts: number;
  progressStatus: ProgressStatus;
  lessonStatus: LessonStatus;
  mediaUrl?: string;
}
