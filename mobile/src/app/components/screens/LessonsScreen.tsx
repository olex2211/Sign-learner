import { useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { Flame, Sparkles, ChevronRight, RotateCcw, Play, BookOpen } from "lucide-react";

const SL = {
  bg: "#f8faec",
  green: "#4fa65b",
  greenDark: "#2e9d3e",
  greenLight: "#eaeed3",
  card: "#f1f1f1",
  ff: "'Libre Franklin', sans-serif",
};

export function LessonsScreen() {
  const navigate = useNavigate();
  const { stats, lessons, progress } = useAuth();

  if (!stats || lessons.length === 0) {
    return (
      <div className="flex items-center justify-center h-full" style={{ background: SL.bg }}>
        <p style={{ fontFamily: SL.ff, color: "#717182" }}>Завантаження...</p>
      </div>
    );
  }

  const sortedLessons = [...lessons].sort((a, b) => a.order - b.order);
  const masteredCount = progress.filter(p => p.status === "mastered").length;

  // Current lesson: prefer in_progress, then first not-mastered
  const currentProgress =
    progress.find(p => p.status === "in_progress") ??
    progress.find(p => p.status === "not_started") ??
    progress[0];

  const currentLesson = currentProgress
    ? sortedLessons.find(l => l.lesson_id === currentProgress.lesson_id)
    : sortedLessons[0];

  const currentIdx = currentLesson
    ? sortedLessons.findIndex(l => l.lesson_id === currentLesson.lesson_id)
    : 0;

  const upcoming = sortedLessons.slice(currentIdx, currentIdx + 4);
  const reviewProgress = progress.find(p => p.status === "mastered");

  type QueueItem = { symbol: string; lesson_id: number; kind: "current" | "next" | "review" };
  const queue: QueueItem[] = upcoming.map((l, i) => {
    const prog = progress.find(p => p.lesson_id === l.lesson_id);
    return {
      symbol: prog?.symbol ?? l.title.replace("Буква ", ""),
      lesson_id: l.lesson_id,
      kind: i === 0 ? "current" : "next",
    };
  });
  if (reviewProgress) {
    queue.push({
      symbol: reviewProgress.symbol,
      lesson_id: reviewProgress.lesson_id,
      kind: "review",
    });
  }

  return (
    <div className="flex flex-col h-full" style={{ background: SL.bg, fontFamily: SL.ff }}>
      <div className="flex-1 overflow-y-auto pb-6">
        {/* Header */}
        <div className="px-5 pt-8 pb-4">
          <div className="flex items-center justify-between">
            <h1 style={{ fontWeight: 800, fontSize: 26, color: "#111" }}>Навчання</h1>
            <div
              className="flex items-center gap-1.5 px-3 py-1.5"
              style={{ background: "#fff", borderRadius: 999, border: `1px solid ${SL.greenLight}` }}
            >
              <Flame size={14} stroke="#e8843a" fill="#ffd9b8" />
              <span style={{ fontSize: 12, fontWeight: 700, color: "#111" }}>{stats.current_streak}</span>
              <span style={{ fontSize: 11, color: "#717182" }}>дн.</span>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-3">
            <div className="flex items-center gap-1.5">
              <Sparkles size={13} stroke={SL.greenDark} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "#111" }}>{stats.experience_points} XP</span>
            </div>
            <span style={{ color: "#d0d0d0" }}>•</span>
            <span style={{ fontSize: 12, color: "#717182" }}>Рівень {stats.level}</span>
            <span style={{ color: "#d0d0d0" }}>•</span>
            <span style={{ fontSize: 12, color: "#717182" }}>{masteredCount}/{lessons.length || 33} букв</span>
          </div>
        </div>

        {/* Hero card */}
        {currentLesson && currentProgress && (
          <div className="px-5">
            <div
              style={{
                background: `linear-gradient(140deg, ${SL.green} 0%, ${SL.greenDark} 100%)`,
                borderRadius: 24,
                padding: 18,
                color: "#fff",
                boxShadow: "0 10px 24px -10px rgba(46,157,62,0.45)",
              }}
            >
              <div className="flex items-center justify-between" style={{ opacity: 0.9 }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase" }}>
                  Наступний крок у навчанні
                </span>
                <span style={{ fontSize: 11, fontWeight: 600 }}>Урок {currentIdx + 1}/{lessons.length || 33}</span>
              </div>

              <div className="flex items-center gap-4 mt-3">
                <div
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: 22,
                    background: "rgba(255,255,255,0.18)",
                    border: "2px solid rgba(255,255,255,0.35)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 56,
                    fontWeight: 800,
                    flexShrink: 0,
                    backdropFilter: "blur(6px)",
                  }}
                >
                  {currentProgress.symbol}
                </div>

                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: 11, opacity: 0.85, fontWeight: 600 }}>Поточна буква</p>
                  <h2 style={{ fontWeight: 800, fontSize: 24, marginTop: 2 }}>{currentLesson.title}</h2>
                  <p style={{ fontSize: 12, opacity: 0.9, marginTop: 4, lineHeight: 1.35 }}>
                    Повторимо цю букву ще раз, щоб закріпити жест.
                  </p>
                </div>
              </div>

              {/* Gesture progress */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.9 }}>
                    Прогрес жесту: {currentProgress.successful_attempts}/{currentProgress.required_attempts}
                  </span>
                  <span style={{ fontSize: 11, opacity: 0.8 }}>
                    ще {Math.max(0, currentProgress.required_attempts - currentProgress.successful_attempts)} спроб
                  </span>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {Array.from({ length: currentProgress.required_attempts }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        height: 6,
                        borderRadius: 4,
                        background: i < currentProgress.successful_attempts ? "#fff" : "rgba(255,255,255,0.28)",
                      }}
                    />
                  ))}
                </div>
              </div>

              <button
                onClick={() => navigate(`/lessons/${currentLesson.lesson_id}`)}
                className="w-full mt-4 flex items-center justify-center gap-2"
                style={{
                  background: "#fff",
                  color: SL.greenDark,
                  borderRadius: 14,
                  padding: "13px 16px",
                  fontWeight: 700,
                  fontSize: 15,
                  fontFamily: SL.ff,
                }}
              >
                <Play size={16} fill={SL.greenDark} stroke={SL.greenDark} />
                Продовжити навчання
              </button>
            </div>
          </div>
        )}

        {/* Learning queue */}
        <div className="mt-6">
          <div className="px-5 flex items-center justify-between mb-3">
            <div>
              <h3 style={{ fontWeight: 700, fontSize: 16, color: "#111" }}>Черга навчання</h3>
              <p style={{ fontSize: 11, color: "#717182", marginTop: 2 }}>
                Послідовність букв у поточній сесії
              </p>
            </div>
          </div>

          <div className="px-5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            <div className="flex items-center gap-2.5" style={{ minWidth: "min-content" }}>
              {queue.map((q, i) => {
                const isCurrent = q.kind === "current";
                const isReview = q.kind === "review";
                return (
                  <div key={`${q.lesson_id}-${i}`} className="flex items-center gap-2.5">
                    <button
                      onClick={() => navigate(`/lessons/${q.lesson_id}`)}
                      className="flex flex-col items-center justify-center flex-shrink-0"
                      style={{
                        width: 64,
                        height: 80,
                        borderRadius: 16,
                        background: isCurrent ? SL.green : isReview ? "#fff" : SL.card,
                        border: isCurrent
                          ? `2px solid ${SL.greenDark}`
                          : isReview
                          ? `1.5px dashed ${SL.green}`
                          : "1.5px solid transparent",
                        color: isCurrent ? "#fff" : "#111",
                        position: "relative",
                      }}
                    >
                      <span style={{ fontSize: 28, fontWeight: 800 }}>{q.symbol}</span>
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          marginTop: 2,
                          opacity: 0.85,
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                        }}
                      >
                        {isCurrent ? "зараз" : isReview ? "повтор" : `№${i + 1}`}
                      </span>
                      {isReview && (
                        <div
                          style={{
                            position: "absolute",
                            top: -6,
                            right: -6,
                            width: 22,
                            height: 22,
                            borderRadius: 999,
                            background: SL.green,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#fff",
                          }}
                        >
                          <RotateCcw size={12} />
                        </div>
                      )}
                    </button>
                    {i < queue.length - 1 && (
                      <ChevronRight size={14} stroke="#cfcfcf" style={{ flexShrink: 0 }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Alphabet progress strip */}
        <div className="mt-7 px-5">
          <div className="flex items-center justify-between mb-3">
            <h3 style={{ fontWeight: 700, fontSize: 16, color: "#111" }}>Прогрес алфавіту</h3>
            <span style={{ fontSize: 12, fontWeight: 600, color: SL.greenDark }}>
              {lessons.length > 0 ? Math.round((masteredCount / lessons.length) * 100) : 0}%
            </span>
          </div>

          <div style={{ display: "flex", gap: 3 }}>
            {sortedLessons.map((l) => {
              const p = progress.find(pp => pp.lesson_id === l.lesson_id);
              const isMastered = p?.status === "mastered";
              const isCurrentDot = currentLesson && l.lesson_id === currentLesson.lesson_id;
              return (
                <div
                  key={l.lesson_id}
                  title={p?.symbol ?? ""}
                  style={{
                    flex: 1,
                    height: isCurrentDot ? 14 : 8,
                    alignSelf: "center",
                    borderRadius: 3,
                    background: isMastered
                      ? SL.green
                      : isCurrentDot
                      ? SL.greenDark
                      : p?.lesson_status === "available"
                      ? "#d4d8c2"
                      : "#e6e6da",
                  }}
                />
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-2.5">
            <span style={{ fontSize: 11, color: "#717182" }}>А</span>
            <span style={{ fontSize: 11, color: "#717182" }}>
              Вивчено {masteredCount} з {lessons.length || 33}
            </span>
            <span style={{ fontSize: 11, color: "#717182" }}>Я</span>
          </div>
        </div>

        {/* Secondary action */}
        <div className="px-5 mt-6">
          <button
            onClick={() => navigate("/dictionary")}
            className="w-full flex items-center justify-center gap-2"
            style={{
              background: "transparent",
              color: SL.greenDark,
              border: `1.5px solid ${SL.greenLight}`,
              borderRadius: 12,
              padding: "11px 14px",
              fontWeight: 600,
              fontSize: 13,
              fontFamily: SL.ff,
            }}
          >
            <BookOpen size={14} />
            Переглянути всі букви у словнику
          </button>
        </div>
      </div>
    </div>
  );
}
