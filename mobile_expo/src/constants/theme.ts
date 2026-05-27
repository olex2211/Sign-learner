// Design tokens matching the Sign Learner green palette
export const Colors = {
  bg: "#f8faec",
  green: "#4fa65b",
  greenDark: "#2e9d3e",
  greenLight: "#eaeed3",
  card: "#f1f1f1",
  dark: "#333333",
  text: "#111111",
  textMuted: "#717182",
  textLight: "#b0b0b0",
  white: "#ffffff",
  error: "#d4183d",
  warning: "#c07800",
  info: "#377ceb",
  infoBg: "#ddeeff",
  warningBg: "#fff3cd",
  amber: "#f59e0b",
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 45,
  full: 999,
} as const;

export const FontSizes = {
  xs: 10,
  sm: 11,
  base: 13,
  md: 14,
  lg: 15,
  xl: 16,
  xxl: 18,
  h3: 20,
  h2: 24,
  h1: 26,
  hero: 32,
} as const;

export const GESTURE_EMOJI: Record<string, string> = {
  А: "🤚", Б: "✋", В: "🖖", Г: "👆", Ґ: "✊", Д: "🤙",
  Е: "👐", Є: "🙌", Ж: "👋", З: "🤞", И: "☝️", І: "👆",
  Ї: "🤟", Й: "🤘", К: "✌️", Л: "👌", М: "🤏", Н: "🖐",
  О: "👊", П: "🤜", Р: "🤛", С: "👍", Т: "👎", У: "🤙",
  Ф: "🤳", Х: "🤝", Ц: "👏", Ч: "🙏", Ш: "🤲", Щ: "🫶",
  Ь: "🫳", Ю: "🫴", Я: "🫵",
};

export const UKRAINIAN_ALPHABET_ORDER = new Map(
  Array.from("АБВГҐДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЬЮЯ").map((symbol, index) => [
    symbol,
    index,
  ])
);
