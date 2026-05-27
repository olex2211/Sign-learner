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
import { StatusPill } from "../../src/components/StatusPill";
import { LoadingView } from "../../src/components/StateViews";
import { Colors, Radius, FontSizes } from "../../src/constants/theme";

const DAYS = ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "НД"];

function getDayOfWeek(date: Date) {
  const d = date.getDay();
  return d === 0 ? 6 : d - 1;
}

function getWeekDates(today: Date) {
  const dow = getDayOfWeek(today);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - dow + i);
    return d;
  });
}

export default function HomeScreen() {
  const router = useRouter();
  const { user, stats, lessons, progress } = useAuth();

  const today = new Date();
  const weekDates = getWeekDates(today);
  const todayIdx = getDayOfWeek(today);

  if (!user || !stats) {
    return <LoadingView />;
  }

  const masteredCount = progress.filter((p) => p.status === "mastered").length;
  const sortedLessons = [...lessons].sort((a, b) => a.order - b.order);

  const inProgressLesson = sortedLessons.find((l) => {
    const prog = progress.find((p) => p.lesson_id === l.lesson_id);
    return prog && prog.status === "in_progress";
  });
  const nextNotStarted = sortedLessons.find((l) => {
    const prog = progress.find((p) => p.lesson_id === l.lesson_id);
    return !prog || prog.status === "not_started";
  });
  const nextLesson = inProgressLesson || nextNotStarted;
  const nextProgress = nextLesson
    ? progress.find((p) => p.lesson_id === nextLesson.lesson_id)
    : null;

  const recentLessons = sortedLessons.slice(0, 4);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.px}>
          <Text style={styles.greeting}>
            Привіт,{" "}
            <Text style={styles.username}>{user.username}!</Text>
          </Text>
        </View>

        {/* Week strip */}
        <View style={[styles.px, styles.weekRow]}>
          {weekDates.map((date, i) => {
            const isToday = i === todayIdx;
            return (
              <View key={i} style={styles.dayCol}>
                <Text style={styles.dayName}>{DAYS[i]}</Text>
                <View
                  style={[
                    styles.dayCircle,
                    isToday
                      ? styles.dayCircleToday
                      : i < todayIdx
                      ? styles.dayCirclePast
                      : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayNum,
                      isToday
                        ? styles.dayNumToday
                        : i < todayIdx
                        ? styles.dayNumPast
                        : null,
                    ]}
                  >
                    {date.getDate()}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Stats row */}
        <View style={[styles.px, styles.statsRow]}>
          <View style={[styles.statCard, { backgroundColor: Colors.greenLight }]}>
            <Text style={styles.statEmoji}>⭐</Text>
            <View>
              <Text style={styles.statLabel}>XP</Text>
              <Text style={styles.statValue}>{stats.experience_points}</Text>
            </View>
          </View>
          <View style={[styles.statCard, { backgroundColor: Colors.warningBg }]}>
            <Text style={styles.statEmoji}>🔥</Text>
            <View>
              <Text style={styles.statLabel}>Streak</Text>
              <Text style={styles.statValue}>{stats.current_streak} дн</Text>
            </View>
          </View>
          <View style={[styles.statCard, { backgroundColor: Colors.infoBg }]}>
            <Text style={styles.statEmoji}>📖</Text>
            <View>
              <Text style={styles.statLabel}>Вивчено</Text>
              <Text style={styles.statValue}>
                {masteredCount}/{lessons.length || 33}
              </Text>
            </View>
          </View>
        </View>

        {/* Motivational tip */}
        <View style={styles.px}>
          <View style={[styles.tipCard, { backgroundColor: Colors.greenLight }]}>
            <Text style={styles.tipEmoji}>🤟</Text>
            <Text style={styles.tipText}>
              Практикуй щодня — навіть 10 хвилин дадуть результат!
            </Text>
          </View>
        </View>

        {/* Next lesson CTA */}
        {nextLesson && (
          <View style={styles.px}>
            <Text style={styles.sectionLabel}>Продовжити навчання</Text>
            <Pressable
              onPress={() => router.push(`/lessons/${nextLesson.lesson_id}`)}
              style={styles.nextLessonCard}
            >
              <View style={styles.nextLessonLeft}>
                <View style={styles.nextLessonLetterBox}>
                  <Text style={styles.nextLessonLetter}>
                    {nextProgress?.symbol ??
                      nextLesson.title.replace("Буква ", "")}
                  </Text>
                </View>
                <View style={styles.nextLessonInfo}>
                  <Text style={styles.nextLessonTitle}>{nextLesson.title}</Text>
                  <Text style={styles.nextLessonSub}>
                    Прогрес: {nextProgress?.successful_attempts ?? 0}/
                    {nextProgress?.required_attempts ?? 2}
                  </Text>
                  <View style={{ marginTop: 4, width: 120 }}>
                    <GestureProgressBar
                      value={nextProgress?.successful_attempts ?? 0}
                      max={nextProgress?.required_attempts ?? 2}
                      light
                    />
                  </View>
                </View>
              </View>
              <Text style={styles.arrowText}>→</Text>
            </Pressable>
          </View>
        )}

        {!nextLesson && lessons.length > 0 && (
          <View style={styles.px}>
            <View style={[styles.tipCard, { backgroundColor: Colors.greenLight }]}>
              <Text style={styles.tipEmoji}>🎉</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.completedTitle}>Алфавіт завершено!</Text>
                <Text style={styles.completedSub}>
                  Повтори жести у словнику
                </Text>
                <Pressable
                  onPress={() => router.push("/(tabs)/dictionary")}
                  style={styles.dictBtn}
                >
                  <Text style={styles.dictBtnText}>Повторити алфавіт</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {/* Recent letters */}
        <View style={[styles.px, { marginBottom: 20 }]}>
          <Text style={styles.sectionLabel}>Останні букви</Text>
          <View style={{ gap: 8 }}>
            {recentLessons.map((lesson) => {
              const prog = progress.find(
                (p) => p.lesson_id === lesson.lesson_id
              );
              const symbol = prog?.symbol ?? lesson.title.replace("Буква ", "");
              return (
                <Pressable
                  key={lesson.lesson_id}
                  onPress={() => router.push(`/lessons/${lesson.lesson_id}`)}
                  style={styles.recentCard}
                >
                  <View
                    style={[
                      styles.recentLetterBox,
                      {
                        backgroundColor:
                          prog?.status === "mastered"
                            ? Colors.green
                            : Colors.greenLight,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.recentLetter,
                        {
                          color:
                            prog?.status === "mastered" ? "#fff" : Colors.dark,
                        },
                      ]}
                    >
                      {symbol}
                    </Text>
                  </View>
                  <View style={styles.recentInfo}>
                    <View style={styles.recentRow}>
                      <Text style={styles.recentTitle}>{lesson.title}</Text>
                      {prog && <StatusPill status={prog.status} small />}
                    </View>
                    <GestureProgressBar
                      value={prog?.successful_attempts ?? 0}
                      max={prog?.required_attempts ?? 2}
                    />
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  px: { paddingHorizontal: 16, marginBottom: 12 },

  greeting: { fontSize: FontSizes.h1, fontWeight: "400", color: Colors.text, paddingTop: 16 },
  username: { fontWeight: "800" },

  weekRow: { flexDirection: "row", justifyContent: "space-between" },
  dayCol: { alignItems: "center", gap: 4 },
  dayName: { fontSize: 10, fontWeight: "600", color: Colors.textLight },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircleToday: { backgroundColor: Colors.dark, borderRadius: 10 },
  dayCirclePast: { backgroundColor: Colors.greenLight },
  dayNum: { fontSize: 12, fontWeight: "700", color: "#555" },
  dayNumToday: { color: "#fff" },
  dayNumPast: { color: Colors.green },

  statsRow: { flexDirection: "row", gap: 8 },
  statCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: Radius.xl,
  },
  statEmoji: { fontSize: 16 },
  statLabel: { fontSize: 10, color: Colors.textMuted },
  statValue: { fontSize: FontSizes.lg, fontWeight: "700", color: Colors.text },

  tipCard: {
    borderRadius: Radius.xxl,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  tipEmoji: { fontSize: 32 },
  tipText: { fontSize: FontSizes.sm, color: "#3a3a3a", lineHeight: 18, flex: 1 },

  sectionLabel: {
    fontSize: FontSizes.sm,
    fontWeight: "600",
    color: Colors.textMuted,
    marginBottom: 8,
  },

  nextLessonCard: {
    backgroundColor: Colors.dark,
    borderRadius: Radius.xxl,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  nextLessonLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  nextLessonLetterBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  nextLessonLetter: {
    fontSize: 26,
    fontWeight: "800",
    color: "#fff",
  },
  nextLessonInfo: {},
  nextLessonTitle: { color: "#fff", fontWeight: "700", fontSize: FontSizes.lg },
  nextLessonSub: { color: "#b0b0b0", fontSize: 12, marginTop: 2 },
  arrowText: { color: "#fff", fontSize: 20 },

  completedTitle: { fontWeight: "700", fontSize: FontSizes.xl, color: Colors.text },
  completedSub: { fontSize: FontSizes.sm, color: Colors.textMuted, marginTop: 2 },
  dictBtn: {
    backgroundColor: Colors.greenDark,
    borderRadius: Radius.pill,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignSelf: "flex-start",
    marginTop: 10,
  },
  dictBtnText: { color: "#fff", fontWeight: "700", fontSize: FontSizes.md },

  recentCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  recentLetterBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  recentLetter: { fontSize: 20, fontWeight: "800" },
  recentInfo: { flex: 1 },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  recentTitle: { fontWeight: "600", fontSize: FontSizes.md, color: Colors.text },
});
