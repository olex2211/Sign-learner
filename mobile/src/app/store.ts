// ── Constants and labels ──
// These are used across the app for UI display.
// Type definitions have moved to api/types.ts.

export type Complexity = "easy" | "medium" | "hard";

export const COMPLEXITY_LABELS: Record<Complexity, string> = {
  easy: "Легкий",
  medium: "Середній",
  hard: "Складний",
};

export const UKRAINIAN_ALPHABET = [
  "А","Б","В","Г","Ґ","Д","Е","Є","Ж","З",
  "И","І","Ї","Й","К","Л","М","Н","О","П",
  "Р","С","Т","У","Ф","Х","Ц","Ч","Ш","Щ",
  "Ь","Ю","Я",
];

export const COMPLEXITY_MAP: Record<string, Complexity> = {
  А: "easy", Б: "easy", В: "easy", Г: "easy", Ґ: "medium",
  Д: "easy", Е: "easy", Є: "medium", Ж: "medium", З: "easy",
  И: "easy", І: "easy", Ї: "medium", Й: "medium", К: "easy",
  Л: "easy", М: "easy", Н: "easy", О: "easy", П: "easy",
  Р: "medium", С: "medium", Т: "easy", У: "easy", Ф: "hard",
  Х: "medium", Ц: "hard", Ч: "medium", Ш: "hard", Щ: "hard",
  Ь: "medium", Ю: "hard", Я: "medium",
};
