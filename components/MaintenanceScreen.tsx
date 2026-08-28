import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors } from "@/constants/colors";

export interface MaintenanceInfo {
  enabled: boolean;
  message: string;
  endAt: string | null;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((n) => String(n).padStart(2, "0")).join(":");
}

interface Props {
  maintenance: MaintenanceInfo;
  onRetry: () => void;
  isRetrying?: boolean;
}

export function MaintenanceScreen({ maintenance, onRetry, isRetrying }: Props) {
  const scheme = useColorScheme();
  const colors = useThemeColors(scheme);
  const insets = useSafeAreaInsets();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const endMs = maintenance.endAt ? new Date(maintenance.endAt).getTime() : null;
  const remaining = endMs && !Number.isNaN(endMs) ? endMs - now : null;
  const hasCountdown = remaining !== null && remaining > 0;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.goldLight, borderColor: colors.gold }]}>
        <Ionicons name="construct" size={40} color={colors.gold} />
      </View>

      <Text style={[styles.title, { color: colors.text, fontFamily: "PlayfairDisplay_700Bold" }]}>
        Under Maintenance
      </Text>

      <Text style={[styles.message, { color: colors.textSecondary, fontFamily: "DMSans_400Regular" }]}>
        {maintenance.message}
      </Text>

      {hasCountdown ? (
        <View style={[styles.countdownCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.countdownLabel, { color: colors.textSecondary, fontFamily: "DMSans_500Medium" }]}>
            Estimated time remaining
          </Text>
          <Text style={[styles.countdown, { color: colors.gold, fontFamily: "DMSans_700Bold" }]}>
            {formatCountdown(remaining)}
          </Text>
        </View>
      ) : (
        <Text style={[styles.hint, { color: colors.textSecondary, fontFamily: "DMSans_400Regular" }]}>
          We will be back online as soon as possible. Thank you for your patience.
        </Text>
      )}

      <Pressable
        onPress={onRetry}
        disabled={isRetrying}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: pressed ? colors.tintDark : colors.tint,
            opacity: isRetrying ? 0.7 : 1,
          },
        ]}
      >
        {isRetrying ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <>
            <Ionicons name="refresh" size={18} color={colors.background} />
            <Text style={[styles.buttonText, { color: colors.background, fontFamily: "DMSans_600SemiBold" }]}>
              Check again
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    textAlign: "center",
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    marginBottom: 28,
  },
  countdownCard: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: "center",
    marginBottom: 28,
  },
  countdownLabel: {
    fontSize: 13,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  countdown: {
    fontSize: 36,
    letterSpacing: 2,
  },
  hint: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    minWidth: 160,
    justifyContent: "center",
  },
  buttonText: {
    fontSize: 16,
  },
});
