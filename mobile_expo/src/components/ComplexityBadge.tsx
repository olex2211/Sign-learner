import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { Complexity } from "../api/types";
import { Colors } from "../constants/theme";

interface ComplexityBadgeProps {
  complexity: Complexity;
}

const COMPLEXITY_STYLES: Record<
  Complexity,
  { label: string; bg: string; color: string }
> = {
  easy: { label: "Легко", bg: "#d4f0d8", color: Colors.greenDark },
  medium: { label: "Середньо", bg: "#fff3cd", color: "#c07800" },
  hard: { label: "Важко", bg: "#fde8e8", color: Colors.error },
};

export function ComplexityBadge({ complexity }: ComplexityBadgeProps) {
  const style = COMPLEXITY_STYLES[complexity] ?? COMPLEXITY_STYLES.easy;
  return (
    <View style={[styles.badge, { backgroundColor: style.bg }]}>
      <Text style={[styles.label, { color: style.color }]}>{style.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
  },
});
