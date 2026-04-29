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
  Modal,
  TextInput,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "@tanstack/react-query";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/lib/auth-context";
import { LinearGradient } from "expo-linear-gradient";
import { useThemeColors } from "@/constants/colors";
import { apiRequest, queryClient } from "@/lib/query-client";
import { ProfilePictureUpload } from "@/components/ProfilePictureUpload";
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

  const { data: rewardBalance } = useQuery<{ points: number; totalEarned: number; totalSpent: number }>({
    queryKey: ["/api/rewards/balance"],
  });

  const { data: notifSettings } = useQuery<any>({
    queryKey: ["/api/notification-settings"],
  });

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [intervalMinutes, setIntervalMinutes] = useState(30);
  const [showIntervalModal, setShowIntervalModal] = useState(false);

  useEffect(() => {
    if (notifSettings) {
      setNotificationsEnabled(notifSettings.enabled ?? false);
      setIntervalMinutes(notifSettings.intervalMinutes ?? 30);
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
        const interval = intervalMinutes;
        await scheduleAffirmationReminders(startHour, endHour, interval);
      } else {
        await cancelAllReminders();
      }
      await apiRequest("PUT", "/api/notification-settings", { enabled, intervalMinutes });
      queryClient.invalidateQueries({ queryKey: ["/api/notification-settings"] });
    },
  });

  const updateIntervalMutation = useMutation({
    mutationFn: async (minutes: number) => {
      setIntervalMinutes(minutes);
      setShowIntervalModal(false);
      if (notificationsEnabled) {
        const startHour = notifSettings?.startHour ?? 8;
        const endHour = notifSettings?.endHour ?? 21;
        await scheduleAffirmationReminders(startHour, endHour, minutes);
      }
      await apiRequest("PUT", "/api/notification-settings", { intervalMinutes: minutes });
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

  const [showChangePw, setShowChangePw] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  const changePwMutation = useMutation({
    mutationFn: async () => {
      if (!currentPw || !newPw) throw new Error("All fields are required");
      if (newPw.length < 6) throw new Error("New password must be at least 6 characters");
      if (newPw !== confirmPw) throw new Error("Passwords do not match");
      const res = await apiRequest("PUT", "/api/auth/change-password", {
        currentPassword: currentPw,
        newPassword: newPw,
      });
      return res.json();
    },
    onSuccess: () => {
      setShowChangePw(false);
      setCurrentPw(""); setNewPw(""); setConfirmPw(""); setPwError("");
      Alert.alert("Success", "Your password has been changed.");
    },
    onError: (err: any) => {
      const msg = String(err?.message || "");
      if (msg.includes("Current password")) {
        setPwError("Current password is incorrect.");
      } else if (msg.includes("6 characters")) {
        setPwError("New password must be at least 6 characters.");
      } else if (msg.includes("do not match")) {
        setPwError("Passwords do not match.");
      } else {
        setPwError("Failed to change password. Please try again.");
      }
    },
  });

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
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 52 }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: 0,
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
          <ProfilePictureUpload
            currentImageUrl={user?.profilePictureUrl || undefined}
            displayName={user?.displayName || user?.username || "U"}
            size={100}
            editable={true}
          />
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
            <>
              {/* Enterprise Streak Hero */}
              <View style={styles.heroCardOuter}>
                <LinearGradient
                  colors={isDark ? ["#1A2A40", "#0F2040", "#1A1A30"] : ["#FFF8E7", "#FFF0D0", "#FFE8B8"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.heroCard, { borderColor: colors.gold + "30" }]}
                >
                  <View style={styles.heroTopRow}>
                    <View style={styles.heroStreakSection}>
                      <View style={[styles.heroFireGlow, { backgroundColor: colors.gold + "18" }]}>
                        <View style={[styles.heroFireInner, { backgroundColor: colors.gold + "30" }]}>
                          <Ionicons name="flame" size={28} color={colors.gold} />
                        </View>
                      </View>
                      <View style={styles.heroStreakNumbers}>
                        <Text style={[styles.heroStreakBig, { color: colors.text, fontFamily: "DMSans_700Bold" }]}>
                          {stats?.currentStreak ?? 0}
                        </Text>
                        <Text style={[styles.heroStreakUnit, { color: colors.gold, fontFamily: "DMSans_600SemiBold" }]}>
                          day streak
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.heroBestBadge, { backgroundColor: colors.gold + "15", borderColor: colors.gold + "30" }]}>
                      <Ionicons name="trophy" size={14} color={colors.gold} />
                      <Text style={[styles.heroBestText, { color: colors.gold, fontFamily: "DMSans_600SemiBold" }]}>
                        Best: {stats?.longestStreak ?? 0}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.heroProgressSection}>
                    <View style={[styles.heroProgressTrack, { backgroundColor: colors.gold + "15" }]}>
                      <LinearGradient
                        colors={[colors.gold, "#FFB800"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[
                          styles.heroProgressFill,
                          {
                            width: `${Math.min(((stats?.currentStreak ?? 0) / Math.max(stats?.longestStreak ?? 1, 1)) * 100, 100)}%`,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.heroProgressLabel, { color: colors.textSecondary, fontFamily: "DMSans_400Regular" }]}>
                      {Math.min(((stats?.currentStreak ?? 0) / Math.max(stats?.longestStreak ?? 1, 1)) * 100, 100).toFixed(0)}% of personal best
                    </Text>
                  </View>
                </LinearGradient>
              </View>

              {/* Enterprise Stats Grid — 2×2 */}
              <View style={styles.statsGrid}>
                <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.statCardTop}>
                    <View style={[styles.statIconCircle, { backgroundColor: isDark ? "rgba(48,209,88,0.12)" : "rgba(52,199,89,0.1)" }]}>
                      <Ionicons name="checkmark-done" size={20} color={colors.success} />
                    </View>
                    <View style={[styles.statAccentLine, { backgroundColor: colors.success }]} />
                  </View>
                  <Text style={[styles.statNumber, { color: colors.text, fontFamily: "DMSans_700Bold" }]}>
                    {stats?.totalAffirmed ?? 0}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary, fontFamily: "DMSans_400Regular" }]}>
                    Total Affirmed
                  </Text>
                </View>

                <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.statCardTop}>
                    <View style={[styles.statIconCircle, { backgroundColor: isDark ? "rgba(139,92,246,0.12)" : "rgba(139,92,246,0.1)" }]}>
                      <Ionicons name="today" size={20} color="#8B5CF6" />
                    </View>
                    <View style={[styles.statAccentLine, { backgroundColor: "#8B5CF6" }]} />
                  </View>
                  <Text style={[styles.statNumber, { color: stats?.completedToday ? colors.success : colors.text, fontFamily: "DMSans_700Bold" }]}>
                    {stats?.completedToday ? "Done" : "Pending"}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary, fontFamily: "DMSans_400Regular" }]}>
                    Today&apos;s Status
                  </Text>
                </View>

                <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.statCardTop}>
                    <View style={[styles.statIconCircle, { backgroundColor: isDark ? "rgba(59,130,246,0.12)" : "rgba(59,130,246,0.1)" }]}>
                      <Ionicons name="library" size={20} color="#3B82F6" />
                    </View>
                    <View style={[styles.statAccentLine, { backgroundColor: "#3B82F6" }]} />
                  </View>
                  <Text style={[styles.statNumber, { color: colors.text, fontFamily: "DMSans_700Bold" }]}>
                    {stats?.totalBooklets ?? 0}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary, fontFamily: "DMSans_400Regular" }]}>
                    Booklets
                  </Text>
                </View>

                <Pressable
                  onPress={() => router.push("/(main)/leaderboard")}
                  style={({ pressed }) => [styles.statCard, styles.pointsCard, {
                    borderColor: colors.gold + "50",
                    opacity: pressed ? 0.92 : 1,
                  }]}
                >
                  <LinearGradient
                    colors={isDark ? ["#2A2010", "#1A1508"] : ["#FFF8E7", "#FFF0D0"]}
                    style={styles.pointsCardGradient}
                  >
                    <View style={styles.statCardTop}>
                      <View style={[styles.statIconCircle, { backgroundColor: colors.gold + "20" }]}>
                        <Ionicons name="star" size={20} color={colors.gold} />
                      </View>
                      <View style={[styles.statAccentLine, { backgroundColor: colors.gold }]} />
                    </View>
                    <Text style={[styles.statNumber, { color: colors.gold, fontFamily: "DMSans_700Bold" }]}>
                      {rewardBalance?.points ?? 0}
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary, fontFamily: "DMSans_400Regular" }]}>
                      Reward Points
                    </Text>
                    <View style={styles.pointsChevron}>
                      <Ionicons name="chevron-forward" size={14} color={colors.gold} />
                    </View>
                  </LinearGradient>
                </Pressable>
              </View>
            </>
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
                <View style={{ flex: 1, flexShrink: 1 }}>
                  <Text
                    style={[
                      styles.settingLabel,
                      { color: colors.text, fontFamily: "DMSans_600SemiBold" },
                    ]}
                    numberOfLines={1}
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
                    numberOfLines={1}
                  >
                    Every {intervalMinutes} min, 8am-9pm
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

          {notificationsEnabled && (
            <View
              style={[
                styles.settingCard,
                { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 12 },
              ]}
            >
              <Pressable
                onPress={() => setShowIntervalModal(true)}
                style={({ pressed }) => [
                  styles.settingRow,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <View style={styles.settingInfo}>
                  <View
                    style={[
                      styles.settingIconBg,
                      { backgroundColor: colors.tintLight + "40" },
                    ]}
                  >
                    <Ionicons
                      name="time"
                      size={22}
                      color={colors.tint}
                    />
                  </View>
                  <View style={{ flex: 1, flexShrink: 1 }}>
                    <Text
                      style={[
                        styles.settingLabel,
                        { color: colors.text, fontFamily: "DMSans_600SemiBold" },
                      ]}
                      numberOfLines={1}
                    >
                      Frequency
                    </Text>
                    <Text
                      style={[
                        styles.settingDesc,
                        {
                          color: colors.textSecondary,
                          fontFamily: "DMSans_400Regular",
                        },
                      ]}
                      numberOfLines={2}
                    >
                      Customize how often you receive notifications
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </Pressable>

            </View>
          )}
        </Animated.View>

        {/* Change Password Button */}
        <Animated.View entering={FadeInDown.duration(600).delay(380)}>
          <Pressable
            onPress={() => {
              setShowChangePw(true);
              setCurrentPw(""); setNewPw(""); setConfirmPw(""); setPwError("");
            }}
            style={({ pressed }) => [{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              paddingVertical: 14,
              borderRadius: 16,
              borderWidth: 1,
              marginTop: 16,
              backgroundColor: colors.surface,
              borderColor: colors.border,
              opacity: pressed ? 0.8 : 1,
            }]}
          >
            <Ionicons name="lock-closed-outline" size={22} color={colors.text} />
            <Text style={{ color: colors.text, fontSize: 16, fontFamily: "DMSans_600SemiBold" }}>
              Change Password
            </Text>
          </Pressable>
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

        <View style={styles.brandingFooter}>
          <Text
            style={[
              styles.brandingText,
              { color: colors.textSecondary + "80", fontFamily: "DMSans_400Regular" },
            ]}
          >
            My Life & My Cash Flow Affirmations
          </Text>
          <Text
            style={[
              styles.brandingSubtext,
              { color: colors.textSecondary + "60", fontFamily: "DMSans_400Regular" },
            ]}
          >
            A subsidiary of Zion House INT&apos;L
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={showIntervalModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowIntervalModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
          <View style={[styles.intervalModal, { backgroundColor: colors.surface }]}> 
            <Text
              style={[
                styles.modalTitle,
                { color: colors.text, fontFamily: "PlayfairDisplay_700Bold" },
              ]}
            >
              Notification Frequency
            </Text>
            <Text
              style={[
                styles.modalSubtitle,
                { color: colors.textSecondary, fontFamily: "DMSans_400Regular" },
              ]}
            >
              How often would you like to receive affirmation reminders?
            </Text>

            {[15, 20, 30, 45, 60].map((interval) => (
              <Pressable
                key={interval}
                onPress={() => updateIntervalMutation.mutate(interval)}
                style={({ pressed }) => [
                  styles.intervalOption,
                  {
                    backgroundColor:
                      intervalMinutes === interval
                        ? colors.gold + "20"
                        : colors.inputBg,
                    borderColor: intervalMinutes === interval ? colors.gold : colors.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.intervalText,
                    {
                      color: intervalMinutes === interval ? colors.gold : colors.text,
                      fontFamily: "DMSans_600SemiBold",
                    },
                  ]}
                >
                  Every {interval} minutes
                </Text>
                {intervalMinutes === interval && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.gold} />
                )}
              </Pressable>
            ))}

            <Pressable
              onPress={() => setShowIntervalModal(false)}
              style={({ pressed }) => [styles.modalCloseButton, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Text
                style={[
                  styles.modalCloseText,
                  { color: colors.text, fontFamily: "DMSans_600SemiBold" },
                ]}
              >
                Done
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        visible={showChangePw}
        transparent
        animationType="slide"
        onRequestClose={() => setShowChangePw(false)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <Text style={{ color: colors.text, fontSize: 20, fontFamily: "PlayfairDisplay_700Bold" }}>Change Password</Text>
              <Pressable onPress={() => setShowChangePw(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            {[
              { label: "Current Password", value: currentPw, setter: setCurrentPw, show: showCurrentPw, toggleShow: () => setShowCurrentPw(!showCurrentPw) },
              { label: "New Password", value: newPw, setter: setNewPw, show: showNewPw, toggleShow: () => setShowNewPw(!showNewPw) },
              { label: "Confirm New Password", value: confirmPw, setter: setConfirmPw, show: showNewPw, toggleShow: () => setShowNewPw(!showNewPw) },
            ].map((field) => (
              <View key={field.label} style={{ flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, height: 52, marginBottom: 12, backgroundColor: colors.inputBg || colors.surface, borderColor: colors.border }}>
                <TextInput
                  placeholder={field.label}
                  placeholderTextColor={colors.textSecondary}
                  value={field.value}
                  onChangeText={field.setter}
                  secureTextEntry={!field.show}
                  style={{ flex: 1, color: colors.text, fontSize: 15, fontFamily: "DMSans_400Regular" }}
                />
                <Pressable onPress={field.toggleShow} hitSlop={12}>
                  <Ionicons name={field.show ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textSecondary} />
                </Pressable>
              </View>
            ))}

            {!!pwError && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <Ionicons name="alert-circle" size={16} color={colors.error} />
                <Text style={{ color: colors.error, fontSize: 13, fontFamily: "DMSans_400Regular", flex: 1 }}>{pwError}</Text>
              </View>
            )}

            <Pressable
              onPress={() => changePwMutation.mutate()}
              disabled={changePwMutation.isPending}
              style={({ pressed }) => [{
                backgroundColor: colors.tint,
                borderRadius: 14, height: 52,
                alignItems: "center", justifyContent: "center",
                marginTop: 4, marginBottom: 20,
                opacity: pressed || changePwMutation.isPending ? 0.85 : 1,
              }]}
            >
              {changePwMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: "#fff", fontSize: 16, fontFamily: "DMSans_700Bold" }}>Save Password</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
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
  heroCardOuter: {
    marginBottom: 16,
    borderRadius: 22,
    overflow: "hidden",
    // shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  heroCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 22,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  heroStreakSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  heroFireGlow: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  heroFireInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  heroStreakNumbers: {
    gap: 2,
  },
  heroStreakBig: {
    fontSize: 38,
    lineHeight: 42,
  },
  heroStreakUnit: {
    fontSize: 12,
    textTransform: "uppercase" as const,
    letterSpacing: 1.2,
  },
  heroBestBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  heroBestText: {
    fontSize: 12,
  },
  heroProgressSection: {
    gap: 8,
  },
  heroProgressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  heroProgressFill: {
    height: 6,
    borderRadius: 3,
    minWidth: 6,
  },
  heroProgressLabel: {
    fontSize: 11,
    letterSpacing: 0.3,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 4,
  },
  statCard: {
    width: "47.5%",
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    gap: 6,
    // shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  statIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  statAccentLine: {
    width: 28,
    height: 3,
    borderRadius: 1.5,
    opacity: 0.6,
  },
  statNumber: {
    fontSize: 26,
    lineHeight: 30,
  },
  statLabel: {
    fontSize: 11,
    textTransform: "uppercase" as const,
    letterSpacing: 0.8,
  },
  pointsCard: {
    borderWidth: 1.5,
    padding: 0,
    overflow: "hidden",
  },
  pointsCardGradient: {
    padding: 18,
    gap: 6,
    flex: 1,
  },
  pointsChevron: {
    position: "absolute" as const,
    bottom: 16,
    right: 16,
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
    overflow: "hidden",
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
  brandingFooter: {
    alignItems: "center",
    marginTop: 40,
    gap: 4,
  },
  brandingText: {
    fontSize: 11,
    textAlign: "center",
    letterSpacing: 0.3,
  },
  brandingSubtext: {
    fontSize: 10,
    textAlign: "center",
    letterSpacing: 0.3,
  },
  modalOverlay: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  intervalModal: {
    width: "85%",
    borderRadius: 24,
    padding: 24,
    gap: 16,
  },
  modalTitle: {
    fontSize: 24,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  intervalOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  intervalText: {
    fontSize: 16,
  },
  modalCloseButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },
  modalCloseText: {
    fontSize: 16,
  },
});
