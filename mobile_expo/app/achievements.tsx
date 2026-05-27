import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { getAchievements, getMyAchievements } from "../src/api/achievements";
import { resolveMediaUrl } from "../src/api/media";
import type { Achievement, UserAchievement } from "../src/api/types";
import { LoadingView } from "../src/components/StateViews";
import { Colors, Radius, FontSizes } from "../src/constants/theme";

const DEFAULT_ICONS = ["🏆", "🔥", "📚", "👋", "⚡", "💪", "🎯", "✨"];

interface MergedAchievement extends Achievement {
  earned: boolean;
  earned_at?: string;
}

export default function AchievementsScreen() {
  const router = useRouter();
  const [achievements, setAchievements] = useState<MergedAchievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [all, mine] = await Promise.all([
          getAchievements(),
          getMyAchievements(),
        ]);

        const myMap = new Map<number, UserAchievement>();
        mine.forEach((a) => myMap.set(a.achievement_id, a));

        const merged: MergedAchievement[] = all.map((a) => ({
          ...a,
          earned: myMap.has(a.achievement_id),
          earned_at: myMap.get(a.achievement_id)?.earned_at,
        }));

        setAchievements(merged);
      } catch {
        // show empty
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return <LoadingView />;

  const earnedCount = achievements.filter((a) => a.earned).length;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <View>
          <Text style={styles.h2}>Досягнення</Text>
          <Text style={styles.subtitle}>
            Отримано {earnedCount} з {achievements.length}
          </Text>
        </View>
      </View>

      <FlatList
        data={achievements}
        keyExtractor={(item) => String(item.achievement_id)}
        contentContainerStyle={styles.list}
        renderItem={({ item: ach, index: idx }) => {
          const iconUrl = resolveMediaUrl(ach.icon_path);
          return (
            <View
              style={[
                styles.item,
                ach.earned && styles.itemEarned,
                !ach.earned && styles.itemLocked,
              ]}
            >
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: ach.earned ? Colors.greenLight : "#eee" },
                ]}
              >
                {iconUrl ? (
                  <Image
                    source={{ uri: iconUrl }}
                    style={styles.iconImage}
                    contentFit="cover"
                  />
                ) : (
                  <Text style={styles.iconEmoji}>
                    {DEFAULT_ICONS[idx % DEFAULT_ICONS.length]}
                  </Text>
                )}
              </View>
              <View style={styles.achInfo}>
                <Text style={styles.achName}>{ach.name}</Text>
                <Text style={styles.achDesc}>{ach.description}</Text>
                {ach.earned && ach.earned_at && (
                  <Text style={styles.earnedDate}>
                    Отримано{" "}
                    {new Date(ach.earned_at).toLocaleDateString("uk-UA")}
                  </Text>
                )}
              </View>
              {ach.earned && (
                <View style={styles.checkBadge}>
                  <Text style={styles.checkText}>✓</Text>
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Досягнення поки відсутні</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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
  h2: { fontSize: FontSizes.h3, fontWeight: "800", color: Colors.text },
  subtitle: { fontSize: 12, color: Colors.textMuted },

  list: { padding: 16, gap: 10, paddingBottom: 40 },

  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: Radius.xl,
    padding: 16,
    borderWidth: 2,
    borderColor: "transparent",
  },
  itemEarned: {
    backgroundColor: Colors.card,
    borderColor: Colors.greenLight,
  },
  itemLocked: {
    backgroundColor: "#f7f7f7",
    opacity: 0.55,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  iconImage: { width: "100%", height: "100%" },
  iconEmoji: { fontSize: 28 },

  achInfo: { flex: 1 },
  achName: { fontWeight: "700", fontSize: FontSizes.lg, color: Colors.text },
  achDesc: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  earnedDate: {
    fontSize: 11,
    color: Colors.green,
    marginTop: 4,
    fontWeight: "600",
  },

  checkBadge: {
    backgroundColor: "#d4f0d8",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  checkText: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.greenDark,
  },

  empty: { alignItems: "center", paddingTop: 40 },
  emptyText: { color: Colors.textMuted, fontSize: FontSizes.md },
});
