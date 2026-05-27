import type { ProgressStatus, LessonStatus } from "../api/types";

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  mastered:     { label: "Засвоєно",    bg: "#d4f0d8", color: "#2e9d3e" },
  in_progress:  { label: "В процесі",  bg: "#ddeeff", color: "#377ceb" },
  not_started:  { label: "Не почато",  bg: "#f1f1f1", color: "#b0b0b0" },
  passed:       { label: "Пройдено",   bg: "#d4f0d8", color: "#2e9d3e" },
  available:    { label: "Доступно",   bg: "#eaeed3", color: "#4fa65b" },
  locked:       { label: "Закрито",    bg: "#f1f1f1", color: "#b0b0b0" },
  skipped:      { label: "Пропущено",  bg: "#fff3cd", color: "#c07800" },
};

interface StatusPillProps {
  status: ProgressStatus | LessonStatus;
  small?: boolean;
}

export function StatusPill({ status, small }: StatusPillProps) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.not_started;
  return (
    <span
      style={{
        background: cfg.bg,
        color: cfg.color,
        fontFamily: "'Libre Franklin', sans-serif",
        fontSize: small ? 10 : 11,
        fontWeight: 600,
        padding: small ? "2px 6px" : "3px 8px",
        borderRadius: 20,
        whiteSpace: "nowrap",
      }}
    >
      {cfg.label}
    </span>
  );
}
