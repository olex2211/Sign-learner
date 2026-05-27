import { useNavigate } from "react-router";
import { Flame, Star, BookOpen, ArrowRight } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { GestureProgressBar } from "../GestureProgressBar";
import { StatusPill } from "../StatusPill";

const SL = {
  bg: "#f8faec",
  green: "#4fa65b",
  greenDark: "#2e9d3e",
  greenLight: "#eaeed3",
  card: "#f1f1f1",
  dark: "#333",
  ff: "'Libre Franklin', sans-serif",
};

const DAYS = ["ПН","ВТ","СР","ЧТ","ПТ","СБ","НД"];

function getDayOfWeek(date: Date) {
  const d = date.getDay();
  return d === 0 ? 6 : d - 1;
}

function getWeekDates(today: Date) {
  const dow = getDayOfWeek(today);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - dow + i);
    return d;
  });
}

export function HomeScreen() {
  const navigate = useNavigate();
  const { user, stats, lessons, progress } = useAuth();

  const today = new Date();
  const weekDates = getWeekDates(today);
  const todayIdx = getDayOfWeek(today);

  if (!user || !stats) {
    return (
      <div className="flex items-center justify-center h-full" style={{ background: SL.bg }}>
        <p style={{ fontFamily: SL.ff, color: "#717182" }}>Завантаження...</p>
      </div>
    );
  }

  const masteredCount = progress.filter(p => p.status === "mastered").length;

  // Find next lesson: prefer in_progress, then first not-mastered by order
  const sortedLessons = [...lessons].sort((a, b) => a.order - b.order);
  const inProgressLesson = sortedLessons.find(l => {
    const prog = progress.find(p => p.lesson_id === l.lesson_id);
    return prog && prog.status === "in_progress";
  });
  const nextNotStarted = sortedLessons.find(l => {
    const prog = progress.find(p => p.lesson_id === l.lesson_id);
    return !prog || prog.status === "not_started";
  });
  const nextLesson = inProgressLesson || nextNotStarted;
  const nextProgress = nextLesson
    ? progress.find(p => p.lesson_id === nextLesson.lesson_id)
    : null;

  const recentLessons = sortedLessons.slice(0, 4);

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ background: SL.bg, fontFamily: SL.ff }}>
      {/* Header */}
      <div className="px-5 pt-8 pb-3">
        <p style={{ fontWeight: 400, fontSize: 26, color: "#111" }}>
          Привіт,{" "}
          <span style={{ fontWeight: 800 }}>{user.username}!</span>
        </p>
      </div>

      {/* Week strip */}
      <div className="px-4 pb-3">
        <div className="flex justify-between">
          {weekDates.map((date, i) => {
            const isToday = i === todayIdx;
            return (
              <div key={i} className="flex flex-col items-center gap-1">
                <span style={{ fontSize: 11, fontWeight: 600, color: "#b0b0b0" }}>
                  {DAYS[i]}
                </span>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: isToday ? 12 : "50%",
                    background: isToday ? SL.dark : i < todayIdx ? SL.greenLight : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: isToday ? "#fff" : i < todayIdx ? "#4fa65b" : "#555",
                    }}
                  >
                    {date.getDate()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* XP / streak / progress row */}
      <div className="px-4 pb-3">
        <div className="flex gap-2">
          <div
            className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-2xl"
            style={{ background: SL.greenLight }}
          >
            <Star size={16} fill={SL.green} stroke={SL.green} />
            <div>
              <p style={{ fontSize: 10, color: "#717182", lineHeight: 1 }}>XP</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#111", lineHeight: 1.2 }}>
                {stats.experience_points}
              </p>
            </div>
          </div>
          <div
            className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-2xl"
            style={{ background: "#fff3cd" }}
          >
            <Flame size={16} fill="#f59e0b" stroke="#f59e0b" />
            <div>
              <p style={{ fontSize: 10, color: "#717182", lineHeight: 1 }}>Streak</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#111", lineHeight: 1.2 }}>
                {stats.current_streak} дн
              </p>
            </div>
          </div>
          <div
            className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-2xl"
            style={{ background: "#ddeeff" }}
          >
            <BookOpen size={16} stroke="#377ceb" />
            <div>
              <p style={{ fontSize: 10, color: "#717182", lineHeight: 1 }}>Вивчено</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#111", lineHeight: 1.2 }}>
                {masteredCount}/{lessons.length || 33}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Motivational tip card */}
      <div className="px-4 pb-3">
        <div
          className="rounded-3xl p-4 flex items-center gap-3"
          style={{ background: SL.greenLight }}
        >
          <span style={{ fontSize: 36 }}>🤟</span>
          <p style={{ fontSize: 13, color: "#3a3a3a", lineHeight: 1.4, flex: 1 }}>
            Практикуй щодня — навіть 10 хвилин дадуть результат!
          </p>
        </div>
      </div>

      {/* Next lesson CTA */}
      {nextLesson && (
        <div className="px-4 pb-3">
          <p style={{ fontSize: 13, fontWeight: 600, color: "#717182", marginBottom: 8 }}>
            Продовжити навчання
          </p>
          <button
            onClick={() => navigate(`/lessons/${nextLesson.lesson_id}`)}
            className="w-full text-left"
            style={{
              background: SL.dark,
              borderRadius: 20,
              padding: "14px 16px",
              border: "none",
              cursor: "pointer",
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    background: SL.green,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 26,
                    fontWeight: 800,
                    color: "#fff",
                    fontFamily: SL.ff,
                  }}
                >
                  {nextProgress?.symbol ?? nextLesson.title.replace("Буква ", "")}
                </div>
                <div>
                  <p style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>
                    {nextLesson.title}
                  </p>
                  <p style={{ color: "#b0b0b0", fontSize: 12, marginTop: 2 }}>
                    Прогрес жесту: {nextProgress?.successful_attempts ?? 0}/{nextProgress?.required_attempts ?? 2}
                  </p>
                  <div style={{ marginTop: 4, width: 120 }}>
                    <GestureProgressBar
                      value={nextProgress?.successful_attempts ?? 0}
                      max={nextProgress?.required_attempts ?? 2}
                    />
                  </div>
                </div>
              </div>
              <ArrowRight size={20} stroke="#fff" />
            </div>
          </button>
        </div>
      )}

      {!nextLesson && lessons.length > 0 && (
        <div className="px-4 pb-3">
          <div
            className="rounded-3xl p-4 text-center"
            style={{ background: SL.greenLight }}
          >
            <p style={{ fontWeight: 700, fontSize: 16, color: "#111" }}>
              Алфавіт завершено! 🎉
            </p>
            <p style={{ fontSize: 13, color: "#717182", marginTop: 4 }}>
              Повтори жести у словнику
            </p>
            <button
              onClick={() => navigate("/dictionary")}
              className="mt-3"
              style={{
                background: SL.greenDark,
                color: "#fff",
                border: "none",
                borderRadius: 45,
                padding: "12px 24px",
                fontSize: 14,
                fontWeight: 700,
                fontFamily: SL.ff,
                cursor: "pointer",
              }}
            >
              Повторити алфавіт
            </button>
          </div>
        </div>
      )}

      {/* Recent letters */}
      <div className="px-4 pb-4">
        <p style={{ fontSize: 13, fontWeight: 600, color: "#717182", marginBottom: 8 }}>
          Останні букви
        </p>
        <div className="flex flex-col gap-2">
          {recentLessons.map((lesson) => {
            const prog = progress.find(p => p.lesson_id === lesson.lesson_id);
            const symbol = prog?.symbol ?? lesson.title.replace("Буква ", "");
            return (
              <button
                key={lesson.lesson_id}
                onClick={() => navigate(`/lessons/${lesson.lesson_id}`)}
                className="flex items-center gap-3 text-left w-full"
                style={{
                  background: SL.card,
                  borderRadius: 16,
                  padding: "12px 14px",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    background: prog?.status === "mastered" ? SL.green : SL.greenLight,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                    fontWeight: 800,
                    color: prog?.status === "mastered" ? "#fff" : "#333",
                    fontFamily: SL.ff,
                  }}
                >
                  {symbol}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p style={{ fontWeight: 600, fontSize: 14, color: "#111" }}>{lesson.title}</p>
                    {prog && <StatusPill status={prog.status} small />}
                  </div>
                  <GestureProgressBar
                    value={prog?.successful_attempts ?? 0}
                    max={prog?.required_attempts ?? 2}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
