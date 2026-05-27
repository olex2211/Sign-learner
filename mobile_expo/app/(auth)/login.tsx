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

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!username || !password) {
      setError("Введіть логін і пароль");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await login({ username, password });
      router.replace("/(tabs)/home");
    } catch (err: any) {
      const msg =
        err?.message || "Помилка входу. Спробуйте ще раз.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

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
          {/* Logo */}
          <View style={styles.logoWrap}>
            <View style={styles.logoBox}>
              <Text style={styles.logoEmoji}>🤟</Text>
            </View>
            <Text style={styles.title}>Daktildo</Text>
            <Text style={styles.subtitle}>Вивчай українську жестову мову</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="Логін"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Пароль"
              placeholderTextColor={Colors.textMuted}
              secureTextEntry
              style={styles.input}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              onPress={handleLogin}
              disabled={loading}
              style={[styles.btn, loading && styles.btnDisabled]}
            >
              <Text style={styles.btnText}>
                {loading ? "Вхід..." : "Увійти"}
              </Text>
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Немає акаунта? </Text>
            <Pressable onPress={() => router.push("/(auth)/register")}>
              <Text style={styles.footerLink}>Створити акаунт</Text>
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
    paddingTop: 100,
    paddingBottom: 40,
  },
  logoWrap: { alignItems: "center", marginBottom: 40 },
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
  title: { fontSize: FontSizes.h1, fontWeight: "800", color: Colors.text },
  subtitle: {
    fontSize: FontSizes.base,
    color: Colors.textMuted,
    marginTop: 6,
  },
  form: { gap: 12 },
  input: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: FontSizes.lg,
    color: Colors.text,
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
