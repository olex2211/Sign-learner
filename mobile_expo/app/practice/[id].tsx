import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from "react-native";
import { Image } from "expo-image";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../src/auth/AuthContext";
import { getLesson } from "../../src/api/lessons";
import { getGesture } from "../../src/api/gestures";
import { predictGesture } from "../../src/api/ml";
import { recordPracticeAttempt, skipPracticeLesson } from "../../src/api/practice";
import { resolveMediaUrl } from "../../src/api/media";
import type { Gesture, LessonDetail, PracticeAttemptResponse } from "../../src/api/types";
import { GestureProgressBar } from "../../src/components/GestureProgressBar";
import {
  advancePracticeQueue,
  clearPracticeQueue,
  ensurePracticeQueue,
} from "../../src/utils/practiceSession";
import { Colors, Radius, FontSizes, GESTURE_EMOJI } from "../../src/constants/theme";

type PracticeState =
  | "permission_unknown"
  | "permission_denied"
  | "ready"
  | "capturing"
  | "predicting"
  | "submitting"
  | "success_partial"
  | "success_completed"
  | "wrong_gesture"
  | "low_confidence"
  | "no_hand"
  | "ml_unavailable"
  | "network_error";

const AUTO_CHECK_STATES: PracticeState[] = [
  "ready",
  "wrong_gesture",
  "low_confidence",
  "no_hand",
];
const AUTO_CHECK_INTERVAL_MS = 1800;

export default function PracticeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { lessons, progress, refreshData } = useAuth();

  const [permission, requestPermission] = useCameraPermissions();
  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [gesture, setGesture] = useState<Gesture | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [practiceState, setPracticeState] = useState<PracticeState>("ready");
  const [isProcessingCheck, setIsProcessingCheck] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [required, setRequired] = useState(2);
  const [xpEarned, setXpEarned] = useState(0);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [predictedGesture, setPredictedGesture] = useState("");
  const [isReferenceOpen, setIsReferenceOpen] = useState(false);

  const cameraRef = useRef<CameraView>(null);
  const isCheckingRef = useRef(false);
  const stateRef = useRef<PracticeState>("ready");
  const checkRef = useRef<() => void>(() => {});

  const lessonId = parseInt(id ?? "0", 10);

  // Sync state ref
  useEffect(() => {
    stateRef.current = practiceState;
  }, [practiceState]);

  // Load lesson + gesture
  useEffect(() => {
    if (!lessonId) return;
    setLoadingData(true);
    setPracticeState("ready");
    setFeedbackMessage("");
    setPredictedGesture("");
    setXpEarned(0);

    getLesson(lessonId)
      .then(async (loaded) => {
        setLesson(loaded);
        const g = await getGesture(loaded.gesture_id);
        setGesture(g);
      })
      .catch(() => {})
      .finally(() => setLoadingData(false));
  }, [lessonId]);

  // Sync progress
  useEffect(() => {
    if (!lessonId) return;
    const p = progress.find((p) => p.lesson_id === lessonId);
    if (p) {
      setAttempts(p.successful_attempts);
      setRequired(p.required_attempts);
    } else {
      setAttempts(0);
      setRequired(2);
    }
  }, [lessonId, progress]);

  // Ensure queue
  useEffect(() => {
    if (!lessonId || lessons.length === 0) return;
    ensurePracticeQueue(lessons, progress, lessonId);
  }, [lessonId, lessons, progress]);

  // Auto-check interval
  useEffect(() => {
    if (loadingData || !lesson || !lessonId) return;

    const intervalId = setInterval(() => {
      if (!AUTO_CHECK_STATES.includes(stateRef.current)) return;
      if (isCheckingRef.current) return;
      if (!cameraRef.current) return;
      checkRef.current();
    }, AUTO_CHECK_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [loadingData, lesson, lessonId]);

  const prog = progress.find((p) => p.lesson_id === lessonId);
  const symbol = prog?.symbol ?? lesson?.title.replace("Буква ", "") ?? "?";
  const referenceImage = gesture?.media?.icon ?? gesture?.media?.demo_image ?? null;
  const referenceUrl = resolveMediaUrl(referenceImage?.file_path);
  const demoImage = gesture?.media?.demo_image ?? referenceImage;
  const demoUrl = resolveMediaUrl(demoImage?.file_path);

  function navigateToNextLesson(strategy: "complete" | "reinsert_after_three") {
    const nextId = advancePracticeQueue(
      lessons,
      progress,
      lessonId,
      strategy
    );
    setPracticeState("ready");
    setFeedbackMessage("");
    setPredictedGesture("");
    if (nextId) {
      router.replace(`/practice/${nextId}`);
    } else {
      clearPracticeQueue();
      router.replace("/(tabs)/lessons");
    }
  }

  async function handleCheck() {
    if (isCheckingRef.current) return;
    if (!cameraRef.current) return;
    isCheckingRef.current = true;

    try {
      setIsProcessingCheck(true);

      // Take picture
      let photo;
      try {
        photo = await cameraRef.current.takePictureAsync({
          quality: 0.7,
          base64: false,
          shutterSound: false,
        });
      } catch {
        setPracticeState("no_hand");
        setFeedbackMessage("Не вдалося зробити знімок.");
        return;
      }

      if (!photo?.uri) {
        setPracticeState("no_hand");
        setFeedbackMessage("Не вдалося захопити кадр.");
        return;
      }

      let prediction;
      try {
        prediction = await predictGesture(photo.uri);
      } catch (err: any) {
        if (err?.status === 422) {
          setPracticeState("no_hand");
          setFeedbackMessage("Руку не видно в кадрі.");
          return;
        }
        if (err?.status === 503) {
          setPracticeState("ml_unavailable");
          setFeedbackMessage("Розпізнавання тимчасово недоступне.");
          return;
        }
        setPracticeState("network_error");
        setFeedbackMessage("Помилка мережі. Спробуйте ще.");
        return;
      }

      setPredictedGesture(prediction.gesture);

      let attemptResult: PracticeAttemptResponse;
      try {
        attemptResult = await recordPracticeAttempt(lessonId, {
          predicted_gesture: prediction.gesture,
          confidence: prediction.confidence,
        });
      } catch {
        setPracticeState("network_error");
        setFeedbackMessage("Не вдалося зберегти результат.");
        return;
      }

      setAttempts(attemptResult.successful_attempts);
      setRequired(attemptResult.required_attempts);

      let waitTime = 0;

      if (attemptResult.success) {
        setXpEarned(
          (prev) =>
            prev +
            attemptResult.attempt_xp_earned +
            attemptResult.completion_bonus_xp
        );
        if (attemptResult.is_completed) {
          setPracticeState("success_completed");
          setFeedbackMessage(
            `Прогрес жесту: ${attemptResult.successful_attempts}/${attemptResult.required_attempts}\n+${attemptResult.attempt_xp_earned + attemptResult.completion_bonus_xp} XP`
          );
        } else {
          setPracticeState("success_partial");
          setFeedbackMessage(
            `Прогрес жесту: ${attemptResult.successful_attempts}/${attemptResult.required_attempts}\n+${attemptResult.attempt_xp_earned} XP\nПовторимо цю букву трохи пізніше.`
          );
        }
      } else {
        if (prediction.confidence < 0.75) {
          setPracticeState("low_confidence");
          setFeedbackMessage("Майже. Покажи жест чіткіше.");
        } else {
          setPracticeState("wrong_gesture");
          setFeedbackMessage(
            `Схоже на «${prediction.gesture.toUpperCase()}». Потренуй «${symbol.toUpperCase()}» ще раз.`
          );
        }
        waitTime = 3000;
      }

      await refreshData();
      setIsProcessingCheck(false);
      
      if (waitTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    } catch {
      setPracticeState("network_error");
      setFeedbackMessage("Неочікувана помилка.");
    } finally {
      isCheckingRef.current = false;
      setIsProcessingCheck(false);
    }
  }

  checkRef.current = handleCheck;

  async function handleSkip() {
    try {
      await skipPracticeLesson(lessonId);
      await refreshData();
      navigateToNextLesson("reinsert_after_three");
    } catch {
      clearPracticeQueue();
      router.replace("/(tabs)/lessons");
    }
  }

  // ── Permission states ──
  if (!permission) {
    return (
      <View style={styles.darkCenter}>
        <ActivityIndicator color={Colors.green} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.darkCenter]}>
        <Text style={styles.permTitle}>Потрібен доступ до камери</Text>
        <Text style={styles.permSub}>
          Для практики жестів потрібна камера.
        </Text>
        <Pressable onPress={requestPermission} style={styles.permBtn}>
          <Text style={styles.permBtnText}>Надати доступ</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} style={styles.permBack}>
          <Text style={styles.permBackText}>Назад</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (loadingData || !lesson) {
    return (
      <View style={styles.darkCenter}>
        <ActivityIndicator color={Colors.green} />
      </View>
    );
  }

  const isProcessing = isProcessingCheck;

  const feedbackConfig: Record<
    string,
    { title: string; color: string; emoji: string } | null
  > = {
    ready: null,
    capturing: null,
    predicting: null,
    submitting: null,
    success_partial: {
      title: "Добре!",
      color: Colors.greenDark,
      emoji: "✅",
    },
    success_completed: {
      title: "Жест закріплено! 🎉",
      color: Colors.greenDark,
      emoji: "🏆",
    },
    wrong_gesture: {
      title: "Не той жест",
      color: Colors.error,
      emoji: "❌",
    },
    low_confidence: {
      title: "Майже!",
      color: Colors.warning,
      emoji: "🔄",
    },
    no_hand: {
      title: "Руку не видно",
      color: Colors.textMuted,
      emoji: "📷",
    },
    ml_unavailable: {
      title: "ML недоступний",
      color: Colors.textMuted,
      emoji: "⚠️",
    },
    network_error: {
      title: "Помилка мережі",
      color: Colors.error,
      emoji: "🔌",
    },
  };

  const feedback = feedbackConfig[practiceState];

  return (
    <View style={styles.screenDark}>
      {/* Top bar */}
      <SafeAreaView edges={["top"]}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backArrow}>←</Text>
          </Pressable>
          <View style={styles.topInfo}>
            <Text style={styles.topTitle}>Буква {symbol}</Text>
            <Text style={styles.topSub}>
              Прогрес жесту: {attempts}/{required}
            </Text>
          </View>
          <View style={styles.topProgress}>
            <GestureProgressBar value={attempts} max={required} light />
          </View>
        </View>
      </SafeAreaView>

      {/* Camera */}
      <View style={styles.cameraWrap}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="front"
        />

        {/* Reference PiP */}
        <Pressable
          onPress={() => {
            if (demoUrl) {
              setIsReferenceOpen(true);
            }
          }}
          disabled={!demoUrl}
          style={({ pressed }) => [
            styles.pip,
            pressed && demoUrl ? styles.pipPressed : null,
          ]}
        >
          {referenceUrl ? (
            <Image
              source={{ uri: referenceUrl }}
              style={styles.pipImage}
              contentFit={referenceImage?.role === "icon" ? "contain" : "cover"}
            />
          ) : (
            <>
              <Text style={styles.pipEmoji}>{GESTURE_EMOJI[symbol] ?? "🤟"}</Text>
              <Text style={styles.pipLetter}>{symbol}</Text>
            </>
          )}
        </Pressable>
      </View>

      <Modal
        visible={isReferenceOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsReferenceOpen(false)}
      >
        <Pressable
          style={styles.referenceModalBackdrop}
          onPress={() => setIsReferenceOpen(false)}
        >
          <Pressable style={styles.referenceModalCard}>
            <Pressable
              onPress={() => setIsReferenceOpen(false)}
              style={styles.referenceCloseBtn}
            >
              <Text style={styles.referenceCloseText}>×</Text>
            </Pressable>
            {demoUrl ? (
              <Image
                source={{ uri: demoUrl }}
                style={styles.referenceModalImage}
                contentFit={demoImage?.role === "icon" ? "contain" : "cover"}
              />
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Bottom panel */}
      <SafeAreaView edges={["bottom"]} style={styles.bottomPanel}>
        {feedback ? (
          <View
            style={[
              styles.feedbackCard,
              { backgroundColor: feedback.color + "18" },
            ]}
          >
            <Text style={styles.feedbackEmoji}>{feedback.emoji}</Text>
            <View style={styles.feedbackTexts}>
              <Text style={[styles.feedbackTitle, { color: feedback.color }]}>
                {feedback.title}
              </Text>
              {feedbackMessage.split("\n").map((line, i) => (
                <Text key={i} style={styles.feedbackLine}>
                  {line}
                </Text>
              ))}
            </View>
          </View>
        ) : (
          <Text style={styles.readyHint}>
            Покажи жест у кадрі — камера перевірить його автоматично
          </Text>
        )}

        <View style={styles.btnRow}>
          {/* Ready / retryable states */}
          {(practiceState === "ready" ||
            practiceState === "low_confidence" ||
            practiceState === "no_hand" ||
            practiceState === "ml_unavailable" ||
            practiceState === "network_error") && (
            <>
              <Pressable
                onPress={handleCheck}
                disabled={isProcessing}
                style={[styles.primaryBtn, isProcessing && { opacity: 0.5 }]}
              >
                <Text style={styles.primaryBtnText}>{isProcessing ? "Перевіряю..." : "Перевірити"}</Text>
              </Pressable>
              <Pressable onPress={handleSkip} style={styles.secondaryBtn}>
                <Text style={styles.secondaryBtnText}>⏩ Пропустити</Text>
              </Pressable>
            </>
          )}

          {practiceState === "wrong_gesture" && (
            <Pressable
              onPress={() => {
                setPracticeState("ready");
                setFeedbackMessage("");
                setPredictedGesture("");
              }}
              style={styles.primaryBtn}
            >
              <Text style={styles.primaryBtnText}>Спробувати ще</Text>
            </Pressable>
          )}

          {(practiceState === "success_partial" ||
            practiceState === "success_completed") && (
            <>
              <Pressable
                onPress={() =>
                  navigateToNextLesson(
                    practiceState === "success_completed"
                      ? "complete"
                      : "reinsert_after_three"
                  )
                }
                style={styles.primaryBtn}
              >
                <Text style={styles.primaryBtnText}>Наступна буква</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  clearPracticeQueue();
                  router.replace("/(tabs)/lessons");
                }}
                style={styles.secondaryBtn}
              >
                <Text style={styles.secondaryBtnText}>Завершити</Text>
              </Pressable>
            </>
          )}

        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenDark: { flex: 1, backgroundColor: Colors.dark },
  darkCenter: {
    flex: 1,
    backgroundColor: Colors.dark,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 24,
  },

  permTitle: {
    color: "#fff",
    fontSize: FontSizes.h3,
    fontWeight: "700",
    textAlign: "center",
  },
  permSub: {
    color: "#b0b0b0",
    fontSize: FontSizes.md,
    textAlign: "center",
  },
  permBtn: {
    backgroundColor: Colors.greenDark,
    borderRadius: Radius.pill,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  permBtnText: { color: "#fff", fontWeight: "700", fontSize: FontSizes.lg },
  permBack: { marginTop: 8 },
  permBackText: { color: "#b0b0b0", fontSize: FontSizes.md },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  backArrow: { fontSize: 18, color: "#fff" },
  topInfo: { flex: 1 },
  topTitle: { color: "#fff", fontWeight: "700", fontSize: FontSizes.xl },
  topSub: { color: "#b0b0b0", fontSize: 12 },
  topProgress: { width: 80 },

  cameraWrap: {
    flex: 1,
    marginHorizontal: 12,
    borderRadius: 24,
    overflow: "hidden",
    position: "relative",
  },
  camera: { flex: 1 },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  overlayCard: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  overlayText: { color: "#fff", fontSize: FontSizes.md, fontWeight: "600" },

  pip: {
    position: "absolute",
    bottom: 12,
    right: 12,
    width: 72,
    height: 72,
    borderRadius: 14,
    backgroundColor: Colors.greenDark,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  pipPressed: { opacity: 0.75 },
  pipImage: { width: "100%", height: "100%" },
  pipEmoji: { fontSize: 28 },
  pipLetter: {
    fontSize: 11,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "700",
  },
  referenceModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.82)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  referenceModalCard: {
    width: "100%",
    maxWidth: 420,
    aspectRatio: 0.72,
    borderRadius: 18,
    backgroundColor: Colors.bg,
    overflow: "hidden",
  },
  referenceModalImage: {
    width: "100%",
    height: "100%",
  },
  referenceCloseBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 2,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  referenceCloseText: {
    color: "#fff",
    fontSize: 30,
    lineHeight: 32,
  },

  bottomPanel: {
    backgroundColor: Colors.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingTop: 14,
    marginTop: 6,
    gap: 12,
  },

  feedbackCard: {
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  feedbackEmoji: { fontSize: 24 },
  feedbackTexts: { flex: 1 },
  feedbackTitle: { fontWeight: "700", fontSize: FontSizes.lg },
  feedbackLine: { fontSize: FontSizes.sm, color: "#444", lineHeight: 20 },

  readyHint: {
    color: Colors.textMuted,
    fontSize: FontSizes.md,
    textAlign: "center",
  },

  btnRow: { flexDirection: "row", gap: 10 },
  primaryBtn: {
    flex: 1,
    backgroundColor: Colors.greenDark,
    borderRadius: Radius.pill,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: FontSizes.lg,
    fontWeight: "700",
  },
  secondaryBtn: {
    backgroundColor: Colors.card,
    borderRadius: Radius.pill,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: "center",
  },
  secondaryBtnText: {
    color: Colors.textMuted,
    fontSize: FontSizes.lg,
    fontWeight: "600",
  },
  processingPlaceholder: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.pill,
    paddingVertical: 14,
    alignItems: "center",
  },
  processingText: { fontSize: FontSizes.lg, color: Colors.textMuted },
});
