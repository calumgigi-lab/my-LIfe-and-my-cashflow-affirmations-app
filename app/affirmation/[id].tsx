import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useColorScheme,
  ScrollView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery, useMutation } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useThemeColors } from "@/constants/colors";
import { apiRequest, queryClient } from "@/lib/query-client";

export default function AffirmationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme();
  const colors = useThemeColors(scheme);
  const insets = useSafeAreaInsets();
  const isDark = scheme === "dark";

  const { data: aff, isLoading } = useQuery<any>({
    queryKey: ["/api/affirmations", id],
  });

  const { data: completionCheck } = useQuery<any>({
    queryKey: ["/api/completions/check", id],
    enabled: !!id,
  });

  const completeMutation = useMutation({
    mutationFn: async (affirmationId: number) => {
      await apiRequest("POST", `/api/affirmations/${affirmationId}/complete`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/completions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/completions/check"] });
      queryClient.invalidateQueries({ queryKey: ["/api/streak"] });
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
  });

  const isCompleted = completionCheck?.completed === true;
  const paragraphs = aff?.content?.split("\n\n") || [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 8,
            backgroundColor: colors.background,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.gold} />
        </View>
      ) : aff ? (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 120 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(600).delay(100)}>
            <View style={[styles.dayBadge, { backgroundColor: colors.gold }]}>
              <Text style={[styles.dayBadgeText, { fontFamily: "DMSans_700Bold" }]}>
                DAY {aff.dayNumber}
              </Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(600).delay(200)}>
            <Text style={[styles.affTitle, { color: colors.text, fontFamily: "PlayfairDisplay_700Bold" }]}>
              {aff.title}
            </Text>
          </Animated.View>

          <View style={[styles.divider, { backgroundColor: colors.gold + "40" }]} />

          {paragraphs.map((paragraph: string, index: number) => (
            <Animated.View
              key={index}
              entering={FadeInUp.duration(600).delay(300 + index * 150)}
            >
              <Text
                style={[
                  styles.paragraph,
                  { color: colors.text, fontFamily: "DMSans_400Regular" },
                ]}
              >
                {paragraph}
              </Text>
            </Animated.View>
          ))}

          <View style={styles.actionSection}>
            {!isCompleted ? (
              <Pressable
                onPress={() => completeMutation.mutate(aff.id)}
                disabled={completeMutation.isPending}
                style={({ pressed }) => [
                  styles.affirmButton,
                  { opacity: pressed ? 0.9 : 1 },
                ]}
              >
                <LinearGradient
                  colors={["#D4A853", "#C8973E", "#A07830"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.affirmButtonGradient}
                >
                  {completeMutation.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={22} color="#fff" />
                      <Text style={[styles.affirmButtonText, { fontFamily: "DMSans_700Bold" }]}>
                        I Have Affirmed
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>
            ) : (
              <View style={[styles.completedBanner, { backgroundColor: isDark ? "#1A2E1A" : "#E8F8E8", borderColor: isDark ? "#2A4A2A" : "#B8E0B8" }]}>
                <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                <Text style={[styles.completedText, { color: colors.success, fontFamily: "DMSans_600SemiBold" }]}>
                  Affirmed for today
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary} />
          <Text style={[styles.errorText, { color: colors.text, fontFamily: "DMSans_600SemiBold" }]}>
            Affirmation not found
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16 },
  scrollContent: { paddingHorizontal: 24 },
  dayBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 16,
  },
  dayBadgeText: { color: "#fff", fontSize: 12, letterSpacing: 1.5 },
  affTitle: { fontSize: 30, lineHeight: 38, marginBottom: 20 },
  divider: { height: 2, borderRadius: 1, marginBottom: 28 },
  paragraph: {
    fontSize: 17,
    lineHeight: 28,
    marginBottom: 24,
  },
  actionSection: { marginTop: 16 },
  affirmButton: {
    borderRadius: 16,
    overflow: "hidden",
  },
  affirmButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    gap: 10,
  },
  affirmButtonText: { color: "#fff", fontSize: 17 },
  completedBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
  },
  completedText: { fontSize: 16 },
  errorText: { fontSize: 18 },
});
