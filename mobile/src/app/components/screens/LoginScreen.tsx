import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";

const SL = {
  bg: "#f8faec",
  green: "#4fa65b",
  greenDark: "#2e9d3e",
  card: "#f1f1f1",
  ff: "'Libre Franklin', sans-serif",
};

export function LoginScreen() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password) {
      setError("Введіть логін і пароль");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await login({ username, password });
      navigate("/home");
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        "Помилка входу. Спробуйте ще раз.";
      setError(typeof msg === "string" ? msg : "Невірний логін або пароль");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full" style={{ background: SL.bg, fontFamily: SL.ff }}>
      <div className="flex-1 flex flex-col justify-center px-6 pt-12 pb-6">
        <div className="mb-10 text-center">
          <div
            className="mx-auto mb-4 flex items-center justify-center rounded-3xl"
            style={{ width: 72, height: 72, background: SL.greenDark }}
          >
            <span style={{ fontSize: 36 }}>🤟</span>
          </div>
          <h1 style={{ fontWeight: 800, fontSize: 28, color: "#111", lineHeight: 1.2 }}>
            Sign-Learner
          </h1>
          <p style={{ color: "#717182", fontSize: 14, marginTop: 6 }}>
            Вивчай українську жестову мову
          </p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-3">
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Логін"
            style={{
              background: SL.card,
              border: "none",
              borderRadius: 14,
              padding: "14px 16px",
              fontSize: 15,
              fontFamily: SL.ff,
              outline: "none",
              color: "#111",
            }}
          />
          <input
            value={password}
            onChange={e => setPassword(e.target.value)}
            type="password"
            placeholder="Пароль"
            style={{
              background: SL.card,
              border: "none",
              borderRadius: 14,
              padding: "14px 16px",
              fontSize: 15,
              fontFamily: SL.ff,
              outline: "none",
              color: "#111",
            }}
          />

          {error && (
            <p style={{ color: "#d4183d", fontSize: 13, textAlign: "center" }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: SL.greenDark,
              color: "#fff",
              border: "none",
              borderRadius: 45,
              padding: "16px",
              fontSize: 16,
              fontWeight: 700,
              fontFamily: SL.ff,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.8 : 1,
              marginTop: 8,
            }}
          >
            {loading ? "Вхід..." : "Увійти"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 14, color: "#717182" }}>
          Немає акаунта?{" "}
          <button
            onClick={() => navigate("/register")}
            style={{ color: SL.green, fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontFamily: SL.ff, fontSize: 14 }}
          >
            Створити акаунт
          </button>
        </p>
      </div>
    </div>
  );
}
