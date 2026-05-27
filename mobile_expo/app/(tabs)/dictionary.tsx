import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../src/auth/AuthContext";
import { getGestures } from "../../src/api/gestures";
import { resolveMediaUrl } from "../../src/api/media";
import type { Gesture } from "../../src/api/types";
import { GestureProgressBar } from "../../src/components/GestureProgressBar";
import { ComplexityBadge } from "../../src/components/ComplexityBadge";
import { LoadingView } from "../../src/components/StateViews";
import { Colors, Radius, FontSizes, GESTURE_EMOJI } from "../../src/constants/theme";

const SCREEN_W = Dimensions.get("window").width;
const CARD_W = (SCREEN_W - 48) / 2;

export default function DictionaryScreen() {
  const router = useRouter();
  const { lessons, progress } = useAuth();
  const [gestures, setGestures] = useState<Gesture[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getGestures()
      .then(setGestures)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const masteredCount = progress.filter((p) => p.status === "mastered").length;
  const totalCount = gestures.length || lessons.length || 33;

  if (loading) return <LoadingView />;

  const sorted = [...gestures].sort((a, b) => {
    const lA = lessons.find((l) => l.gesture_id === a.gesture_id);
    const lB = lessons.find((l) => l.gesture_id === b.gesture_id);
    if (lA && lB) return lA.order - lB.order;
    return 0;
  });

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.h1}>Жести</Text>
        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${(masteredCount / totalCount) * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.progressLabel}>
            {masteredCount}/{totalCount}
          </Text>
        </View>
      </View>

      <FlatList
        data={sorted}
        keyExtractor={(item) => String(item.gesture_id)}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        renderItem={({ item: gesture }) => {
          const lesson = lessons.find(
            (l) => l.gesture_id === gesture.gesture_id
          );
          const prog = lesson
            ? progress.find((p) => p.lesson_id === lesson.lesson_id)
            : null;
          const isMastered = prog?.status === "mastered";
          const iconUrl = resolveMediaUrl(gesture.media?.icon?.file_path);

          return (
            <Pressable
              onPress={() => router.push(`/dictionary/${gesture.gesture_id}`)}
              style={[
                styles.card,
                isMastered && styles.cardMastered,
                { width: CARD_W },
              ]}
            >
              {/* Image area */}
              <View
                style={[
                  styles.imageArea,
                  {
                    backgroundColor: isMastered ? Colors.green : Colors.greenLight,
                  },
                ]}
              >
                {iconUrl ? (
                  <Image
                    source={{ uri: iconUrl }}
                    style={styles.gestureImage}
                    contentFit="contain"
                  />
                ) : (
                  <Text style={styles.fallbackEmoji}>
                    {GESTURE_EMOJI[gesture.symbol] ?? "🤟"}
                  </Text>
                )}
                {isMastered && (
                  <View style={styles.masteredBadge}>
                    <Text style={styles.masteredCheck}>✓</Text>
                  </View>
                )}
              </View>

              {/* Info */}
              <View style={styles.info}>
                <View style={styles.infoRow}>
                  <Text style={styles.symbol}>{gesture.symbol}</Text>
                  <ComplexityBadge complexity={gesture.complexity} />
                </View>
                {prog && (
                  <GestureProgressBar
                    value={prog.successful_attempts}
                    max={prog.required_attempts}
                  />
                )}
              </View>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  h1: { fontSize: FontSizes.h1, fontWeight: "800", color: Colors.text },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 4,
    backgroundColor: Colors.greenLight,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.green,
    borderRadius: 4,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textMuted,
  },
  grid: { paddingHorizontal: 16, paddingBottom: 24 },
  row: { gap: 12, marginBottom: 12 },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
  },
  cardMastered: { borderColor: Colors.green },
  imageArea: {
    height: 90,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  gestureImage: { width: 70, height: 70 },
  fallbackEmoji: { fontSize: 42 },
  masteredBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.greenDark,
    alignItems: "center",
    justifyContent: "center",
  },
  masteredCheck: { color: "#fff", fontSize: 11, fontWeight: "700" },
  info: { padding: 10 },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  symbol: {
    fontSize: 22,
    fontWeight: "900",
    color: Colors.text,
  },
});
