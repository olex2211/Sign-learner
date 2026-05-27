import { useNavigate } from "react-router";
import { Star, Flame, BookOpen, Trophy, LogOut, Edit3, ChevronRight } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const SL = {
  bg: "#f8faec",
  green: "#4fa65b",
  greenDark: "#2e9d3e",
  greenLight: "#eaeed3",
  card: "#f1f1f1",
  dark: "#333",
  ff: "'Libre Franklin', sans-serif",
};

export function ProfileScreen() {
  const navigate = useNavigate();
  const { user, stats, progress, logout } = useAuth();

  if (!user || !stats) {
    return (
      <div className="flex items-center justify-center h-full" style={{ background: SL.bg }}>
        <p style={{ fontFamily: SL.ff, color: "#717182" }}>Завантаження...</p>
      </div>
    );
  }

  const masteredCount = progress.filter(p => p.status === "mastered").length;

  const statItems = [
    { icon: <Star size={18} fill={SL.green} stroke={SL.green} />, label: "XP", value: stats.experience_points, bg: SL.greenLight },
    { icon: <Flame size={18} fill="#f59e0b" stroke="#f59e0b" />, label: "Streak", value: `${stats.current_streak} дн`, bg: "#fff3cd" },
    { icon: <BookOpen size={18} stroke="#377ceb" />, label: "Рівень", value: stats.level, bg: "#ddeeff" },
    { icon: <BookOpen size={18} stroke={SL.green} />, label: "Вивчено", value: `${masteredCount}/33`, bg: SL.greenLight },
  ];

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ background: SL.bg, fontFamily: SL.ff }}>
      {/* Header */}
      <div className="px-5 pt-8 pb-4 flex flex-col items-center">
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 24,
            background: SL.greenDark,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 36,
            marginBottom: 12,
          }}
        >
          🤟
        </div>
        <h1 style={{ fontWeight: 800, fontSize: 24, color: "#111" }}>{user.username}</h1>
        <p style={{ fontSize: 13, color: "#717182", marginTop: 2 }}>{user.email}</p>
        <p style={{ fontSize: 12, color: "#b0b0b0", marginTop: 2 }}>
          З нами з {new Date(user.created_at).toLocaleDateString("uk-UA", { month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Stats grid */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-2 gap-2">
          {statItems.map(({ icon, label, value, bg }, i) => (
            <div
              key={i}
              style={{
                background: bg,
                borderRadius: 16,
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              {icon}
              <div>
                <p style={{ fontSize: 10, color: "#717182", lineHeight: 1 }}>{label}</p>
                <p style={{ fontSize: 18, fontWeight: 700, color: "#111", lineHeight: 1.2 }}>{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Menu items */}
      <div className="px-4 pb-4 flex flex-col gap-2">
        <button
          onClick={() => navigate("/achievements")}
          className="flex items-center justify-between w-full"
          style={{
            background: SL.card,
            borderRadius: 16,
            padding: "16px",
            border: "none",
            cursor: "pointer",
          }}
        >
          <div className="flex items-center gap-3">
            <Trophy size={20} stroke={SL.green} />
            <div className="text-left">
              <p style={{ fontWeight: 600, fontSize: 14, color: "#111" }}>Досягнення</p>
              <p style={{ fontSize: 12, color: "#717182" }}>
                Отримано {stats.achievements_count}
              </p>
            </div>
          </div>
          <ChevronRight size={18} stroke="#b0b0b0" />
        </button>

        <button
          className="flex items-center justify-between w-full"
          style={{
            background: SL.card,
            borderRadius: 16,
            padding: "16px",
            border: "none",
            cursor: "pointer",
          }}
        >
          <div className="flex items-center gap-3">
            <Edit3 size={20} stroke="#717182" />
            <p style={{ fontWeight: 600, fontSize: 14, color: "#111" }}>Редагувати профіль</p>
          </div>
          <ChevronRight size={18} stroke="#b0b0b0" />
        </button>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full"
          style={{
            background: "#fde8e8",
            borderRadius: 16,
            padding: "16px",
            border: "none",
            cursor: "pointer",
          }}
        >
          <LogOut size={20} stroke="#d4183d" />
          <p style={{ fontWeight: 600, fontSize: 14, color: "#d4183d" }}>Вийти</p>
        </button>
      </div>
    </div>
  );
}
