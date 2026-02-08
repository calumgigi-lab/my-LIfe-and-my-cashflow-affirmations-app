import React, { useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useColorScheme,
  ScrollView,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery, useMutation } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useAuth } from "@/lib/auth-context";
import { useThemeColors } from "@/constants/colors";
import { apiRequest, queryClient } from "@/lib/query-client";

export default function TodayScreen() {
  const { user } = useAuth();
  const scheme = useColorScheme();
  const colors = useThemeColors(scheme);
  const insets = useSafeAreaInsets();
  const isDark = scheme === "dark";

  const { data: todayAff, isLoading: affLoading, refetch: refetchAff } = useQuery<any>({
    queryKey: ["/api/affirmations/today"],
  });

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery<any>({
    queryKey: ["/api/stats"],
  });

  const { data: completionCheck } = useQuery<any>({
    queryKey: ["/api/completions/check", todayAff?.id?.toString()],
    enabled: !!todayAff?.id,
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
  const isLoading = affLoading || statsLoading;

  const onRefresh = useCallback(() => {
    refetchAff();
    refetchStats();
  }, []);

  const now = new Date();
  const greeting = now.getHours() < 12 ? "Good Morning" : now.getHours() < 17 ? "Good Afternoon" : "Good Evening";
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 16,
            paddingBottom: 120,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={colors.gold} />
        }
      >
        <Animated.View entering={FadeInDown.duration(600).delay(100)}>
          <Text style={[styles.greeting, { color: colors.textSecondary, fontFamily: "DMSans_500Medium" }]}>
            {greeting}
          </Text>
          <Text style={[styles.userName, { color: colors.text, fontFamily: "PlayfairDisplay_700Bold" }]}>
            {user?.displayName || user?.username}
          </Text>
          <Text style={[styles.dateText, { color: colors.textSecondary, fontFamily: "DMSans_400Regular" }]}>
            {dayNames[now.getDay()]}, {monthNames[now.getMonth()]} {now.getDate()}
          </Text>
        </Animated.View>

        {stats && (
          <Animated.View entering={FadeInDown.duration(600).delay(200)} style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="flame" size={22} color={colors.gold} />
              <Text style={[styles.statNumber, { color: colors.text, fontFamily: "DMSans_700Bold" }]}>
                {stats.currentStreak}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary, fontFamily: "DMSans_400Regular" }]}>
                Day Streak
              </Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="checkmark-circle" size={22} color={colors.success} />
              <Text style={[styles.statNumber, { color: colors.text, fontFamily: "DMSans_700Bold" }]}>
                {stats.totalAffirmed}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary, fontFamily: "DMSans_400Regular" }]}>
                Affirmed
              </Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="trophy" size={22} color="#FF9500" />
              <Text style={[styles.statNumber, { color: colors.text, fontFamily: "DMSans_700Bold" }]}>
                {stats.longestStreak}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary, fontFamily: "DMSans_400Regular" }]}>
                Best Streak
              </Text>
            </View>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.duration(600).delay(300)}>
          <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: "PlayfairDisplay_600SemiBold" }]}>
            Today's Affirmation
          </Text>
        </Animated.View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.gold} />
          </View>
        ) : todayAff ? (
          <Animated.View entering={FadeInUp.duration(700).delay(400)}>
            <Pressable
              onPress={() => router.push({ pathname: "/affirmation/[id]", params: { id: todayAff.id.toString() } })}
              style={({ pressed }) => [{ opacity: pressed ? 0.95 : 1 }]}
            >
              <LinearGradient
                colors={isDark ? ["#2A2418", "#1A1410", "#0A0A0A"] : ["#FDF8EE", "#F8EFDB", "#F0E0C0"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.affirmationCard, { borderColor: isDark ? "#3A2E18" : "#E8D5A8" }]}
              >
                <View style={styles.affCardHeader}>
                  <View style={[styles.dayBadge, { backgroundColor: colors.gold }]}>
                    <Text style={[styles.dayBadgeText, { fontFamily: "DMSans_700Bold" }]}>
                      DAY {todayAff.dayNumber}
                    </Text>
                  </View>
                  {todayAff.bookletTitle && (
                    <Text style={[styles.bookletLabel, { color: colors.textSecondary, fontFamily: "DMSans_400Regular" }]}>
                      {todayAff.bookletTitle}
                    </Text>
                  )}
                </View>

                <Text style={[styles.affTitle, { color: colors.text, fontFamily: "PlayfairDisplay_700Bold" }]}>
                  {todayAff.title}
                </Text>

                <Text
                  style={[styles.affPreview, { color: colors.textSecondary, fontFamily: "DMSans_400Regular" }]}
                  numberOfLines={4}
                >
                  {todayAff.content.split("\n\n")[0]}
                </Text>

                <View style={styles.affCardFooter}>
                  <View style={styles.readMore}>
                    <Text style={[styles.readMoreText, { color: colors.gold, fontFamily: "DMSans_600SemiBold" }]}>
                      Read Full Affirmation
                    </Text>
                    <Ionicons name="arrow-forward" size={16} color={colors.gold} />
                  </View>
                </View>
              </LinearGradient>
            </Pressable>

            {!isCompleted ? (
              <Pressable
                onPress={() => completeMutation.mutate(todayAff.id)}
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
          </Animated.View>
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="book-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text, fontFamily: "DMSans_600SemiBold" }]}>
              No affirmation for today
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary, fontFamily: "DMSans_400Regular" }]}>
              Check back soon or browse the library
            </Text>
          </View>
        )}

        <Animated.View entering={FadeInDown.duration(600).delay(500)}>
          <Pressable
            onPress={() => router.push("/(main)/library")}
            style={({ pressed }) => [
              styles.browseCard,
              { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.95 : 1 },
            ]}
          >
            <View style={styles.browseContent}>
              <Ionicons name="book" size={28} color={colors.gold} />
              <View style={styles.browseTextContent}>
                <Text style={[styles.browseTitle, { color: colors.text, fontFamily: "DMSans_600SemiBold" }]}>
                  Browse Library
                </Text>
                <Text style={[styles.browseSubtext, { color: colors.textSecondary, fontFamily: "DMSans_400Regular" }]}>
                  Explore all monthly affirmation booklets
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  greeting: { fontSize: 15, marginBottom: 2 },
  userName: { fontSize: 28, lineHeight: 34, marginBottom: 4 },
  dateText: { fontSize: 14, marginBottom: 24 },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  statNumber: { fontSize: 24, lineHeight: 28 },
  statLabel: { fontSize: 11, textTransform: "uppercase" as const, letterSpacing: 0.5 },
  sectionTitle: { fontSize: 22, marginBottom: 16 },
  loadingContainer: { paddingVertical: 60, alignItems: "center" },
  affirmationCard: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
  },
  affCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  dayBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dayBadgeText: { color: "#fff", fontSize: 11, letterSpacing: 1 },
  bookletLabel: { fontSize: 13 },
  affTitle: { fontSize: 24, lineHeight: 30, marginBottom: 12 },
  affPreview: { fontSize: 15, lineHeight: 24 },
  affCardFooter: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  readMore: { flexDirection: "row", alignItems: "center", gap: 6 },
  readMoreText: { fontSize: 14 },
  affirmButton: {
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 16,
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
    marginTop: 16,
  },
  completedText: { fontSize: 16 },
  emptyCard: {
    borderRadius: 20,
    padding: 40,
    alignItems: "center",
    borderWidth: 1,
    gap: 12,
  },
  emptyTitle: { fontSize: 18, textAlign: "center" },
  emptySubtext: { fontSize: 14, textAlign: "center" },
  browseCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 24,
  },
  browseContent: { flexDirection: "row", alignItems: "center", gap: 16, flex: 1 },
  browseTextContent: { flex: 1 },
  browseTitle: { fontSize: 16, marginBottom: 2 },
  browseSubtext: { fontSize: 13 },
});
