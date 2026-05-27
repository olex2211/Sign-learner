import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../src/auth/AuthContext";
import { Colors, Radius, FontSizes } from "../../src/constants/theme";

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  function validate() {
    const e: Record<string, string> = {};
    if (form.username.length < 3) e.username = "Мінімум 3 символи";
    if (!form.email.includes("@")) e.email = "Невалідна email адреса";
    if (form.password.length < 5) e.password = "Мінімум 5 символів";
    return e;
  }

  async function handleRegister() {
    const errs = validate();
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }
    setLoading(true);
    setServerError("");
    try {
      await register(form);
      router.replace("/(tabs)/home");
    } catch (err: any) {
      setServerError(err?.message || "Помилка реєстрації. Спробуйте ще раз.");
    } finally {
      setLoading(false);
    }
  }

  function update(field: keyof typeof form, val: string) {
    setForm((f) => ({ ...f, [field]: val }));
    setFieldErrors((e) => ({ ...e, [field]: "" }));
  }

  const fields: {
    key: keyof typeof form;
    label: string;
    secure?: boolean;
    inputMode?: "email";
  }[] = [
    { key: "username", label: "Логін" },
    { key: "email", label: "Email", inputMode: "email" },
    { key: "password", label: "Пароль", secure: true },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoWrap}>
            <View style={styles.logoBox}>
              <Text style={styles.logoEmoji}>🤟</Text>
            </View>
            <Text style={styles.title}>Створити акаунт</Text>
            <Text style={styles.subtitle}>Почни вивчати жестову мову</Text>
          </View>

          <View style={styles.form}>
            {fields.map(({ key, label, secure, inputMode }) => (
              <View key={key}>
                <TextInput
                  value={form[key]}
                  onChangeText={(v) => update(key, v)}
                  placeholder={label}
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry={secure}
                  autoCapitalize="none"
                  autoCorrect={false}
                  inputMode={inputMode}
                  style={[
                    styles.input,
                    fieldErrors[key] ? styles.inputError : null,
                  ]}
                />
                {fieldErrors[key] ? (
                  <Text style={styles.fieldError}>{fieldErrors[key]}</Text>
                ) : null}
              </View>
            ))}

            {serverError ? (
              <Text style={styles.error}>{serverError}</Text>
            ) : null}

            <Pressable
              onPress={handleRegister}
              disabled={loading}
              style={[styles.btn, loading && styles.btnDisabled]}
            >
              <Text style={styles.btnText}>
                {loading ? "Реєстрація..." : "Створити акаунт"}
              </Text>
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Вже маєш акаунт? </Text>
            <Pressable onPress={() => router.push("/(auth)/login")}>
              <Text style={styles.footerLink}>Увійти</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: "flex-start",
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
  },
  logoWrap: { alignItems: "center", marginBottom: 36 },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: Colors.greenDark,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  logoEmoji: { fontSize: 36 },
  title: { fontSize: FontSizes.h2, fontWeight: "800", color: Colors.text },
  subtitle: {
    fontSize: FontSizes.base,
    color: Colors.textMuted,
    marginTop: 4,
  },
  form: { gap: 10 },
  input: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: FontSizes.lg,
    color: Colors.text,
    borderWidth: 1,
    borderColor: "transparent",
  },
  inputError: {
    backgroundColor: "#fde8e8",
    borderColor: Colors.error,
  },
  fieldError: {
    color: Colors.error,
    fontSize: FontSizes.xs,
    marginTop: 3,
    marginLeft: 4,
  },
  error: {
    color: Colors.error,
    fontSize: FontSizes.sm,
    textAlign: "center",
  },
  btn: {
    backgroundColor: Colors.greenDark,
    borderRadius: Radius.pill,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: Colors.white, fontSize: FontSizes.xl, fontWeight: "700" },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  footerText: { fontSize: FontSizes.md, color: Colors.textMuted },
  footerLink: {
    fontSize: FontSizes.md,
    color: Colors.green,
    fontWeight: "600",
  },
});
