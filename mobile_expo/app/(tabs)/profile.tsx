import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../src/auth/AuthContext";
import { LoadingView } from "../../src/components/StateViews";
import { Colors, Radius, FontSizes } from "../../src/constants/theme";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, stats, progress, logout } = useAuth();

  if (!user || !stats) {
    return <LoadingView />;
  }

  const masteredCount = progress.filter((p) => p.status === "mastered").length;

  function handleLogout() {
    Alert.alert("Вийти", "Ви точно хочете вийти?", [
      { text: "Скасувати", style: "cancel" },
      {
        text: "Вийти",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  }

  const statItems = [
    {
      emoji: "⭐",
      label: "XP",
      value: String(stats.experience_points),
      bg: Colors.greenLight,
    },
    {
      emoji: "🔥",
      label: "Streak",
      value: `${stats.current_streak} дн`,
      bg: Colors.warningBg,
    },
    {
      emoji: "📈",
      label: "Рівень",
      value: String(stats.level),
      bg: Colors.infoBg,
    },
    {
      emoji: "🎓",
      label: "Вивчено",
      value: `${masteredCount}/33`,
      bg: Colors.greenLight,
    },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarBox}>
            <Text style={styles.avatarEmoji}>🤟</Text>
          </View>
          <Text style={styles.username}>{user.username}</Text>
          <Text style={styles.email}>{user.email}</Text>
          <Text style={styles.since}>
            З нами з{" "}
            {new Date(user.created_at).toLocaleDateString("uk-UA", {
              month: "long",
              year: "numeric",
            })}
          </Text>
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          {statItems.map(({ emoji, label, value, bg }, i) => (
            <View key={i} style={[styles.statCard, { backgroundColor: bg }]}>
              <Text style={styles.statEmoji}>{emoji}</Text>
              <View>
                <Text style={styles.statLabel}>{label}</Text>
                <Text style={styles.statValue}>{value}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Menu */}
        <View style={styles.menu}>
          <Pressable
            onPress={() => router.push("/achievements")}
            style={styles.menuItem}
          >
            <View style={styles.menuLeft}>
              <Text style={styles.menuEmoji}>🏆</Text>
              <View>
                <Text style={styles.menuTitle}>Досягнення</Text>
                <Text style={styles.menuSub}>
                  Отримано {stats.achievements_count}
                </Text>
              </View>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>

          <Pressable style={[styles.menuItem, { opacity: 0.6 }]}>
            <View style={styles.menuLeft}>
              <Text style={styles.menuEmoji}>✏️</Text>
              <Text style={styles.menuTitle}>Редагувати профіль</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>

          <Pressable onPress={handleLogout} style={styles.logoutItem}>
            <Text style={styles.logoutEmoji}>🚪</Text>
            <Text style={styles.logoutText}>Вийти</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },

  avatarSection: {
    alignItems: "center",
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  avatarBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: Colors.greenDark,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarEmoji: { fontSize: 36 },
  username: { fontSize: FontSizes.h2, fontWeight: "800", color: Colors.text },
  email: { fontSize: FontSizes.sm, color: Colors.textMuted, marginTop: 2 },
  since: { fontSize: 12, color: Colors.textLight, marginTop: 2 },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: Radius.lg,
  },
  statEmoji: { fontSize: 18 },
  statLabel: { fontSize: FontSizes.xs, color: Colors.textMuted },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
  },

  menu: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 32,
  },
  menuItem: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  menuLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  menuEmoji: { fontSize: 20 },
  menuTitle: { fontWeight: "600", fontSize: FontSizes.md, color: Colors.text },
  menuSub: { fontSize: 12, color: Colors.textMuted },
  chevron: { fontSize: 20, color: Colors.textLight },

  logoutItem: {
    backgroundColor: "#fde8e8",
    borderRadius: Radius.lg,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logoutEmoji: { fontSize: 20 },
  logoutText: { fontWeight: "600", fontSize: FontSizes.md, color: Colors.error },
});
