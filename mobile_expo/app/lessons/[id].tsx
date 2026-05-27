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
import { getLesson } from "../../src/api/lessons";
import { getGesture } from "../../src/api/gestures";
import { skipPracticeLesson } from "../../src/api/practice";
import { resolveMediaUrl } from "../../src/api/media";
import type { Gesture, LessonDetail } from "../../src/api/types";
import { GestureProgressBar } from "../../src/components/GestureProgressBar";
import { ComplexityBadge } from "../../src/components/ComplexityBadge";
import { StatusPill } from "../../src/components/StatusPill";
import { LoadingView, ErrorView } from "../../src/components/StateViews";
import {
  advancePracticeQueue,
  clearPracticeQueue,
  ensurePracticeQueue,
} from "../../src/utils/practiceSession";
import { Colors, Radius, FontSizes, GESTURE_EMOJI } from "../../src/constants/theme";

export default function LessonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { lessons, progress, refreshData } = useAuth();

  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [gesture, setGesture] = useState<Gesture | null>(null);
  const [loading, setLoading] = useState(true);
  const [skipping, setSkipping] = useState(false);
  const [error, setError] = useState("");

  const lessonId = parseInt(id ?? "0", 10);

  useEffect(() => {
    if (!lessonId) return;
    setLoading(true);
    setLesson(null);
    setGesture(null);
    getLesson(lessonId)
      .then(async (loaded) => {
        setLesson(loaded);
        const g = await getGesture(loaded.gesture_id);
        setGesture(g);
      })
      .catch(() => setError("Не вдалося завантажити урок"))
      .finally(() => setLoading(false));
  }, [lessonId]);

  useEffect(() => {
    if (!lessonId || lessons.length === 0) return;
    ensurePracticeQueue(lessons, progress, lessonId);
  }, [lessonId, lessons, progress]);

  if (loading) return <LoadingView />;
  if (error || !lesson)
    return (
      <ErrorView
        message={error || "Урок не знайдено"}
        onRetry={() => router.back()}
      />
    );

  const prog = progress.find((p) => p.lesson_id === lessonId);
  const symbol = prog?.symbol ?? lesson.title.replace("Буква ", "");
  const isMastered = prog?.status === "mastered";
  const demoImage = gesture?.media?.demo_image;
  const iconImage = gesture?.media?.icon;
  const demoUrl = resolveMediaUrl(demoImage?.file_path);
  const iconUrl = resolveMediaUrl(iconImage?.file_path);

  async function handleSkip() {
    setSkipping(true);
    try {
      await skipPracticeLesson(lessonId);
      await refreshData();
      const nextId = advancePracticeQueue(
        lessons,
        progress,
        lessonId,
        "reinsert_after_three"
      );
      if (nextId) {
        router.replace(`/lessons/${nextId}`);
      } else {
        clearPracticeQueue();
        router.replace("/(tabs)/lessons");
      }
    } catch {
      setError("Не вдалося пропустити урок");
    } finally {
      setSkipping(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Text style={styles.topTitle} numberOfLines={1}>
          {lesson.title}
        </Text>
        {prog && <StatusPill status={prog.status} />}
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Hero image / letter */}
        <View
          style={[
            styles.heroBox,
            { backgroundColor: isMastered ? Colors.green : Colors.greenLight },
          ]}
        >
          {demoUrl ? (
            <Image
              source={{ uri: demoUrl }}
              style={styles.demoImage}
              contentFit="contain"
            />
          ) : iconUrl ? (
            <Image
              source={{ uri: iconUrl }}
              style={styles.demoImage}
              contentFit="contain"
            />
          ) : (
            <>
              <Text style={[styles.heroLetter, { color: isMastered ? "#fff" : "#2e3a1f" }]}>
                {symbol}
              </Text>
              <Text style={styles.heroEmoji}>{GESTURE_EMOJI[symbol] ?? "🤟"}</Text>
            </>
          )}
          {isMastered && (
            <View style={styles.masteredTag}>
              <Text style={styles.masteredTagText}>✓ Засвоєно</Text>
            </View>
          )}
        </View>

        {/* Description */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Опис жесту</Text>
          <Text style={styles.cardText}>
            {lesson.description || "Опис відсутній"}
          </Text>
        </View>

        {/* Meta */}
        <View style={styles.metaRow}>
          {prog && <ComplexityBadge complexity={prog.complexity} />}
          <View style={styles.orderBadge}>
            <Text style={styles.orderText}>Урок #{lesson.order}</Text>
          </View>
        </View>

        {/* Progress */}
        {prog && (
          <View style={styles.card}>
            <View style={styles.progressRow}>
              <Text style={styles.cardTitle}>Прогрес жесту</Text>
              <Text style={styles.progressFraction}>
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
          <Pressable
            onPress={() => router.push(`/practice/${lesson.lesson_id}`)}
            style={[
              styles.primaryBtn,
              { backgroundColor: isMastered ? Colors.green : Colors.greenDark },
            ]}
          >
            <Text style={styles.primaryBtnText}>
              📷 {isMastered ? "Повторити" : "Практикувати"}
            </Text>
          </Pressable>

          {!isMastered && (
            <Pressable
              onPress={handleSkip}
              disabled={skipping}
              style={[styles.secondaryBtn, skipping && { opacity: 0.7 }]}
            >
              <Text style={styles.secondaryBtnText}>
                {skipping ? "Пропуск..." : "⏩ Пропустити"}
              </Text>
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

  heroBox: {
    borderRadius: Radius.xxl,
    padding: 32,
    alignItems: "center",
    gap: 8,
    minHeight: 180,
    justifyContent: "center",
  },
  demoImage: { width: "100%", height: 160, borderRadius: 16 },
  heroLetter: { fontSize: 80, fontWeight: "900", lineHeight: 88 },
  heroEmoji: { fontSize: 48 },
  masteredTag: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  masteredTagText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },

  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: 16,
    gap: 8,
  },
  cardTitle: { fontWeight: "700", fontSize: FontSizes.md, color: Colors.text },
  cardText: { fontSize: FontSizes.md, color: "#444", lineHeight: 22 },

  metaRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  orderBadge: {
    backgroundColor: Colors.greenLight,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  orderText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.greenDark,
  },

  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressFraction: { fontSize: FontSizes.sm, color: Colors.textMuted },

  actions: { gap: 10, marginTop: 8 },
  primaryBtn: {
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
    color: Colors.textMuted,
    fontSize: FontSizes.lg,
    fontWeight: "600",
  },
});
