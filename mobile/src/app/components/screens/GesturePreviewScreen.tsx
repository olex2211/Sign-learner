import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Camera, BookOpen } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getGesture } from "../../api/gestures";
import { resolveMediaUrl } from "../../api/media";
import type { Gesture } from "../../api/types";
import { GestureProgressBar } from "../GestureProgressBar";
import { ComplexityBadge } from "../ComplexityBadge";
import { StatusPill } from "../StatusPill";

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

export function GesturePreviewScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { lessons, progress } = useAuth();

  const [gesture, setGesture] = useState<Gesture | null>(null);
  const [loading, setLoading] = useState(true);

  const gestureId = parseInt(id ?? "0", 10);

  useEffect(() => {
    if (!gestureId) return;
    getGesture(gestureId)
      .then(setGesture)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [gestureId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ background: SL.bg }}>
        <p style={{ fontFamily: SL.ff, color: "#717182" }}>Завантаження...</p>
      </div>
    );
  }

  if (!gesture) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3" style={{ background: SL.bg }}>
        <p style={{ fontFamily: SL.ff, color: "#717182" }}>Жест не знайдено</p>
        <button onClick={() => navigate(-1)} style={{ color: SL.greenDark, fontWeight: 600, fontFamily: SL.ff, background: "none", border: "none", cursor: "pointer" }}>
          Назад
        </button>
      </div>
    );
  }

  const lesson = lessons.find(l => l.gesture_id === gesture.gesture_id);
  const prog = lesson ? progress.find(p => p.lesson_id === lesson.lesson_id) : null;
  const isMastered = prog?.status === "mastered";
  const iconUrl = gesture.media?.icon ? resolveMediaUrl(gesture.media.icon.file_path) : "";
  const demoUrl = gesture.media?.demo_image ? resolveMediaUrl(gesture.media.demo_image.file_path) : "";

  return (
    <div className="flex flex-col h-full" style={{ background: SL.bg, fontFamily: SL.ff }}>
      <div className="flex items-center gap-3 px-4 pt-8 pb-3">
        <button
          onClick={() => navigate(-1)}
          style={{ background: SL.card, border: "none", borderRadius: 12, padding: "8px 10px", cursor: "pointer" }}
        >
          <ArrowLeft size={18} stroke="#333" />
        </button>
        <h2 style={{ fontWeight: 700, fontSize: 18, color: "#111", flex: 1 }}>
          Буква {gesture.symbol}
        </h2>
        {prog && <StatusPill status={prog.status} />}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-4">
        {/* Large image */}
        <div
          style={{
            background: isMastered ? SL.green : SL.greenLight,
            borderRadius: 24,
            padding: "40px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
          }}
        >
          {iconUrl ? (
            <img
              src={iconUrl}
              alt={`Іконка жесту ${gesture.symbol}`}
              style={{ width: 116, height: 116, objectFit: "contain" }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <span style={{ fontSize: 56 }}>{GESTURE_EMOJI[gesture.symbol] ?? "🤟"}</span>
          )}
          <span style={{
            fontSize: 64,
            fontWeight: 900,
            fontFamily: SL.ff,
            color: isMastered ? "#fff" : "#2e3a1f",
            lineHeight: 1,
          }}>
            {gesture.symbol}
          </span>
        </div>

        {demoUrl && (
          <div style={{ background: SL.card, borderRadius: 18, padding: "12px" }}>
            <img
              src={demoUrl}
              alt={`Приклад жесту ${gesture.symbol}`}
              style={{ width: "100%", maxHeight: 260, objectFit: "contain", borderRadius: 14, display: "block" }}
            />
          </div>
        )}

        {/* Meta */}
        <div className="flex gap-2">
          <ComplexityBadge complexity={gesture.complexity} />
          {isMastered && (
            <span style={{ background: "#d4f0d8", color: SL.greenDark, fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 20 }}>
              ✓ Засвоєно
            </span>
          )}
        </div>

        {/* Description */}
        {lesson && lesson.description && (
          <div style={{ background: SL.card, borderRadius: 18, padding: "16px" }}>
            <p style={{ fontWeight: 600, fontSize: 14, color: "#111", marginBottom: 4 }}>Опис</p>
            <p style={{ fontSize: 14, color: "#444", lineHeight: 1.5 }}>{lesson.description}</p>
          </div>
        )}

        {/* Progress */}
        {prog && (
          <div style={{ background: SL.card, borderRadius: 18, padding: "16px" }}>
            <div className="flex items-center justify-between mb-2">
              <p style={{ fontWeight: 600, fontSize: 14, color: "#111" }}>Прогрес жесту</p>
              <p style={{ fontSize: 13, color: "#717182" }}>
                {prog.successful_attempts}/{prog.required_attempts}
              </p>
            </div>
            <GestureProgressBar value={prog.successful_attempts} max={prog.required_attempts} />
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2 mt-auto pt-2">
          {lesson && (
            <button
              onClick={() => navigate(`/practice/${lesson.lesson_id}`)}
              style={{
                background: SL.greenDark,
                color: "#fff",
                border: "none",
                borderRadius: 45,
                padding: "16px",
                fontSize: 16,
                fontWeight: 700,
                fontFamily: SL.ff,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <Camera size={18} />
              {isMastered ? "Повторити" : "Практикувати"}
            </button>
          )}

          {lesson && (
            <button
              onClick={() => navigate(`/lessons/${lesson.lesson_id}`)}
              style={{
                background: SL.card,
                color: "#333",
                border: "none",
                borderRadius: 45,
                padding: "14px",
                fontSize: 15,
                fontWeight: 600,
                fontFamily: SL.ff,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <BookOpen size={16} />
              Перейти до уроку
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
