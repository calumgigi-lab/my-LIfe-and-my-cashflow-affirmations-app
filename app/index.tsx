import React, { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet, useColorScheme } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { useThemeColors } from "@/constants/colors";

export default function IndexScreen() {
  const { user, isLoading } = useAuth();
  const scheme = useColorScheme();
  const colors = useThemeColors(scheme);

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        router.replace("/(main)");
      } else {
        router.replace("/(auth)/login");
      }
    }
  }, [isLoading, user]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.gold} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
});
