import React from "react";
import { View, StyleSheet } from "react-native";
import { Colors } from "../constants/theme";

interface GestureProgressBarProps {
  value: number;
  max: number;
  light?: boolean;
}

export function GestureProgressBar({
  value,
  max,
  light = false,
}: GestureProgressBarProps) {
  const safeMax = Math.max(max, 1);
  const safeValue = Math.min(value, safeMax);
  const percent = safeValue / safeMax;

  return (
    <View
      style={[
        styles.track,
        { backgroundColor: light ? "rgba(255,255,255,0.28)" : Colors.greenLight },
      ]}
    >
      <View
        style={[
          styles.fill,
          {
            width: `${percent * 100}%` as any,
            backgroundColor: light ? "#fff" : Colors.green,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 6,
    borderRadius: 4,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 4,
  },
});
