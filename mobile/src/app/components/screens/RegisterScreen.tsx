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

export function RegisterScreen() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  function validate() {
    const e: Record<string, string> = {};
    if (form.username.length < 3) e.username = "Мінімум 3 символи";
    if (!form.email.includes("@")) e.email = "Невалідна email адреса";
    if (form.password.length < 5) e.password = "Мінімум 5 символів";
    return e;
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    setServerError("");
    try {
      await register(form);
      navigate("/home");
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        "Помилка реєстрації. Спробуйте ще раз.";
      setServerError(typeof msg === "string" ? msg : "Помилка реєстрації");
    } finally {
      setLoading(false);
    }
  }

  function update(field: string, val: string) {
    setForm(f => ({ ...f, [field]: val }));
    setErrors(e => ({ ...e, [field]: "" }));
  }

  const fields: { key: keyof typeof form; label: string; type: string }[] = [
    { key: "username", label: "Логін", type: "text" },
    { key: "email", label: "Email", type: "email" },
    { key: "password", label: "Пароль", type: "password" },
  ];

  return (
    <div className="flex flex-col h-full" style={{ background: SL.bg, fontFamily: SL.ff }}>
      <div className="flex-1 flex flex-col justify-center px-6 pt-12 pb-6">
        <div className="mb-8 text-center">
          <div
            className="mx-auto mb-4 flex items-center justify-center rounded-3xl"
            style={{ width: 72, height: 72, background: SL.greenDark }}
          >
            <span style={{ fontSize: 36 }}>🤟</span>
          </div>
          <h1 style={{ fontWeight: 800, fontSize: 26, color: "#111" }}>Створити акаунт</h1>
          <p style={{ color: "#717182", fontSize: 14, marginTop: 4 }}>
            Почни вивчати жестову мову
          </p>
        </div>

        <form onSubmit={handleRegister} className="flex flex-col gap-3">
          {fields.map(({ key, label, type }) => (
            <div key={key}>
              <input
                value={form[key]}
                onChange={e => update(key, e.target.value)}
                type={type}
                placeholder={label}
                style={{
                  width: "100%",
                  background: errors[key] ? "#fde8e8" : SL.card,
                  border: errors[key] ? "1px solid #d4183d" : "none",
                  borderRadius: 14,
                  padding: "14px 16px",
                  fontSize: 15,
                  fontFamily: SL.ff,
                  outline: "none",
                  color: "#111",
                  boxSizing: "border-box",
                }}
              />
              {errors[key] && (
                <p style={{ color: "#d4183d", fontSize: 12, marginTop: 3, marginLeft: 4 }}>{errors[key]}</p>
              )}
            </div>
          ))}

          {serverError && (
            <p style={{ color: "#d4183d", fontSize: 13, textAlign: "center" }}>{serverError}</p>
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
            {loading ? "Реєстрація..." : "Створити акаунт"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 14, color: "#717182" }}>
          Вже маєш акаунт?{" "}
          <button
            onClick={() => navigate("/login")}
            style={{ color: SL.green, fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontFamily: SL.ff, fontSize: 14 }}
          >
            Увійти
          </button>
        </p>
      </div>
    </div>
  );
}
