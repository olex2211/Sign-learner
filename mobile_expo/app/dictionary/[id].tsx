import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../src/auth/AuthContext";
import { getGesture } from "../../src/api/gestures";
import { resolveMediaUrl } from "../../src/api/media";
import type { Gesture } from "../../src/api/types";
import { GestureProgressBar } from "../../src/components/GestureProgressBar";
import { ComplexityBadge } from "../../src/components/ComplexityBadge";
import { StatusPill } from "../../src/components/StatusPill";
import { LoadingView, ErrorView } from "../../src/components/StateViews";
import { Colors, Radius, FontSizes, GESTURE_EMOJI } from "../../src/constants/theme";

export default function GesturePreviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { lessons, progress } = useAuth();

  const [gesture, setGesture] = useState<Gesture | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const gestureId = parseInt(id ?? "0", 10);

  useEffect(() => {
    if (!gestureId) return;
    getGesture(gestureId)
      .then(setGesture)
      .catch(() => setError("Жест не знайдено"))
      .finally(() => setLoading(false));
  }, [gestureId]);

  if (loading) return <LoadingView />;
  if (error || !gesture)
    return <ErrorView message={error || "Жест не знайдено"} onRetry={() => router.back()} />;

  const lesson = lessons.find((l) => l.gesture_id === gesture.gesture_id);
  const prog = lesson
    ? progress.find((p) => p.lesson_id === lesson.lesson_id)
    : null;
  const isMastered = prog?.status === "mastered";

  const iconUrl = resolveMediaUrl(gesture.media?.icon?.file_path);
  const demoUrl = resolveMediaUrl(gesture.media?.demo_image?.file_path);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Text style={styles.topTitle}>Буква {gesture.symbol}</Text>
        {prog && <StatusPill status={prog.status} />}
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Large icon */}
        <View
          style={[
            styles.iconBox,
            { backgroundColor: isMastered ? Colors.green : Colors.greenLight },
          ]}
        >
          {iconUrl ? (
            <Image
              source={{ uri: iconUrl }}
              style={styles.iconImage}
              contentFit="contain"
            />
          ) : (
            <Text style={styles.fallbackEmoji}>
              {GESTURE_EMOJI[gesture.symbol] ?? "🤟"}
            </Text>
          )}
          <Text
            style={[
              styles.bigLetter,
              { color: isMastered ? "#fff" : "#2e3a1f" },
            ]}
          >
            {gesture.symbol}
          </Text>
        </View>

        {/* Demo image */}
        {demoUrl && (
          <View style={styles.demoCard}>
            <Image
              source={{ uri: demoUrl }}
              style={styles.demoImage}
              contentFit="contain"
            />
          </View>
        )}

        {/* Meta */}
        <View style={styles.metaRow}>
          <ComplexityBadge complexity={gesture.complexity} />
          {isMastered && (
            <View style={styles.masteredBadge}>
              <Text style={styles.masteredText}>✓ Засвоєно</Text>
            </View>
          )}
        </View>

        {/* Description */}
        {lesson?.description && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Опис</Text>
            <Text style={styles.cardText}>{lesson.description}</Text>
          </View>
        )}

        {/* Progress */}
        {prog && (
          <View style={styles.card}>
            <View style={styles.progressRow}>
              <Text style={styles.cardTitle}>Прогрес жесту</Text>
              <Text style={styles.progressFrac}>
                {prog.successful_attempts}/{prog.required_attempts}
              </Text>
            </View>
            <GestureProgressBar
              value={prog.successful_attempts}
              max={prog.required_attempts}
            />
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          {lesson && (
            <Pressable
              onPress={() => router.push(`/practice/${lesson.lesson_id}`)}
              style={styles.primaryBtn}
            >
              <Text style={styles.primaryBtnText}>
                📷 {isMastered ? "Повторити" : "Практикувати"}
              </Text>
            </Pressable>
          )}
          {lesson && (
            <Pressable
              onPress={() => router.push(`/lessons/${lesson.lesson_id}`)}
              style={styles.secondaryBtn}
            >
              <Text style={styles.secondaryBtnText}>📖 Перейти до уроку</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  backBtn: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  backArrow: { fontSize: 18, color: Colors.dark },
  topTitle: {
    flex: 1,
    fontSize: FontSizes.xxl,
    fontWeight: "700",
    color: Colors.text,
  },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 14, paddingBottom: 40 },

  iconBox: {
    borderRadius: Radius.xxl,
    padding: 40,
    alignItems: "center",
    gap: 8,
  },
  iconImage: { width: 116, height: 116 },
  fallbackEmoji: { fontSize: 56 },
  bigLetter: { fontSize: 64, fontWeight: "900", lineHeight: 70 },

  demoCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: 12,
  },
  demoImage: { width: "100%", height: 260, borderRadius: 14 },

  metaRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  masteredBadge: {
    backgroundColor: "#d4f0d8",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  masteredText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.greenDark,
  },

  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: 16,
    gap: 8,
  },
  cardTitle: { fontWeight: "700", fontSize: FontSizes.md, color: Colors.text },
  cardText: { fontSize: FontSizes.md, color: "#444", lineHeight: 22 },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressFrac: { fontSize: FontSizes.sm, color: Colors.textMuted },

  actions: { gap: 10, marginTop: 8 },
  primaryBtn: {
    backgroundColor: Colors.greenDark,
    borderRadius: Radius.pill,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: FontSizes.xl,
    fontWeight: "700",
  },
  secondaryBtn: {
    backgroundColor: Colors.card,
    borderRadius: Radius.pill,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryBtnText: {
    color: Colors.dark,
    fontSize: FontSizes.lg,
    fontWeight: "600",
  },
});
