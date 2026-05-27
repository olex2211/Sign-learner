import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, SkipForward, Camera, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getGesture } from "../../api/gestures";
import { getLesson } from "../../api/lessons";
import { predictGesture } from "../../api/ml";
import { recordPracticeAttempt, skipPracticeLesson } from "../../api/practice";
import { resolveMediaUrl } from "../../api/media";
import type { Gesture, LessonDetail, PracticeAttemptResponse } from "../../api/types";
import { GestureProgressBar } from "../GestureProgressBar";
import { advancePracticeQueue, clearPracticeQueue, ensurePracticeQueue } from "../../utils/practiceSession";

const SL = {
  bg: "#f8faec",
  green: "#4fa65b",
  greenDark: "#2e9d3e",
  greenLight: "#eaeed3",
  card: "#f1f1f1",
  dark: "#333",
  ff: "'Libre Franklin', sans-serif",
};

type PracticeState =
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

const GESTURE_EMOJI: Record<string, string> = {
  А:"🤚",Б:"✋",В:"🖖",Г:"👆",Ґ:"✊",Д:"🤙",Е:"👐",Є:"🙌",
  Ж:"👋",З:"🤞",И:"☝️",І:"👆",Ї:"🤟",Й:"🤘",К:"✌️",Л:"👌",
  М:"🤏",Н:"🖐",О:"👊",П:"🤜",Р:"🤛",С:"👍",Т:"👎",У:"🤙",
  Ф:"🤳",Х:"🤝",Ц:"👏",Ч:"🙏",Ш:"🤲",Щ:"🫶",Ь:"🫳",Ю:"🫴",Я:"🫵",
};

const AUTO_CHECK_INTERVAL_MS = 1400;
const AUTO_CHECK_STATES: PracticeState[] = ["ready", "wrong_gesture", "low_confidence", "no_hand"];

export function PracticeScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { lessons, progress, refreshData } = useAuth();

  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [gesture, setGesture] = useState<Gesture | null>(null);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<PracticeState>("ready");
  const [attempts, setAttempts] = useState(0);
  const [required, setRequired] = useState(2);
  const [xpEarned, setXpEarned] = useState(0);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [predictedGesture, setPredictedGesture] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isCheckingRef = useRef(false);
  const checkRef = useRef<() => void>(() => {});
  const stateRef = useRef<PracticeState>("ready");

  const lessonId = parseInt(id ?? "0", 10);

  const attachStreamToVideo = useCallback(async (video: HTMLVideoElement | null) => {
    if (!video || !streamRef.current) return;
    if (video.srcObject !== streamRef.current) {
      video.srcObject = streamRef.current;
    }
    if (video.paused || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      await video.play().catch(() => {});
    }
  }, []);

  const setVideoElement = useCallback((video: HTMLVideoElement | null) => {
    videoRef.current = video;
    attachStreamToVideo(video);
  }, [attachStreamToVideo]);

  // Load a new lesson when the route changes, and reset temporary practice UI state.
  useEffect(() => {
    if (!lessonId) return;
    setLoading(true);
    setState("ready");
    setFeedbackMessage("");
    setPredictedGesture("");
    setXpEarned(0);

    getLesson(lessonId)
      .then(async (loadedLesson) => {
        setLesson(loadedLesson);
        const loadedGesture = await getGesture(loadedLesson.gesture_id);
        setGesture(loadedGesture);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [lessonId]);

  useEffect(() => {
    if (!lessonId) return;
    const lessonProgress = progress.find(p => p.lesson_id === lessonId);
    if (lessonProgress) {
      setAttempts(lessonProgress.successful_attempts);
      setRequired(lessonProgress.required_attempts);
      return;
    }
    setAttempts(0);
    setRequired(2);
  }, [lessonId, progress]);

  useEffect(() => {
    if (!lessonId || lessons.length === 0) return;
    ensurePracticeQueue(lessons, progress, lessonId);
  }, [lessonId, lessons, progress]);

  // Start camera
  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: 640, height: 480 },
        });
        streamRef.current = stream;
        await attachStreamToVideo(videoRef.current);
      } catch {
        // Camera not available — practice will still work with "Перевірити" sending a blank frame
      }
    }
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [attachStreamToVideo]);

  useEffect(() => {
    attachStreamToVideo(videoRef.current);
  }, [attachStreamToVideo, lesson, lessonId, state]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (loading || !lesson || !lessonId) return;

    const intervalId = window.setInterval(() => {
      if (!AUTO_CHECK_STATES.includes(stateRef.current)) return;
      if (isCheckingRef.current) return;
      if (!streamRef.current || !videoRef.current) return;

      checkRef.current();
    }, AUTO_CHECK_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [loading, lesson, lessonId]);

  if (loading || !lesson) {
    return (
      <div className="flex items-center justify-center h-full" style={{ background: SL.dark, fontFamily: SL.ff }}>
        <p style={{ fontFamily: SL.ff, color: "#b0b0b0" }}>Завантаження...</p>
      </div>
    );
  }

  const prog = progress.find(p => p.lesson_id === lessonId);
  const symbol = prog?.symbol ?? lesson.title.replace("Буква ", "");
  const isCompleted = attempts >= required;
  const referenceImage = gesture?.media?.icon ?? gesture?.media?.demo_image ?? null;

  function resetPracticePanel() {
    setState("ready");
    setFeedbackMessage("");
    setPredictedGesture("");
  }

  function navigateToNextLesson(strategy: "complete" | "reinsert_after_three") {
    const nextLessonId = advancePracticeQueue(lessons, progress, lessonId, strategy);
    if (nextLessonId) {
      resetPracticePanel();
      navigate(`/practice/${nextLessonId}`);
      return;
    }
    clearPracticeQueue();
    navigate("/lessons");
  }

  async function captureFrame(): Promise<Blob | null> {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth || !video.videoHeight) {
      return null;
    }

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);

    return new Promise<Blob | null>(resolve => {
      canvas.toBlob(blob => resolve(blob), "image/jpeg", 0.85);
    });
  }

  async function handleCheck() {
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;

    try {
      const frame = await captureFrame();
      if (!frame) {
        setState("no_hand");
        setFeedbackMessage("Не вдалося захопити кадр. Спробуйте ще.");
        return;
      }

      let prediction;
      try {
        prediction = await predictGesture(frame);
      } catch (err: any) {
        if (err?.response?.status === 422) {
          setState("no_hand");
          setFeedbackMessage("Руку не видно в кадрі.");
          return;
        }
        console.error("[practice] gesture prediction failed", err);
        if (err?.code === "LOCAL_ML_UNAVAILABLE" || err?.response?.status === 503 || err?.code === "ERR_NETWORK") {
          setState("ml_unavailable");
          setFeedbackMessage(err?.message ? `Локальне розпізнавання: ${err.message}` : "Розпізнавання тимчасово недоступне.");
          return;
        }
        setState("network_error");
        setFeedbackMessage("Помилка мережі. Спробуйте ще.");
        return;
      }

      setPredictedGesture(prediction.gesture);
      setState("submitting");

      let attemptResult: PracticeAttemptResponse;
      try {
        attemptResult = await recordPracticeAttempt(lessonId, {
          predicted_gesture: prediction.gesture,
          confidence: prediction.confidence,
        });
      } catch (err) {
        console.error("[practice] saving practice attempt failed", err);
        setState("network_error");
        setFeedbackMessage("Не вдалося зберегти результат.");
        return;
      }

      // Update local state from authoritative backend response
      setAttempts(attemptResult.successful_attempts);
      setRequired(attemptResult.required_attempts);

      if (attemptResult.success) {
        setXpEarned(prev => prev + attemptResult.attempt_xp_earned + attemptResult.completion_bonus_xp);
        if (attemptResult.is_completed) {
          setState("success_completed");
          setFeedbackMessage(
            `Прогрес жесту: ${attemptResult.successful_attempts}/${attemptResult.required_attempts}\n+${attemptResult.attempt_xp_earned + attemptResult.completion_bonus_xp} XP`
          );
        } else {
          setState("success_partial");
          setFeedbackMessage(
            `Прогрес жесту: ${attemptResult.successful_attempts}/${attemptResult.required_attempts}\n+${attemptResult.attempt_xp_earned} XP\nПовторимо цю букву трохи пізніше.`
          );
        }
      } else {
        if (prediction.confidence < 0.75) {
          setState("low_confidence");
          setFeedbackMessage("Майже. Покажи жест чіткіше.");
        } else {
          setState("wrong_gesture");
          setFeedbackMessage(`Схоже на «${prediction.gesture.toUpperCase()}». Потренуй «${symbol.toUpperCase()}» ще раз.`);
        }
      }

      // Refresh global data so the next screen reads authoritative progress
      await refreshData();

    } catch {
      setState("network_error");
      setFeedbackMessage("Неочікувана помилка.");
    } finally {
      isCheckingRef.current = false;
    }
  }

  checkRef.current = handleCheck;

  function handleRetry() {
    setState("ready");
    setFeedbackMessage("");
    setPredictedGesture("");
  }

  async function handleSkip() {
    try {
      await skipPracticeLesson(lessonId);
      await refreshData();
      navigateToNextLesson("reinsert_after_three");
    } catch {
      clearPracticeQueue();
      navigate("/lessons");
    }
  }

  function handleNextLesson() {
    navigateToNextLesson("reinsert_after_three");
  }

  function handleCompletedNextLesson() {
    navigateToNextLesson("complete");
  }

  function handleFinish() {
    clearPracticeQueue();
    navigate("/lessons");
  }

  const feedbackContent: Record<PracticeState, { title: string; color: string; icon: React.ReactNode } | null> = {
    ready: null,
    capturing: null,
    predicting: null,
    submitting: null,
    success_partial: {
      title: "Добре!",
      color: SL.greenDark,
      icon: <CheckCircle2 size={28} stroke="#fff" fill={SL.greenDark} />,
    },
    success_completed: {
      title: "Жест закріплено! 🎉",
      color: SL.greenDark,
      icon: <CheckCircle2 size={28} stroke="#fff" fill={SL.greenDark} />,
    },
    wrong_gesture: {
      title: "Не той жест",
      color: "#d4183d",
      icon: <XCircle size={28} stroke="#fff" fill="#d4183d" />,
    },
    low_confidence: {
      title: "Майже!",
      color: "#c07800",
      icon: <RefreshCw size={24} stroke="#c07800" />,
    },
    no_hand: {
      title: "Рука не видна",
      color: "#717182",
      icon: <Camera size={24} stroke="#717182" />,
    },
    ml_unavailable: {
      title: "ML недоступний",
      color: "#717182",
      icon: <XCircle size={24} stroke="#717182" />,
    },
    network_error: {
      title: "Помилка мережі",
      color: "#d4183d",
      icon: <XCircle size={24} stroke="#d4183d" />,
    },
  };

  const feedback = feedbackContent[state];
  const isProcessing = state === "capturing" || state === "predicting" || state === "submitting";

  return (
    <div className="flex flex-col h-full" style={{ background: SL.dark, fontFamily: SL.ff }}>
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 pt-8 pb-3">
        <button
          onClick={() => navigate(-1)}
          style={{ background: "rgba(255,255,255,0.12)", border: "none", borderRadius: 12, padding: "8px 10px", cursor: "pointer" }}
        >
          <ArrowLeft size={18} stroke="#fff" />
        </button>
        <div className="flex-1">
          <p style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>Буква {symbol}</p>
          <p style={{ color: "#b0b0b0", fontSize: 12 }}>
            Прогрес жесту: {attempts}/{required}
          </p>
        </div>
        <div style={{ width: 80 }}>
          <GestureProgressBar value={attempts} max={required} />
        </div>
      </div>

      {/* Camera area */}
      <div
        className="mx-4 rounded-3xl overflow-hidden relative flex items-center justify-center"
        style={{ flex: 1, background: "#222", minHeight: 0 }}
      >
        <video
          ref={setVideoElement}
          autoPlay
          playsInline
          muted
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: "scaleX(-1)",
          }}
        />
        <canvas ref={canvasRef} style={{ display: "none" }} />

        {isProcessing && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                background: "rgba(255,255,255,0.1)",
                borderRadius: 12,
                padding: "12px 20px",
              }}
            >
              <p style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>
                {state === "capturing" ? "Знімаю кадр..." : state === "predicting" ? "Розпізнаю жест..." : "Зберігаю..."}
              </p>
            </div>
          </div>
        )}

        {/* Reference PiP */}
        <div
          style={{
            position: "absolute",
            bottom: 12,
            right: 12,
            background: SL.greenDark,
            borderRadius: 14,
            width: 72,
            height: 72,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
            overflow: "hidden",
          }}
        >
          {referenceImage ? (
            <img
              src={resolveMediaUrl(referenceImage.file_path)}
              alt={symbol}
              style={{ width: "100%", height: "100%", objectFit: referenceImage.role === "icon" ? "contain" : "cover" }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <>
              <span style={{ fontSize: 28 }}>{GESTURE_EMOJI[symbol] ?? "🤟"}</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", fontWeight: 700 }}>
                {symbol}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Bottom panel */}
      <div
        style={{
          background: SL.bg,
          borderRadius: "20px 20px 0 0",
          padding: "16px 16px 24px",
          marginTop: 8,
        }}
      >
        {feedback ? (
          <div className="mb-3">
            <div
              style={{
                background: feedback.color + "18",
                borderRadius: 14,
                padding: "12px 14px",
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              {feedback.icon}
              <div>
                <p style={{ fontWeight: 700, fontSize: 15, color: feedback.color }}>
                  {feedback.title}
                </p>
                {feedbackMessage.split("\n").map((line, i) => (
                  <p key={i} style={{ fontSize: 13, color: "#444", lineHeight: 1.5 }}>{line}</p>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p style={{ color: "#717182", fontSize: 14, textAlign: "center", marginBottom: 12 }}>
            Покажи жест у кадрі — камера перевірить його автоматично
          </p>
        )}

        <div className="flex gap-2">
          {(state === "ready" || state === "low_confidence" || state === "no_hand" || state === "ml_unavailable" || state === "network_error") && (
            <>
              <button
                onClick={handleCheck}
                disabled={isProcessing}
                style={{
                  flex: 1,
                  background: SL.greenDark,
                  color: "#fff",
                  border: "none",
                  borderRadius: 45,
                  padding: "14px",
                  fontSize: 15,
                  fontWeight: 700,
                  fontFamily: SL.ff,
                  cursor: "pointer",
                }}
              >
                Перевірити
              </button>
              <button
                onClick={handleSkip}
                style={{
                  background: SL.card,
                  color: "#717182",
                  border: "none",
                  borderRadius: 45,
                  padding: "14px 18px",
                  fontSize: 15,
                  fontWeight: 600,
                  fontFamily: SL.ff,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <SkipForward size={16} />
                Пропустити
              </button>
            </>
          )}

          {state === "wrong_gesture" && (
            <button
              onClick={handleRetry}
              style={{
                flex: 1,
                background: SL.greenDark,
                color: "#fff",
                border: "none",
                borderRadius: 45,
                padding: "14px",
                fontSize: 15,
                fontWeight: 700,
                fontFamily: SL.ff,
                cursor: "pointer",
              }}
            >
              Спробувати ще
            </button>
          )}

          {state === "success_partial" && (
            <>
              <button
                onClick={handleNextLesson}
                style={{
                  flex: 1,
                  background: SL.greenDark,
                  color: "#fff",
                  border: "none",
                  borderRadius: 45,
                  padding: "14px",
                  fontSize: 15,
                  fontWeight: 700,
                  fontFamily: SL.ff,
                  cursor: "pointer",
                }}
              >
                Наступна буква
              </button>
              <button
                onClick={handleFinish}
                style={{
                  background: SL.card,
                  color: "#717182",
                  border: "none",
                  borderRadius: 45,
                  padding: "14px 18px",
                  fontSize: 15,
                  fontWeight: 600,
                  fontFamily: SL.ff,
                  cursor: "pointer",
                }}
              >
                Завершити
              </button>
            </>
          )}

          {state === "success_completed" && (
            <>
              <button
                onClick={handleCompletedNextLesson}
                style={{
                  flex: 1,
                  background: SL.greenDark,
                  color: "#fff",
                  border: "none",
                  borderRadius: 45,
                  padding: "14px",
                  fontSize: 15,
                  fontWeight: 700,
                  fontFamily: SL.ff,
                  cursor: "pointer",
                }}
              >
                Наступна буква
              </button>
              <button
                onClick={handleFinish}
                style={{
                  background: SL.card,
                  color: "#717182",
                  border: "none",
                  borderRadius: 45,
                  padding: "14px 18px",
                  fontSize: 15,
                  fontWeight: 600,
                  fontFamily: SL.ff,
                  cursor: "pointer",
                }}
              >
                Завершити
              </button>
            </>
          )}

          {isProcessing && (
            <div
              style={{
                flex: 1,
                background: SL.card,
                borderRadius: 45,
                padding: "14px",
                textAlign: "center",
                fontSize: 15,
                color: "#717182",
              }}
            >
              Обробка...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
