import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet, useColorScheme, Text } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { useThemeColors } from "@/constants/colors";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

const LOADER_MESSAGES = [
  "creating a new life",
  "building a new world",
];

export default function IndexScreen() {
  const { user, isLoading } = useAuth();
  const scheme = useColorScheme();
  const colors = useThemeColors(scheme);
  const [messageIndex, setMessageIndex] = useState(0);
  const [minDurationElapsed, setMinDurationElapsed] = useState(false);

  // Message rotation interval
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADER_MESSAGES.length);
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  // Ensure loader shows for minimum 5-6 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinDurationElapsed(true);
    }, 5500);

    return () => clearTimeout(timer);
  }, []);

  // Navigate only when both conditions are met
  useEffect(() => {
    if (!isLoading && minDurationElapsed) {
      if (user) {
        router.replace("/(main)");
      } else {
        router.replace("/(auth)/login");
      }
    }
  }, [isLoading, user, minDurationElapsed]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Animated.View key={messageIndex} entering={FadeIn.duration(500)} exiting={FadeOut.duration(300)}>
          <Text
            style={[
              styles.message,
              { color: colors.text, fontFamily: "PlayfairDisplay_700Bold" },
            ]}
          >
            {LOADER_MESSAGES[messageIndex]}
          </Text>
        </Animated.View>

        <View style={styles.loaderSection}>
          <ActivityIndicator size="large" color={colors.gold} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: {
    justifyContent: "center",
    alignItems: "center",
    gap: 40,
  },
  message: {
    fontSize: 24,
    textAlign: "center",
    paddingHorizontal: 20,
    minHeight: 60,
  },
  loaderSection: {
    marginTop: 20,
  },
});
