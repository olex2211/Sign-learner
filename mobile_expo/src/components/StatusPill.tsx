import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { ProgressStatus } from "../api/types";
import { Colors } from "../constants/theme";

interface StatusPillProps {
  status: ProgressStatus;
  small?: boolean;
}

const STATUS_CONFIG: Record<
  ProgressStatus,
  { label: string; bg: string; color: string }
> = {
  not_started: { label: "Нова", bg: "#f0f0f0", color: Colors.textMuted },
  in_progress: { label: "Практика", bg: Colors.warningBg, color: "#c07800" },
  mastered: { label: "Засвоєно", bg: "#d4f0d8", color: Colors.greenDark },
};

export function StatusPill({ status, small = false }: StatusPillProps) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.not_started;
  return (
    <View style={[styles.pill, { backgroundColor: cfg.bg }]}>
      <Text
        style={[
          styles.label,
          { color: cfg.color, fontSize: small ? 10 : 11 },
        ]}
      >
        {cfg.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  label: {
    fontWeight: "600",
  },
});
