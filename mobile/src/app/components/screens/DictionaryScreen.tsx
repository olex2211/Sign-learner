import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { getGestures } from "../../api/gestures";
import { resolveMediaUrl } from "../../api/media";
import type { Gesture } from "../../api/types";
import { GestureProgressBar } from "../GestureProgressBar";
import { ComplexityBadge } from "../ComplexityBadge";
import { CheckCircle2 } from "lucide-react";

const SL = {
  bg: "#f8faec",
  green: "#4fa65b",
  greenDark: "#2e9d3e",
  greenLight: "#eaeed3",
  card: "#f1f1f1",
  ff: "'Libre Franklin', sans-serif",
};

const GESTURE_EMOJI: Record<string, string> = {
  А:"🤚",Б:"✋",В:"🖖",Г:"👆",Ґ:"✊",Д:"🤙",Е:"👐",Є:"🙌",
  Ж:"👋",З:"🤞",И:"☝️",І:"👆",Ї:"🤟",Й:"🤘",К:"✌️",Л:"👌",
  М:"🤏",Н:"🖐",О:"👊",П:"🤜",Р:"🤛",С:"👍",Т:"👎",У:"🤙",
  Ф:"🤳",Х:"🤝",Ц:"👏",Ч:"🙏",Ш:"🤲",Щ:"🫶",Ь:"🫳",Ю:"🫴",Я:"🫵",
};

const UKRAINIAN_ALPHABET_ORDER = new Map(
  Array.from("АБВГҐДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЬЮЯ").map((symbol, index) => [
    symbol,
    index,
  ])
);

export function DictionaryScreen() {
  const navigate = useNavigate();
  const { lessons, progress } = useAuth();
  const [gestures, setGestures] = useState<Gesture[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getGestures()
      .then(setGestures)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const masteredCount = progress.filter(p => p.status === "mastered").length;
  const totalCount = gestures.length || lessons.length || 33;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ background: SL.bg }}>
        <p style={{ fontFamily: SL.ff, color: "#717182" }}>Завантаження...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ background: SL.bg, fontFamily: SL.ff }}>
      {/* Header */}
      <div className="px-5 pt-8 pb-2">
        <h1 style={{ fontWeight: 800, fontSize: 26, color: "#111" }}>Жести</h1>
        <div className="flex items-center gap-2 mt-1">
          <div style={{ flex: 1, background: SL.greenLight, borderRadius: 6, height: 6, overflow: "hidden" }}>
            <div style={{ width: `${(masteredCount / totalCount) * 100}%`, background: SL.green, height: "100%", borderRadius: 6 }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#717182", whiteSpace: "nowrap" }}>
            {masteredCount}/{totalCount}
          </span>
        </div>
      </div>

      {/* Cards grid */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 pt-2">
        <div className="grid grid-cols-2 gap-3">
          {[...gestures]
            .sort((a, b) => {
              const lessonA = lessons.find((lesson) => lesson.gesture_id === a.gesture_id);
              const lessonB = lessons.find((lesson) => lesson.gesture_id === b.gesture_id);

              if (lessonA && lessonB) {
                return lessonA.order - lessonB.order;
              }

              const aOrder = UKRAINIAN_ALPHABET_ORDER.get(a.symbol) ?? Number.MAX_SAFE_INTEGER;
              const bOrder = UKRAINIAN_ALPHABET_ORDER.get(b.symbol) ?? Number.MAX_SAFE_INTEGER;
              return aOrder - bOrder;
            })
            .map(gesture => {
            const lesson = lessons.find(l => l.gesture_id === gesture.gesture_id);
            const prog = lesson
              ? progress.find(p => p.lesson_id === lesson.lesson_id)
              : null;
            const isMastered = prog?.status === "mastered";

            return (
              <button
                key={gesture.gesture_id}
                onClick={() => navigate(`/dictionary/${gesture.gesture_id}`)}
                className="text-left"
                style={{
                  background: SL.card,
                  borderRadius: 18,
                  padding: 0,
                  border: isMastered ? `2px solid ${SL.green}` : "2px solid transparent",
                  cursor: "pointer",
                  overflow: "hidden",
                }}
              >
                {/* Image area */}
                <div
                  style={{
                    background: isMastered ? SL.green : SL.greenLight,
                    height: 90,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                  }}
                >
                  <span style={{ fontSize: 42 }}>
                    {gesture.media?.icon ? (
                      <img
                        src={resolveMediaUrl(gesture.media.icon.file_path)}
                        alt={`Жест ${gesture.symbol}`}
                        style={{ width: 70, height: 70, objectFit: "contain" }}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      GESTURE_EMOJI[gesture.symbol] ?? "🤟"
                    )}
                  </span>
                  {isMastered && (
                    <div style={{ position: "absolute", top: 6, right: 6 }}>
                      <CheckCircle2 size={18} stroke="#fff" fill={SL.greenDark} />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div style={{ padding: "10px 12px 12px" }}>
                  <div className="flex items-center justify-between mb-1">
                    <span
                      style={{
                        fontSize: 22,
                        fontWeight: 900,
                        fontFamily: SL.ff,
                        color: "#111",
                      }}
                    >
                      {gesture.symbol}
                    </span>
                    <ComplexityBadge complexity={gesture.complexity} />
                  </div>
                  {prog && (
                    <GestureProgressBar
                      value={prog.successful_attempts}
                      max={prog.required_attempts}
                      showLabel
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
