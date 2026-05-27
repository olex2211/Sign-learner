interface GestureProgressBarProps {
  value: number;
  max: number;
  showLabel?: boolean;
}

export function GestureProgressBar({ value, max, showLabel }: GestureProgressBarProps) {
  const pct = max === 0 ? 0 : Math.min(100, (value / max) * 100);
  return (
    <div className="flex flex-col gap-0.5">
      {showLabel && (
        <span style={{ fontFamily: "'Libre Franklin', sans-serif", fontSize: 11, color: "#717182" }}>
          Прогрес жесту: {value}/{max}
        </span>
      )}
      <div style={{ background: "#eaeed3", borderRadius: 6, height: 5, overflow: "hidden" }}>
        <div
          style={{
            width: `${pct}%`,
            background: pct >= 100 ? "#2e9d3e" : "#4fa65b",
            height: "100%",
            borderRadius: 6,
            transition: "width 0.4s ease",
          }}
        />
      </div>
    </div>
  );
}
