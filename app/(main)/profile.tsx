import React, { useState, useEffect } from "react";
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
  Switch,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "@tanstack/react-query";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/lib/auth-context";
import { useThemeColors } from "@/constants/colors";
import { apiRequest, queryClient } from "@/lib/query-client";
import {
  requestNotificationPermissions,
  scheduleAffirmationReminders,
  cancelAllReminders,
} from "@/lib/notifications";

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const scheme = useColorScheme();
  const colors = useThemeColors(scheme);
  const insets = useSafeAreaInsets();
  const isDark = scheme === "dark";

  const { data: stats, isLoading } = useQuery<any>({
    queryKey: ["/api/stats"],
  });

  const { data: notifSettings } = useQuery<any>({
    queryKey: ["/api/notification-settings"],
  });

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    if (notifSettings) {
      setNotificationsEnabled(notifSettings.enabled ?? false);
    }
  }, [notifSettings]);

  const updateNotifMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (enabled) {
        const granted = await requestNotificationPermissions();
        if (!granted) {
          Alert.alert(
            "Notifications Disabled",
            "Please enable notifications in your device settings to receive affirmation reminders.",
          );
          return;
        }
        const startHour = notifSettings?.startHour ?? 8;
        const endHour = notifSettings?.endHour ?? 21;
        const interval = notifSettings?.intervalMinutes ?? 30;
        await scheduleAffirmationReminders(startHour, endHour, interval);
      } else {
        await cancelAllReminders();
      }
      await apiRequest("PUT", "/api/notification-settings", { enabled });
      queryClient.invalidateQueries({ queryKey: ["/api/notification-settings"] });
    },
  });

  async function handleToggleNotifications(value: boolean) {
    setNotificationsEnabled(value);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    updateNotifMutation.mutate(value);
  }

  async function handleLogout() {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
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
        <Text
          style={[
            styles.pageTitle,
            { color: colors.text, fontFamily: "PlayfairDisplay_700Bold" },
          ]}
        >
          Profile
        </Text>

        <Animated.View
          entering={FadeInDown.duration(600).delay(100)}
          style={styles.profileSection}
        >
          <View style={[styles.avatar, { backgroundColor: colors.gold }]}>
            <Text style={[styles.avatarText, { fontFamily: "DMSans_700Bold" }]}>
              {initials}
            </Text>
          </View>
          <Text
            style={[
              styles.displayName,
              { color: colors.text, fontFamily: "DMSans_700Bold" },
            ]}
          >
            {user?.displayName || user?.username}
          </Text>
          <Text
            style={[
              styles.emailText,
              { color: colors.textSecondary, fontFamily: "DMSans_400Regular" },
            ]}
          >
            @{user?.username}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(600).delay(200)}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.text, fontFamily: "PlayfairDisplay_600SemiBold" },
            ]}
          >
            Your Journey
          </Text>

          {isLoading ? (
            <ActivityIndicator
              color={colors.gold}
              style={{ paddingVertical: 20 }}
            />
          ) : (
            <View style={styles.statsGrid}>
              <View
                style={[
                  styles.bigStatCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.statIconBg,
                    { backgroundColor: colors.goldLight },
                  ]}
                >
                  <Ionicons name="flame" size={28} color={colors.gold} />
                </View>
                <Text
                  style={[
                    styles.bigStatNumber,
                    { color: colors.text, fontFamily: "DMSans_700Bold" },
                  ]}
                >
                  {stats?.currentStreak ?? 0}
                </Text>
                <Text
                  style={[
                    styles.bigStatLabel,
                    {
                      color: colors.textSecondary,
                      fontFamily: "DMSans_400Regular",
                    },
                  ]}
                >
                  Current Streak
                </Text>
              </View>

              <View
                style={[
                  styles.bigStatCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.statIconBg,
                    {
                      backgroundColor: isDark ? "#1A2A1A" : "#E0F5E0",
                    },
                  ]}
                >
                  <Ionicons
                    name="checkmark-done"
                    size={28}
                    color={colors.success}
                  />
                </View>
                <Text
                  style={[
                    styles.bigStatNumber,
                    { color: colors.text, fontFamily: "DMSans_700Bold" },
                  ]}
                >
                  {stats?.totalAffirmed ?? 0}
                </Text>
                <Text
                  style={[
                    styles.bigStatLabel,
                    {
                      color: colors.textSecondary,
                      fontFamily: "DMSans_400Regular",
                    },
                  ]}
                >
                  Total Affirmed
                </Text>
              </View>

              <View
                style={[
                  styles.bigStatCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.statIconBg,
                    {
                      backgroundColor: isDark ? "#2A2A1A" : "#FFF3E0",
                    },
                  ]}
                >
                  <Ionicons name="trophy" size={28} color="#FF9500" />
                </View>
                <Text
                  style={[
                    styles.bigStatNumber,
                    { color: colors.text, fontFamily: "DMSans_700Bold" },
                  ]}
                >
                  {stats?.longestStreak ?? 0}
                </Text>
                <Text
                  style={[
                    styles.bigStatLabel,
                    {
                      color: colors.textSecondary,
                      fontFamily: "DMSans_400Regular",
                    },
                  ]}
                >
                  Best Streak
                </Text>
              </View>

              <View
                style={[
                  styles.bigStatCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.statIconBg,
                    {
                      backgroundColor: isDark ? "#1A1A2A" : "#E8E0F5",
                    },
                  ]}
                >
                  <Ionicons name="calendar" size={28} color="#8B5CF6" />
                </View>
                <Text
                  style={[
                    styles.bigStatNumber,
                    { color: colors.text, fontFamily: "DMSans_700Bold" },
                  ]}
                >
                  {stats?.completedToday ? "Yes" : "No"}
                </Text>
                <Text
                  style={[
                    styles.bigStatLabel,
                    {
                      color: colors.textSecondary,
                      fontFamily: "DMSans_400Regular",
                    },
                  ]}
                >
                  Affirmed Today
                </Text>
              </View>
            </View>
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(600).delay(300)}>
          <Text
            style={[
              styles.sectionTitle,
              {
                color: colors.text,
                fontFamily: "PlayfairDisplay_600SemiBold",
                marginTop: 32,
              },
            ]}
          >
            Reminders
          </Text>

          <View
            style={[
              styles.settingCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View
                  style={[
                    styles.settingIconBg,
                    { backgroundColor: colors.goldLight },
                  ]}
                >
                  <Ionicons
                    name="notifications"
                    size={22}
                    color={colors.gold}
                  />
                </View>
                <View>
                  <Text
                    style={[
                      styles.settingLabel,
                      { color: colors.text, fontFamily: "DMSans_600SemiBold" },
                    ]}
                  >
                    Daily Reminders
                  </Text>
                  <Text
                    style={[
                      styles.settingDesc,
                      {
                        color: colors.textSecondary,
                        fontFamily: "DMSans_400Regular",
                      },
                    ]}
                  >
                    Get notified every 30 min, 8am-9pm
                  </Text>
                </View>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: colors.border, true: colors.gold + "80" }}
                thumbColor={notificationsEnabled ? colors.gold : "#ccc"}
              />
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(600).delay(400)}>
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
            <Text
              style={[
                styles.logoutText,
                { color: colors.error, fontFamily: "DMSans_600SemiBold" },
              ]}
            >
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
  bigStatLabel: {
    fontSize: 12,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  settingCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  settingIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  settingLabel: { fontSize: 16, marginBottom: 2 },
  settingDesc: { fontSize: 12 },
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
