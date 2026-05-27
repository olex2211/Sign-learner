import type { Complexity } from "../api/types";
import { COMPLEXITY_LABELS } from "../store";

const COLORS: Record<Complexity, { bg: string; color: string }> = {
  easy:   { bg: "#d4f0d8", color: "#2e9d3e" },
  medium: { bg: "#fff3cd", color: "#c07800" },
  hard:   { bg: "#fde8e8", color: "#d4183d" },
};

export function ComplexityBadge({ complexity }: { complexity: Complexity }) {
  const c = COLORS[complexity];
  return (
    <span
      style={{
        background: c.bg,
        color: c.color,
        fontFamily: "'Libre Franklin', sans-serif",
        fontSize: 10,
        fontWeight: 600,
        padding: "2px 7px",
        borderRadius: 20,
      }}
    >
      {COMPLEXITY_LABELS[complexity]}
    </span>
  );
}
