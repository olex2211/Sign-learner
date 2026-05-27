import { useNavigate, useLocation } from "react-router";
import { Home, BookOpen, Grid3X3, User } from "lucide-react";

const TABS = [
  { path: "/home", label: "Головна", Icon: Home },
  { path: "/lessons", label: "Навчання", Icon: BookOpen },
  { path: "/dictionary", label: "Жести", Icon: Grid3X3 },
  { path: "/profile", label: "Профіль", Icon: User },
];

export function BottomTabBar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div
      className="flex items-center justify-around px-2 py-2 border-t"
      style={{ background: "#f8faec", borderColor: "#eaeed3" }}
    >
      {TABS.map(({ path, label, Icon }) => {
        const active = location.pathname.startsWith(path);
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all"
            style={{ color: active ? "#4fa65b" : "#b0b0b0" }}
          >
            <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
            <span
              style={{
                fontFamily: "'Libre Franklin', sans-serif",
                fontSize: 10,
                fontWeight: active ? 700 : 500,
              }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
