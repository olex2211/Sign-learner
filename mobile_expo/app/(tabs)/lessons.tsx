import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../src/auth/AuthContext";
import { GestureProgressBar } from "../../src/components/GestureProgressBar";
import { LoadingView } from "../../src/components/StateViews";
import { Colors, Radius, FontSizes } from "../../src/constants/theme";

export default function LessonsScreen() {
  const router = useRouter();
  const { stats, lessons, progress } = useAuth();

  if (!stats || lessons.length === 0) {
    return <LoadingView />;
  }

  const sortedLessons = [...lessons].sort((a, b) => a.order - b.order);
  const masteredCount = progress.filter((p) => p.status === "mastered").length;

  const currentProgress =
    progress.find((p) => p.status === "in_progress") ??
    progress.find((p) => p.status === "not_started") ??
    progress[0];

  const currentLesson = currentProgress
    ? sortedLessons.find((l) => l.lesson_id === currentProgress.lesson_id)
    : sortedLessons[0];

  const currentIdx = currentLesson
    ? sortedLessons.findIndex((l) => l.lesson_id === currentLesson.lesson_id)
    : 0;

  const upcoming = sortedLessons.slice(currentIdx, currentIdx + 4);
  const reviewProgress = progress.find((p) => p.status === "mastered");

  type QueueItem = {
    symbol: string;
    lesson_id: number;
    kind: "current" | "next" | "review";
  };
  const queue: QueueItem[] = upcoming.map((l, i) => {
    const prog = progress.find((p) => p.lesson_id === l.lesson_id);
    return {
      symbol: prog?.symbol ?? l.title.replace("Буква ", ""),
      lesson_id: l.lesson_id,
      kind: i === 0 ? "current" : "next",
    };
  });
  if (reviewProgress) {
    queue.push({
      symbol: reviewProgress.symbol,
      lesson_id: reviewProgress.lesson_id,
      kind: "review",
    });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.h1}>Навчання</Text>
          <View style={styles.streakBadge}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <Text style={styles.streakNum}>{stats.current_streak}</Text>
            <Text style={styles.streakLabel}>дн.</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>
            ⭐ {stats.experience_points} XP
          </Text>
          <Text style={styles.metaDot}>•</Text>
          <Text style={styles.metaText}>Рівень {stats.level}</Text>
          <Text style={styles.metaDot}>•</Text>
          <Text style={styles.metaText}>
            {masteredCount}/{lessons.length || 33} букв
          </Text>
        </View>

        {/* Hero card */}
        {currentLesson && currentProgress && (
          <View style={styles.px}>
            <View style={styles.heroCard}>
              <View style={styles.heroTopRow}>
                <Text style={styles.heroTag}>Наступний крок у навчанні</Text>
                <Text style={styles.heroPos}>
                  Урок {currentIdx + 1}/{lessons.length || 33}
                </Text>
              </View>

              <View style={styles.heroContent}>
                <View style={styles.heroLetterBox}>
                  <Text style={styles.heroLetter}>{currentProgress.symbol}</Text>
                </View>
                <View style={styles.heroInfo}>
                  <Text style={styles.heroSmall}>Поточна буква</Text>
                  <Text style={styles.heroTitle}>{currentLesson.title}</Text>
                  <Text style={styles.heroDesc}>
                    Повторимо цю букву ще раз, щоб закріпити жест.
                  </Text>
                </View>
              </View>

              <View style={styles.heroProgressRow}>
                <Text style={styles.heroProgressLabel}>
                  Прогрес жесту: {currentProgress.successful_attempts}/
                  {currentProgress.required_attempts}
                </Text>
                <Text style={styles.heroProgressSub}>
                  ще{" "}
                  {Math.max(
                    0,
                    currentProgress.required_attempts -
                      currentProgress.successful_attempts
                  )}{" "}
                  спроб
                </Text>
              </View>
              <View style={{ marginTop: 6 }}>
                <GestureProgressBar
                  value={currentProgress.successful_attempts}
                  max={currentProgress.required_attempts}
                  light
                />
              </View>

              <Pressable
                onPress={() =>
                  router.push(`/lessons/${currentLesson.lesson_id}`)
                }
                style={styles.heroCTA}
              >
                <Text style={styles.heroCTAText}>▶ Продовжити навчання</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Queue */}
        <View style={{ marginTop: 16 }}>
          <View style={styles.queueHeader}>
            <Text style={styles.queueTitle}>Черга навчання</Text>
            <Text style={styles.queueSub}>
              Послідовність букв у поточній сесії
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.queueScroll}
          >
            {queue.map((q, i) => {
              const isCurrent = q.kind === "current";
              const isReview = q.kind === "review";
              return (
                <React.Fragment key={`${q.lesson_id}-${i}`}>
                  <Pressable
                    onPress={() => router.push(`/lessons/${q.lesson_id}`)}
                    style={[
                      styles.queueItem,
                      isCurrent
                        ? styles.queueItemCurrent
                        : isReview
                        ? styles.queueItemReview
                        : styles.queueItemNext,
                    ]}
                  >
                    <Text
                      style={[
                        styles.queueLetter,
                        isCurrent && styles.queueLetterWhite,
                      ]}
                    >
                      {q.symbol}
                    </Text>
                    <Text
                      style={[
                        styles.queueKind,
                        isCurrent && styles.queueLetterWhite,
                      ]}
                    >
                      {isCurrent ? "зараз" : isReview ? "повтор" : `№${i + 1}`}
                    </Text>
                    {isReview && (
                      <View style={styles.reviewBadge}>
                        <Text style={{ color: "#fff", fontSize: 10 }}>↺</Text>
                      </View>
                    )}
                  </Pressable>
                  {i < queue.length - 1 && (
                    <Text style={styles.queueArrow}>›</Text>
                  )}
                </React.Fragment>
              );
            })}
          </ScrollView>
        </View>

        {/* Alphabet progress */}
        <View style={[styles.px, { marginTop: 24, marginBottom: 12 }]}>
          <View style={styles.alphabetHeader}>
            <Text style={styles.queueTitle}>Прогрес алфавіту</Text>
            <Text style={styles.alphabetPercent}>
              {lessons.length > 0
                ? Math.round((masteredCount / lessons.length) * 100)
                : 0}
              %
            </Text>
          </View>
          <View style={styles.alphabetDots}>
            {sortedLessons.map((l) => {
              const p = progress.find((pp) => pp.lesson_id === l.lesson_id);
              const isMastered = p?.status === "mastered";
              const isCurrent = currentLesson && l.lesson_id === currentLesson.lesson_id;
              return (
                <View
                  key={l.lesson_id}
                  style={[
                    styles.alphabetDot,
                    {
                      height: isCurrent ? 14 : 8,
                      backgroundColor: isMastered
                        ? Colors.green
                        : isCurrent
                        ? Colors.greenDark
                        : p?.lesson_status === "available"
                        ? "#d4d8c2"
                        : "#e6e6da",
                    },
                  ]}
                />
              );
            })}
          </View>
          <View style={styles.alphabetLabels}>
            <Text style={styles.alphabetEdge}>А</Text>
            <Text style={styles.alphabetMid}>
              Вивчено {masteredCount} з {lessons.length || 33}
            </Text>
            <Text style={styles.alphabetEdge}>Я</Text>
          </View>
        </View>

        {/* Dictionary link */}
        <View style={[styles.px, { marginBottom: 24 }]}>
          <Pressable
            onPress={() => router.push("/(tabs)/dictionary")}
            style={styles.dictLink}
          >
            <Text style={styles.dictLinkText}>
              🔤 Переглянути всі букви у словнику
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  px: { paddingHorizontal: 20 },

  headerRow: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  h1: { fontSize: FontSizes.h1, fontWeight: "800", color: Colors.text },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.white,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.greenLight,
  },
  streakEmoji: { fontSize: 12 },
  streakNum: { fontSize: 12, fontWeight: "700", color: Colors.text },
  streakLabel: { fontSize: 11, color: Colors.textMuted },

  metaRow: {
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
    marginTop: 4,
  },
  metaText: { fontSize: 12, color: Colors.text, fontWeight: "600" },
  metaDot: { color: "#d0d0d0" },

  heroCard: {
    borderRadius: Radius.xxl,
    padding: 18,
    backgroundColor: Colors.greenDark,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  heroTag: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255,255,255,0.9)",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  heroPos: { fontSize: 10, fontWeight: "600", color: "rgba(255,255,255,0.8)" },
  heroContent: { flexDirection: "row", alignItems: "center", gap: 16 },
  heroLetterBox: {
    width: 96,
    height: 96,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroLetter: { fontSize: 52, fontWeight: "800", color: "#fff" },
  heroInfo: { flex: 1 },
  heroSmall: { fontSize: 11, color: "rgba(255,255,255,0.85)", fontWeight: "600" },
  heroTitle: { fontSize: 24, fontWeight: "800", color: "#fff", marginTop: 2 },
  heroDesc: {
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
    marginTop: 4,
    lineHeight: 16,
  },
  heroProgressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    marginBottom: 4,
  },
  heroProgressLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
  },
  heroProgressSub: { fontSize: 11, color: "rgba(255,255,255,0.8)" },
  heroCTA: {
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 14,
  },
  heroCTAText: {
    color: Colors.greenDark,
    fontWeight: "700",
    fontSize: FontSizes.lg,
  },

  queueHeader: { paddingHorizontal: 20, marginBottom: 10 },
  queueTitle: { fontWeight: "700", fontSize: FontSizes.xl, color: Colors.text },
  queueSub: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  queueScroll: { paddingHorizontal: 20, gap: 10, alignItems: "center" },
  queueItem: {
    width: 64,
    height: 80,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    position: "relative",
  },
  queueItemCurrent: {
    backgroundColor: Colors.green,
    borderWidth: 2,
    borderColor: Colors.greenDark,
  },
  queueItemReview: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.green,
    borderStyle: "dashed",
  },
  queueItemNext: { backgroundColor: Colors.card },
  queueLetter: { fontSize: 28, fontWeight: "800", color: Colors.text },
  queueLetterWhite: { color: "#fff" },
  queueKind: {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    color: Colors.text,
  },
  reviewBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  queueArrow: { fontSize: 16, color: "#cfcfcf" },

  alphabetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  alphabetPercent: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.greenDark,
  },
  alphabetDots: {
    flexDirection: "row",
    gap: 3,
    alignItems: "center",
  },
  alphabetDot: {
    flex: 1,
    borderRadius: 3,
    alignSelf: "center",
  },
  alphabetLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  alphabetEdge: { fontSize: 11, color: Colors.textMuted },
  alphabetMid: { fontSize: 11, color: Colors.textMuted },

  dictLink: {
    borderWidth: 1.5,
    borderColor: Colors.greenLight,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  dictLinkText: {
    color: Colors.greenDark,
    fontWeight: "600",
    fontSize: FontSizes.sm,
  },
});
