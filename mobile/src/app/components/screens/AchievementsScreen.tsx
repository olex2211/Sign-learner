import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import { getAchievements, getMyAchievements } from "../../api/achievements";
import { resolveMediaUrl } from "../../api/media";
import type { Achievement, UserAchievement } from "../../api/types";

const SL = {
  bg: "#f8faec",
  green: "#4fa65b",
  greenDark: "#2e9d3e",
  greenLight: "#eaeed3",
  card: "#f1f1f1",
  ff: "'Libre Franklin', sans-serif",
};

// Default emoji icons for achievements without icon_path
const DEFAULT_ICONS = ["🏆", "🔥", "📚", "👋", "⚡", "💪", "🎯", "✨"];

interface MergedAchievement extends Achievement {
  earned: boolean;
  earned_at?: string;
}

export function AchievementsScreen() {
  const navigate = useNavigate();
  const [achievements, setAchievements] = useState<MergedAchievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [all, mine] = await Promise.all([
          getAchievements(),
          getMyAchievements(),
        ]);

        const myMap = new Map<number, UserAchievement>();
        mine.forEach(a => myMap.set(a.achievement_id, a));

        const merged: MergedAchievement[] = all.map(a => ({
          ...a,
          earned: myMap.has(a.achievement_id),
          earned_at: myMap.get(a.achievement_id)?.earned_at,
        }));

        setAchievements(merged);
      } catch {
        // Failed to load — show empty
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const earnedCount = achievements.filter(a => a.earned).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ background: SL.bg }}>
        <p style={{ fontFamily: SL.ff, color: "#717182" }}>Завантаження...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ background: SL.bg, fontFamily: SL.ff }}>
      <div className="flex items-center gap-3 px-4 pt-8 pb-3">
        <button
          onClick={() => navigate(-1)}
          style={{ background: SL.card, border: "none", borderRadius: 12, padding: "8px 10px", cursor: "pointer" }}
        >
          <ArrowLeft size={18} stroke="#333" />
        </button>
        <div>
          <h2 style={{ fontWeight: 800, fontSize: 20, color: "#111" }}>Досягнення</h2>
          <p style={{ fontSize: 12, color: "#717182" }}>Отримано {earnedCount} з {achievements.length}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-3">
        {achievements.map((ach, idx) => (
          <div
            key={ach.achievement_id}
            style={{
              background: ach.earned ? SL.card : "#f7f7f7",
              borderRadius: 18,
              padding: "16px",
              display: "flex",
              alignItems: "center",
              gap: 14,
              opacity: ach.earned ? 1 : 0.5,
              border: ach.earned ? `2px solid ${SL.greenLight}` : "2px solid transparent",
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: ach.earned ? SL.greenLight : "#eee",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
                filter: ach.earned ? "none" : "grayscale(1)",
                overflow: "hidden",
              }}
            >
              {ach.icon_path ? (
                <img
                  src={resolveMediaUrl(ach.icon_path)}
                  alt={ach.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                    (e.target as HTMLImageElement).parentElement!.textContent = DEFAULT_ICONS[idx % DEFAULT_ICONS.length];
                  }}
                />
              ) : (
                DEFAULT_ICONS[idx % DEFAULT_ICONS.length]
              )}
            </div>
            <div className="flex-1">
              <p style={{ fontWeight: 700, fontSize: 15, color: "#111" }}>{ach.name}</p>
              <p style={{ fontSize: 12, color: "#717182", marginTop: 2 }}>{ach.description}</p>
              {ach.earned && ach.earned_at && (
                <p style={{ fontSize: 11, color: SL.green, marginTop: 4, fontWeight: 600 }}>
                  Отримано {new Date(ach.earned_at).toLocaleDateString("uk-UA")}
                </p>
              )}
            </div>
            {ach.earned && (
              <span
                style={{
                  background: "#d4f0d8",
                  color: SL.greenDark,
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: 20,
                }}
              >
                ✓
              </span>
            )}
          </div>
        ))}

        {achievements.length === 0 && (
          <div className="text-center py-8">
            <p style={{ color: "#717182", fontSize: 14 }}>Досягнення поки відсутні</p>
          </div>
        )}
      </div>
    </div>
  );
}
