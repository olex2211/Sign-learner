import React from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Pressable,
  StyleSheet,
} from "react-native";
import { Colors } from "../constants/theme";

interface LoadingViewProps {
  message?: string;
}

export function LoadingView({ message = "Завантаження..." }: LoadingViewProps) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={Colors.greenDark} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

interface ErrorViewProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorView({
  message = "Щось пішло не так",
  onRetry,
}: ErrorViewProps) {
  return (
    <View style={styles.center}>
      <Text style={styles.errorText}>{message}</Text>
      {onRetry && (
        <Pressable style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryText}>Спробувати знову</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.bg,
    gap: 12,
    padding: 20,
  },
  text: {
    color: Colors.textMuted,
    fontSize: 14,
  },
  errorText: {
    color: Colors.textMuted,
    fontSize: 14,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: Colors.greenDark,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryText: {
    color: Colors.white,
    fontWeight: "700",
    fontSize: 14,
  },
});
