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
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/lib/auth-context";
import { useThemeColors } from "@/constants/colors";

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const scheme = useColorScheme();
  const colors = useThemeColors(scheme);
  const insets = useSafeAreaInsets();
  const isDark = scheme === "dark";

  const { data: stats, isLoading } = useQuery<any>({
    queryKey: ["/api/stats"],
  });

  const { data: streak } = useQuery<any>({
    queryKey: ["/api/streak"],
  });

  async function handleLogout() {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            await logout();
            router.replace("/(auth)/login");
          },
        },
      ],
    );
  }

  const initials = (user?.displayName || user?.username || "U")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

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
      >
        <Text style={[styles.pageTitle, { color: colors.text, fontFamily: "PlayfairDisplay_700Bold" }]}>
          Profile
        </Text>

        <Animated.View entering={FadeInDown.duration(600).delay(100)} style={styles.profileSection}>
          <View style={[styles.avatar, { backgroundColor: colors.gold }]}>
            <Text style={[styles.avatarText, { fontFamily: "DMSans_700Bold" }]}>
              {initials}
            </Text>
          </View>
          <Text style={[styles.displayName, { color: colors.text, fontFamily: "DMSans_700Bold" }]}>
            {user?.displayName || user?.username}
          </Text>
          <Text style={[styles.emailText, { color: colors.textSecondary, fontFamily: "DMSans_400Regular" }]}>
            @{user?.username}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(600).delay(200)}>
          <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: "PlayfairDisplay_600SemiBold" }]}>
            Your Journey
          </Text>

          {isLoading ? (
            <ActivityIndicator color={colors.gold} style={{ paddingVertical: 20 }} />
          ) : (
            <View style={styles.statsGrid}>
              <View style={[styles.bigStatCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.statIconBg, { backgroundColor: colors.goldLight }]}>
                  <Ionicons name="flame" size={28} color={colors.gold} />
                </View>
                <Text style={[styles.bigStatNumber, { color: colors.text, fontFamily: "DMSans_700Bold" }]}>
                  {stats?.currentStreak ?? 0}
                </Text>
                <Text style={[styles.bigStatLabel, { color: colors.textSecondary, fontFamily: "DMSans_400Regular" }]}>
                  Current Streak
                </Text>
              </View>

              <View style={[styles.bigStatCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.statIconBg, { backgroundColor: isDark ? "#1A2A1A" : "#E0F5E0" }]}>
                  <Ionicons name="checkmark-done" size={28} color={colors.success} />
                </View>
                <Text style={[styles.bigStatNumber, { color: colors.text, fontFamily: "DMSans_700Bold" }]}>
                  {stats?.totalAffirmed ?? 0}
                </Text>
                <Text style={[styles.bigStatLabel, { color: colors.textSecondary, fontFamily: "DMSans_400Regular" }]}>
                  Total Affirmed
                </Text>
              </View>

              <View style={[styles.bigStatCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.statIconBg, { backgroundColor: isDark ? "#2A2A1A" : "#FFF3E0" }]}>
                  <Ionicons name="trophy" size={28} color="#FF9500" />
                </View>
                <Text style={[styles.bigStatNumber, { color: colors.text, fontFamily: "DMSans_700Bold" }]}>
                  {stats?.longestStreak ?? 0}
                </Text>
                <Text style={[styles.bigStatLabel, { color: colors.textSecondary, fontFamily: "DMSans_400Regular" }]}>
                  Best Streak
                </Text>
              </View>

              <View style={[styles.bigStatCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.statIconBg, { backgroundColor: isDark ? "#1A1A2A" : "#E8E0F5" }]}>
                  <Ionicons name="calendar" size={28} color="#8B5CF6" />
                </View>
                <Text style={[styles.bigStatNumber, { color: colors.text, fontFamily: "DMSans_700Bold" }]}>
                  {stats?.completedToday ? "Yes" : "No"}
                </Text>
                <Text style={[styles.bigStatLabel, { color: colors.textSecondary, fontFamily: "DMSans_400Regular" }]}>
                  Affirmed Today
                </Text>
              </View>
            </View>
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(600).delay(300)}>
          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => [
              styles.logoutButton,
              {
                backgroundColor: colors.surface,
                borderColor: colors.error + "40",
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Ionicons name="log-out-outline" size={22} color={colors.error} />
            <Text style={[styles.logoutText, { color: colors.error, fontFamily: "DMSans_600SemiBold" }]}>
              Sign Out
            </Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  pageTitle: { fontSize: 32, lineHeight: 38, marginBottom: 24 },
  profileSection: {
    alignItems: "center",
    marginBottom: 36,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  avatarText: { color: "#fff", fontSize: 28 },
  displayName: { fontSize: 22, marginBottom: 4 },
  emailText: { fontSize: 14 },
  sectionTitle: { fontSize: 22, marginBottom: 16 },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  bigStatCard: {
    width: "47%" as any,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    gap: 10,
  },
  statIconBg: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  bigStatNumber: { fontSize: 28 },
  bigStatLabel: { fontSize: 12, textTransform: "uppercase" as const, letterSpacing: 0.5 },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 32,
  },
  logoutText: { fontSize: 16 },
});
