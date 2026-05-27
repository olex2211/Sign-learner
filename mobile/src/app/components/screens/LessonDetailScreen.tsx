import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Camera, SkipForward } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getGesture } from "../../api/gestures";
import { getLesson } from "../../api/lessons";
import { skipPracticeLesson } from "../../api/practice";
import { resolveMediaUrl } from "../../api/media";
import type { Gesture, LessonDetail } from "../../api/types";
import { GestureProgressBar } from "../GestureProgressBar";
import { ComplexityBadge } from "../ComplexityBadge";
import { StatusPill } from "../StatusPill";
import { advancePracticeQueue, clearPracticeQueue, ensurePracticeQueue } from "../../utils/practiceSession";

const SL = {
  bg: "#f8faec",
  green: "#4fa65b",
  greenDark: "#2e9d3e",
  greenLight: "#eaeed3",
  card: "#f1f1f1",
  dark: "#333",
  ff: "'Libre Franklin', sans-serif",
};

const GESTURE_EMOJI: Record<string, string> = {
  А:"🤚",Б:"✋",В:"🖖",Г:"👆",Ґ:"✊",Д:"🤙",Е:"👐",Є:"🙌",
  Ж:"👋",З:"🤞",И:"☝️",І:"👆",Ї:"🤟",Й:"🤘",К:"✌️",Л:"👌",
  М:"🤏",Н:"🖐",О:"👊",П:"🤜",Р:"🤛",С:"👍",Т:"👎",У:"🤙",
  Ф:"🤳",Х:"🤝",Ц:"👏",Ч:"🙏",Ш:"🤲",Щ:"🫶",Ь:"🫳",Ю:"🫴",Я:"🫵",
};

export function LessonDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { lessons, progress, refreshData } = useAuth();

  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [gesture, setGesture] = useState<Gesture | null>(null);
  const [loading, setLoading] = useState(true);
  const [skipping, setSkipping] = useState(false);
  const [error, setError] = useState("");

  const lessonId = parseInt(id ?? "0", 10);

  useEffect(() => {
    if (!lessonId) return;
    setLoading(true);
    setLesson(null);
    setGesture(null);
    getLesson(lessonId)
      .then(async (loadedLesson) => {
        setLesson(loadedLesson);
        const loadedGesture = await getGesture(loadedLesson.gesture_id);
        setGesture(loadedGesture);
      })
      .catch(() => setError("Не вдалося завантажити урок"))
      .finally(() => setLoading(false));
  }, [lessonId]);

  useEffect(() => {
    if (!lessonId || lessons.length === 0) return;
    ensurePracticeQueue(lessons, progress, lessonId);
  }, [lessonId, lessons, progress]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ background: SL.bg }}>
        <p style={{ fontFamily: SL.ff, color: "#717182" }}>Завантаження...</p>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3" style={{ background: SL.bg }}>
        <p style={{ fontFamily: SL.ff, color: "#717182" }}>{error || "Урок не знайдено"}</p>
        <button onClick={() => navigate(-1)} style={{ color: SL.greenDark, fontWeight: 600, fontFamily: SL.ff, background: "none", border: "none", cursor: "pointer" }}>
          Назад
        </button>
      </div>
    );
  }

  const prog = progress.find(p => p.lesson_id === lessonId);
  const symbol = prog?.symbol ?? lesson.title.replace("Буква ", "");
  const isMastered = prog?.status === "mastered";

  const demoImage = gesture?.media?.demo_image;
  const iconImage = gesture?.media?.icon;

  async function handleSkip() {
    setSkipping(true);
    try {
      await skipPracticeLesson(lessonId);
      await refreshData();
      const nextLessonId = advancePracticeQueue(lessons, progress, lessonId, "reinsert_after_three");
      if (nextLessonId) {
        navigate(`/lessons/${nextLessonId}`);
      } else {
        clearPracticeQueue();
        navigate("/lessons");
      }
    } catch {
      setError("Не вдалося пропустити урок");
    } finally {
      setSkipping(false);
    }
  }

  return (
    <div className="flex flex-col h-full" style={{ background: SL.bg, fontFamily: SL.ff }}>
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 pt-8 pb-3">
        <button
          onClick={() => navigate(-1)}
          style={{ background: SL.card, border: "none", borderRadius: 12, padding: "8px 10px", cursor: "pointer" }}
        >
          <ArrowLeft size={18} stroke="#333" />
        </button>
        <h2 style={{ fontWeight: 700, fontSize: 18, color: "#111", flex: 1 }}>{lesson.title}</h2>
        {prog && <StatusPill status={prog.status} />}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-4">
        {/* Big letter display / media */}
        <div
          style={{
            background: isMastered ? SL.green : SL.greenLight,
            borderRadius: 24,
            padding: "32px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
          }}
        >
          {demoImage ? (
            <img
              src={resolveMediaUrl(demoImage.file_path)}
              alt={`Жест ${symbol}`}
              style={{ maxHeight: 160, borderRadius: 16, objectFit: "contain" }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : iconImage ? (
            <img
              src={resolveMediaUrl(iconImage.file_path)}
              alt={`Іконка жесту ${symbol}`}
              style={{ maxHeight: 160, objectFit: "contain" }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <>
              <span
                style={{
                  fontSize: 80,
                  fontWeight: 900,
                  fontFamily: SL.ff,
                  color: isMastered ? "#fff" : "#2e3a1f",
                  lineHeight: 1,
                }}
              >
                {symbol}
              </span>
              <span style={{ fontSize: 48 }}>{GESTURE_EMOJI[symbol] ?? "🤟"}</span>
            </>
          )}
          {isMastered && (
            <span style={{ background: "rgba(255,255,255,0.25)", color: "#fff", fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 20 }}>
              ✓ Засвоєно
            </span>
          )}
        </div>

        {/* Description */}
        <div style={{ background: SL.card, borderRadius: 18, padding: "16px" }}>
          <p style={{ fontWeight: 700, fontSize: 14, color: "#111", marginBottom: 6 }}>Опис жесту</p>
          <p style={{ fontSize: 14, color: "#444", lineHeight: 1.5 }}>{lesson.description || "Опис відсутній"}</p>
        </div>

        {/* Meta info */}
        <div className="flex gap-2">
          {prog && <ComplexityBadge complexity={prog.complexity} />}
          <span style={{ background: SL.greenLight, color: SL.greenDark, fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 20 }}>
            Урок #{lesson.order}
          </span>
        </div>

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
          <button
            onClick={() => navigate(`/practice/${lesson.lesson_id}`)}
            style={{
              background: isMastered ? SL.green : SL.greenDark,
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

          {!isMastered && (
            <button
              onClick={handleSkip}
              disabled={skipping}
              style={{
                background: SL.card,
                color: "#717182",
                border: "none",
                borderRadius: 45,
                padding: "14px",
                fontSize: 15,
                fontWeight: 600,
                fontFamily: SL.ff,
                cursor: skipping ? "not-allowed" : "pointer",
                opacity: skipping ? 0.7 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <SkipForward size={16} />
              {skipping ? "Пропуск..." : "Пропустити"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
