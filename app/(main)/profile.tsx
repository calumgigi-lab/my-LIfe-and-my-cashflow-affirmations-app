import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
  Switch,
  Modal,
  TextInput,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "@tanstack/react-query";
import i18n, { SUPPORTED_LANGUAGES } from "@/lib/i18n";
import { useTranslation } from "react-i18next";
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
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const { data: stats, isLoading, refetch: refetchStats } = useQuery<any>({
    queryKey: ["/api/stats"],
  });

  const { data: rewardBalance, refetch: refetchRewards } = useQuery<{
    points: number;
    totalEarned: number;
    totalSpent: number;
  }>({
    queryKey: ["/api/rewards/balance"],
  });

  const { data: notifSettings, refetch: refetchNotifs } = useQuery<any>({
    queryKey: ["/api/notification-settings"],
  });

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [intervalMinutes, setIntervalMinutes] = useState(30);
  const [showIntervalModal, setShowIntervalModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [currentLang, setCurrentLang] = useState(i18n.language);

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
            "Please enable notifications in your device settings to receive affirmation reminders."
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
      await apiRequest("PUT", "/api/notification-settings", {
        enabled,
        intervalMinutes,
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/notification-settings"],
      });
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
      await apiRequest("PUT", "/api/notification-settings", {
        intervalMinutes: minutes,
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/notification-settings"],
      });
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
      if (newPw.length < 6)
        throw new Error("New password must be at least 6 characters");
      if (newPw !== confirmPw) throw new Error("Passwords do not match");
      const res = await apiRequest("PUT", "/api/auth/change-password", {
        currentPassword: currentPw,
        newPassword: newPw,
      });
      return res.json();
    },
    onSuccess: () => {
      setShowChangePw(false);
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      setPwError("");
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

  const currentStreak = stats?.currentStreak ?? 0;
  const longestStreak = stats?.longestStreak ?? 0;
  const levelProgress = stats?.levelProgress ?? 0;

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchRewards(), refetchNotifs()]);
    await new Promise((r) => setTimeout(r, 800));
    setRefreshing(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: 100,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.gold}
            colors={[colors.gold]}
          />
        }
      >
        {/* Nav Header */}
        <View style={styles.navHeader}>
          <Text
            style={[
              styles.pageTitle,
              { color: colors.text, fontFamily: "PlayfairDisplay_700Bold" },
            ]}
          >
            Profile
          </Text>
          <View style={styles.navActions}>
            <Pressable
              onPress={() => router.push("/settings")}
              style={({ pressed }) => [
                styles.navBtn,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border + "30",
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Ionicons
                name="settings-outline"
                size={20}
                color={colors.textSecondary}
              />
            </Pressable>
          </View>
        </View>

        {/* Profile Hero Card */}
        <Animated.View entering={FadeInDown.duration(600).delay(80)}>
          <View style={styles.profileHeroOuter}>
            <LinearGradient
              colors={["#1A3A5C", "#14324E", "#1C4060"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.profileHeroBg}
            >
              <View style={styles.profileTop}>
                <View style={styles.avatarContainer}>
                  <LinearGradient
                    colors={[colors.gold, colors.goldDark, colors.gold]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.avatarRing}
                  >
                    <View style={styles.avatarInner}>
                      <ProfilePictureUpload
                        currentImageUrl={
                          user?.profilePictureUrl || undefined
                        }
                        displayName={user?.displayName || user?.username || "U"}
                        size={82}
                        editable
                      />
                    </View>
                  </LinearGradient>
                  <View style={[styles.avatarBadge, { backgroundColor: colors.success, borderColor: "#1A3A5C" }]}>
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  </View>
                </View>

                <View style={styles.profileInfo}>
                  <View style={styles.profileNameRow}>
                    <Text
                      style={[
                        styles.profileName,
                        { color: colors.text, fontFamily: "DMSans_700Bold" },
                      ]}
                      numberOfLines={1}
                    >
                      {user?.displayName || user?.username}
                    </Text>
                    <View style={styles.verifiedBadge}>
                      <Ionicons name="checkmark" size={12} color="#0F2C4F" />
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.profileUsername,
                      { color: colors.textSecondary },
                    ]}
                  >
                    @{user?.username}
                  </Text>
                  <View style={styles.profileTags}>
                    <View
                      style={[
                        styles.tag,
                        styles.tagGold,
                        {
                          backgroundColor: "rgba(212,168,83,0.12)",
                          borderColor: "rgba(212,168,83,0.25)",
                        },
                      ]}
                    >
                      <Ionicons name="diamond" size={12} color={colors.gold} />
                      <Text style={[styles.tagText, { color: colors.gold }]}>
                        Premium
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.tag,
                        styles.tagBlue,
                        {
                          backgroundColor: "rgba(100,181,246,0.1)",
                          borderColor: "rgba(100,181,246,0.2)",
                        },
                      ]}
                    >
                      <Ionicons name="flame" size={12} color="#64B5F6" />
                      <Text
                        style={[styles.tagText, { color: "#64B5F6" }]}
                      >
                        {currentStreak} Day Streak
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </View>
        </Animated.View>

        {/* Quick Actions Row */}
        <Animated.View
          entering={FadeInDown.duration(600).delay(160)}
          style={styles.quickActions}
        >
          <Pressable
            onPress={() => router.push("/(main)/library")}
            style={({ pressed }) => [
              styles.quickAction,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border + "30",
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <View
              style={[
                styles.quickActionIcon,
                { backgroundColor: "rgba(212,168,83,0.12)" },
              ]}
            >
              <Ionicons name="book" size={18} color={colors.gold} />
            </View>
            <Text
              style={[
                styles.quickActionLabel,
                { color: colors.textSecondary },
              ]}
            >
              My Booklets
            </Text>
          </Pressable>

          <Pressable
            onPress={() => Alert.alert("Coming Soon", "Rewards feature is coming soon!")}
            style={({ pressed }) => [
              styles.quickAction,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border + "30",
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <View
              style={[
                styles.quickActionIcon,
                { backgroundColor: "rgba(48,209,88,0.1)" },
              ]}
            >
              <Ionicons name="trophy" size={18} color={colors.success} />
            </View>
            <Text
              style={[
                styles.quickActionLabel,
                { color: colors.textSecondary },
              ]}
            >
              Rewards
            </Text>
          </Pressable>

          <Pressable
            onPress={() => Alert.alert("Coming Soon", "Achievements feature is coming soon!")}
            style={({ pressed }) => [
              styles.quickAction,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border + "30",
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <View
              style={[
                styles.quickActionIcon,
                { backgroundColor: "rgba(191,90,242,0.1)" },
              ]}
            >
              <Ionicons name="ribbon" size={18} color="#BF5AF2" />
            </View>
            <Text
              style={[
                styles.quickActionLabel,
                { color: colors.textSecondary },
              ]}
            >
              Achievements
            </Text>
          </Pressable>
        </Animated.View>

        {/* Streak Hero Card */}
        <Animated.View
          entering={FadeInDown.duration(600).delay(240)}
          style={styles.streakSection}
        >
          <LinearGradient
            colors={["#1A3A5C", "#122D4A", "#1A4060"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.streakCard}
          >
            <View style={styles.streakTop}>
              <View
                style={[
                  styles.streakBadge,
                  {
                    backgroundColor: "rgba(212,168,83,0.12)",
                    borderColor: "rgba(212,168,83,0.25)",
                  },
                ]}
              >
                <Ionicons name="flame" size={14} color={colors.gold} />
                <Text style={[styles.streakBadgeText, { color: colors.gold }]}>
                  Active Streak
                </Text>
              </View>
              <View
                style={[
                  styles.streakBadge,
                  {
                    backgroundColor: "rgba(212,168,83,0.12)",
                    borderColor: "rgba(212,168,83,0.25)",
                  },
                ]}
              >
                <Ionicons name="trophy" size={14} color={colors.gold} />
                <Text style={[styles.streakBadgeText, { color: colors.gold }]}>
                  Best: {longestStreak}
                </Text>
              </View>
            </View>

            <View style={styles.streakMain}>
              <View
                style={[
                  styles.streakFlame,
                  {
                    backgroundColor: "rgba(212,168,83,0.2)",
                    borderColor: "rgba(212,168,83,0.15)",
                  },
                ]}
              >
                <Ionicons name="flame" size={30} color={colors.gold} />
              </View>
              <View style={styles.streakNumbers}>
                <Text
                  style={[
                    styles.streakCount,
                    { color: colors.text, fontFamily: "PlayfairDisplay_700Bold" },
                  ]}
                >
                  {currentStreak}
                </Text>
                <Text
                  style={[
                    styles.streakCountLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  consecutive days
                </Text>
              </View>
            </View>

            <View style={styles.streakMeta}>
              <View style={styles.streakMetaItem}>
                <Text
                  style={[styles.streakMetaLabel, { color: colors.textSecondary }]}
                >
                  This Month
                </Text>
                <Text
                  style={[
                    styles.streakMetaValue,
                    { color: colors.text, fontFamily: "DMSans_700Bold" },
                  ]}
                >
                  {stats?.thisMonth ?? 0}
                </Text>
              </View>
              <View style={styles.streakMetaItem}>
                <Text
                  style={[styles.streakMetaLabel, { color: colors.textSecondary }]}
                >
                  Total Days
                </Text>
                <Text
                  style={[
                    styles.streakMetaValue,
                    { color: colors.text, fontFamily: "DMSans_700Bold" },
                  ]}
                >
                  {stats?.totalDays ?? 0}
                </Text>
              </View>
              <View style={styles.streakMetaItem}>
                <Text
                  style={[styles.streakMetaLabel, { color: colors.textSecondary }]}
                >
                  Level
                </Text>
                <Text
                  style={[
                    styles.streakMetaValue,
                    { color: colors.gold, fontFamily: "DMSans_700Bold" },
                  ]}
                >
                  {stats?.level ?? "Gold"}
                </Text>
              </View>
            </View>

            <View style={styles.streakProgressSection}>
              <View style={styles.streakProgressHeader}>
                <Text
                  style={[
                    styles.streakProgressLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  Progress to next tier
                </Text>
                <Text
                  style={[
                    styles.streakProgressPct,
                    { color: colors.gold, fontFamily: "DMSans_700Bold" },
                  ]}
                >
                    {levelProgress.toFixed(0)}%
                </Text>
              </View>
              <View
                style={[
                  styles.streakProgressTrack,
                  { backgroundColor: "rgba(255,255,255,0.08)" },
                ]}
              >
                <LinearGradient
                  colors={[colors.goldDark, colors.gold, "#E8C56A"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                    styles.streakProgressFill,
                    { width: `${levelProgress}%` },
                  ]}
                />
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Stats Section — Your Journey */}
        <Animated.View
          entering={FadeInDown.duration(600).delay(320)}
          style={styles.statsSection}
        >
          <View style={styles.sectionHeader}>
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.text, fontFamily: "PlayfairDisplay_700Bold" },
              ]}
            >
              Your Journey
            </Text>
            <Pressable
              onPress={() => Alert.alert("Coming Soon", "Detailed stats coming soon!")}
              style={styles.sectionLink}
            >
              <Text style={[styles.sectionLinkText, { color: colors.gold }]}>
                View All
              </Text>
              <Ionicons name="chevron-forward" size={14} color={colors.gold} />
            </Pressable>
          </View>

          {isLoading ? (
            <ActivityIndicator
              color={colors.gold}
              style={{ paddingVertical: 20 }}
            />
          ) : (
            <View style={styles.statsGrid}>
              {/* Affirmations Completed */}
              <View
                style={[
                  styles.statCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border + "30",
                  },
                ]}
              >
                <View style={styles.statCardAccentGreen} />
                <View style={styles.statIconRow}>
                  <View
                    style={[
                      styles.statIconBox,
                      { backgroundColor: "rgba(48,209,88,0.1)" },
                    ]}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={colors.success}
                    />
                  </View>
                </View>
                <Text
                  style={[
                    styles.statValue,
                    { color: colors.text, fontFamily: "PlayfairDisplay_700Bold" },
                  ]}
                >
                  {stats?.totalAffirmed ?? 0}
                </Text>
                <Text
                  style={[styles.statLabel, { color: colors.textSecondary }]}
                >
                  Affirmations Completed
                </Text>
              </View>

              {/* Daily Check-in */}
              <View
                style={[
                  styles.statCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border + "30",
                  },
                ]}
              >
                <View style={styles.statCardAccentPurple} />
                <View style={styles.statIconRow}>
                  <View
                    style={[
                      styles.statIconBox,
                      { backgroundColor: "rgba(191,90,242,0.1)" },
                    ]}
                  >
                    <Ionicons name="calendar" size={20} color="#BF5AF2" />
                  </View>
                  <View
                    style={[
                      styles.statTrend,
                      styles.statTrendUp,
                      { backgroundColor: "rgba(48,209,88,0.1)" },
                    ]}
                  >
                    <Ionicons
                      name="checkmark"
                      size={12}
                      color={colors.success}
                    />
                    <Text
                      style={[styles.statTrendText, { color: colors.success }]}
                    >
                      {stats?.completedToday ? "Done" : "Pending"}
                    </Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.statValue,
                    { color: colors.text, fontFamily: "PlayfairDisplay_700Bold" },
                  ]}
                >
                  {stats?.completedToday ? "Today" : "-"}
                </Text>
                <Text
                  style={[styles.statLabel, { color: colors.textSecondary }]}
                >
                  Daily Check-in
                </Text>
              </View>

              {/* Booklets Unlocked */}
              <View
                style={[
                  styles.statCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border + "30",
                  },
                ]}
              >
                <View style={styles.statCardAccentBlue} />
                <View style={styles.statIconRow}>
                  <View
                    style={[
                      styles.statIconBox,
                      { backgroundColor: "rgba(100,181,246,0.1)" },
                    ]}
                  >
                    <Ionicons name="library" size={20} color="#64B5F6" />
                  </View>
                  <View
                    style={[
                      styles.statTrend,
                      { backgroundColor: "rgba(255,255,255,0.05)" },
                    ]}
                  >
                    <Ionicons name="add" size={12} color={colors.textSecondary} />
                    <Text
                      style={[
                        styles.statTrendText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      New
                    </Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.statValue,
                    { color: colors.text, fontFamily: "PlayfairDisplay_700Bold" },
                  ]}
                >
                  {stats?.totalBooklets ?? 0}
                </Text>
                <Text
                  style={[styles.statLabel, { color: colors.textSecondary }]}
                >
                  Booklets Unlocked
                </Text>
              </View>

              {/* Reward Points */}
              <Pressable
            onPress={() => router.push("/(main)/store")}
                style={({ pressed }) => [
                  styles.statCard,
                  styles.statCardGold,
                  {
                    borderColor: "rgba(212,168,83,0.25)",
                    opacity: pressed ? 0.92 : 1,
                  },
                ]}
              >
                <View style={styles.statCardAccentGold} />
                <View style={styles.statIconRow}>
                  <View
                    style={[
                      styles.statIconBox,
                      { backgroundColor: "rgba(212,168,83,0.12)" },
                    ]}
                  >
                    <Ionicons name="star" size={20} color={colors.gold} />
                  </View>
                  <View
                    style={[
                      styles.statTrend,
                      styles.statTrendUp,
                      { backgroundColor: "rgba(48,209,88,0.1)" },
                    ]}
                  >
                    <Ionicons
                      name="trending-up"
                      size={12}
                      color={colors.success}
                    />
                    <Text
                      style={[styles.statTrendText, { color: colors.success }]}
                    >
                      +80
                    </Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.statValue,
                    {
                      color: colors.gold,
                      fontFamily: "PlayfairDisplay_700Bold",
                    },
                  ]}
                >
                  {(rewardBalance?.points ?? 0).toLocaleString()}
                </Text>
                <Text
                  style={[styles.statLabel, { color: colors.textSecondary }]}
                >
                  Reward Points
                </Text>
              </Pressable>
            </View>
          )}
        </Animated.View>

        {/* Settings Section */}
        <Animated.View
          entering={FadeInDown.duration(600).delay(400)}
          style={styles.settingsSection}
        >
          <View style={styles.sectionHeader}>
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.text, fontFamily: "PlayfairDisplay_700Bold" },
              ]}
            >
              Settings
            </Text>
          </View>
          <View
            style={[
              styles.settingsGroup,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border + "30",
              },
            ]}
          >
            {/* Push Notifications */}
            <View style={styles.settingsItem}>
              <View
                style={[
                  styles.settingsIcon,
                  { backgroundColor: "rgba(212,168,83,0.12)" },
                ]}
              >
                <Ionicons
                  name="notifications"
                  size={20}
                  color={colors.gold}
                />
              </View>
              <View style={styles.settingsContent}>
                <Text
                  style={[styles.settingsLabel, { color: colors.text }]}
                >
                  Push Notifications
                </Text>
                <Text
                  style={[
                    styles.settingsDesc,
                    { color: colors.textSecondary },
                  ]}
                >
                  Daily affirmation reminders
                </Text>
              </View>
              <View style={styles.settingsRight}>
                <Switch
                  value={notificationsEnabled}
                  onValueChange={handleToggleNotifications}
                  trackColor={{
                    false: colors.border,
                    true: colors.gold + "80",
                  }}
                  thumbColor={notificationsEnabled ? colors.gold : "#ccc"}
                />
              </View>
            </View>

            {/* Reminder Frequency */}
            <Pressable
              onPress={() => setShowIntervalModal(true)}
              style={({ pressed }) => [
                styles.settingsItem,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <View
                style={[
                  styles.settingsIcon,
                  { backgroundColor: "rgba(100,181,246,0.1)" },
                ]}
              >
                <Ionicons name="time" size={20} color="#64B5F6" />
              </View>
              <View style={styles.settingsContent}>
                <Text
                  style={[styles.settingsLabel, { color: colors.text }]}
                >
                  Reminder Frequency
                </Text>
                <Text
                  style={[
                    styles.settingsDesc,
                    { color: colors.textSecondary },
                  ]}
                >
                  How often to receive notifications
                </Text>
              </View>
              <View style={styles.settingsRight}>
                <Text
                  style={[
                    styles.settingsValue,
                    { color: colors.textSecondary },
                  ]}
                >
                  Every {intervalMinutes} min
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.textSecondary}
                />
              </View>
            </Pressable>

            {/* Change Password */}
            <Pressable
              onPress={() => {
                setShowChangePw(true);
                setCurrentPw("");
                setNewPw("");
                setConfirmPw("");
                setPwError("");
              }}
              style={({ pressed }) => [
                styles.settingsItem,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <View
                style={[
                  styles.settingsIcon,
                  { backgroundColor: "rgba(48,209,88,0.1)" },
                ]}
              >
                <Ionicons name="lock-closed" size={20} color={colors.success} />
              </View>
              <View style={styles.settingsContent}>
                <Text
                  style={[styles.settingsLabel, { color: colors.text }]}
                >
                  Change Password
                </Text>
                <Text
                  style={[
                    styles.settingsDesc,
                    { color: colors.textSecondary },
                  ]}
                >
                  Update your account password
                </Text>
              </View>
              <View style={styles.settingsRight}>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.textSecondary}
                />
              </View>
            </Pressable>

            {/* Language */}
            <Pressable
              onPress={() => setShowLanguageModal(true)}
              style={({ pressed }) => [
                styles.settingsItem,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <View
                style={[
                  styles.settingsIcon,
                  { backgroundColor: "rgba(191,90,242,0.1)" },
                ]}
              >
                <Ionicons name="language" size={20} color="#BF5AF2" />
              </View>
              <View style={styles.settingsContent}>
                <Text
                  style={[styles.settingsLabel, { color: colors.text }]}
                >
                  {t("settings.language")}
                </Text>
                <Text
                  style={[
                    styles.settingsDesc,
                    { color: colors.textSecondary },
                  ]}
                >
                  Select your preferred language
                </Text>
              </View>
              <View style={styles.settingsRight}>
                <Text
                  style={[
                    styles.settingsValue,
                    { color: colors.textSecondary },
                  ]}
                >
                  {SUPPORTED_LANGUAGES.find(l => l.code === currentLang)?.name ?? "English"}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.textSecondary}
                />
              </View>
            </Pressable>

            {/* Language Picker Modal */}
            <Modal visible={showLanguageModal} transparent animationType="slide" onRequestClose={() => setShowLanguageModal(false)}>
              <Pressable style={styles.modalBackdrop} onPress={() => setShowLanguageModal(false)}>
                <Pressable style={[styles.modalContent, { backgroundColor: colors.surface }]} onPress={() => {}}>
                  <Text style={[styles.modalTitle, { color: colors.text, fontFamily: "PlayfairDisplay_700Bold" }]}>
                    {t("settings.select_language")}
                  </Text>
                  <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <Pressable
                        key={lang.code}
                        onPress={() => {
                          i18n.changeLanguage(lang.code);
                          setCurrentLang(lang.code);
                          setShowLanguageModal(false);
                        }}
                        style={({ pressed }) => [
                          styles.languageItem,
                          {
                            backgroundColor: currentLang === lang.code ? colors.gold + "20" : colors.surface,
                            borderColor: currentLang === lang.code ? colors.gold : colors.border,
                            opacity: pressed ? 0.7 : 1,
                          },
                        ]}
                      >
                        <Text style={[styles.languageName, { color: colors.text, fontFamily: "DMSans_500Medium" }]}>
                          {lang.name}
                        </Text>
                        <Text style={[styles.languageNative, { color: colors.textSecondary }]}>
                          {lang.nativeName}
                        </Text>
                        {currentLang === lang.code && (
                          <Ionicons name="checkmark-circle" size={20} color={colors.gold} />
                        )}
                      </Pressable>
                    ))}
                  </ScrollView>
                </Pressable>
              </Pressable>
            </Modal>

            {/* Help & Support */}
            <Pressable
              onPress={() => Alert.alert("Support", "Contact us at support@mylifemycashflow.com")}
              style={({ pressed }) => [
                styles.settingsItem,
                {
                  borderBottomWidth: 0,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.settingsIcon,
                  { backgroundColor: "rgba(100,181,246,0.1)" },
                ]}
              >
                <Ionicons name="help-circle" size={20} color="#64B5F6" />
              </View>
              <View style={styles.settingsContent}>
                <Text
                  style={[styles.settingsLabel, { color: colors.text }]}
                >
                  Help & Support
                </Text>
                <Text
                  style={[
                    styles.settingsDesc,
                    { color: colors.textSecondary },
                  ]}
                >
                  FAQs and contact support
                </Text>
              </View>
              <View style={styles.settingsRight}>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.textSecondary}
                />
              </View>
            </Pressable>
          </View>
        </Animated.View>

        {/* Danger Zone — Sign Out */}
        <Animated.View
          entering={FadeInDown.duration(600).delay(480)}
          style={styles.dangerSection}
        >
          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => [
              styles.dangerCard,
              {
                backgroundColor: colors.surface,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <View
              style={[
                styles.settingsIcon,
                { backgroundColor: "rgba(240,100,100,0.08)" },
              ]}
            >
              <Ionicons name="log-out" size={20} color={colors.error} />
            </View>
            <View style={styles.settingsContent}>
              <Text
                style={[styles.settingsLabel, { color: colors.error }]}
              >
                Sign Out
              </Text>
              <Text
                style={[
                  styles.settingsDesc,
                  { color: colors.textSecondary },
                ]}
              >
                Sign out of your account
              </Text>
            </View>
            <View style={styles.settingsRight}>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textSecondary}
              />
            </View>
          </Pressable>
        </Animated.View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text
            style={[
              styles.footerBrand,
              { color: colors.textSecondary },
            ]}
          >
            My Life & My Cash Flow Affirmations
          </Text>
          <Text
            style={[
              styles.footerSub,
              { color: colors.textSecondary },
            ]}
          >
            A subsidiary of Zion House INT&apos;L
          </Text>
          <Text
            style={[styles.footerVersion, { color: colors.textSecondary }]}
          >
            Version 1.0.2
          </Text>
        </View>
      </ScrollView>

      {/* Interval Modal */}
      <Modal
        visible={showIntervalModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowIntervalModal(false)}
      >
        <View
          style={[
            styles.modalOverlay,
            { backgroundColor: "rgba(0,0,0,0.5)" },
          ]}
        >
          <View
            style={[styles.intervalModal, { backgroundColor: colors.surface }]}
          >
            <Text
              style={[
                styles.modalTitle,
                {
                  color: colors.text,
                  fontFamily: "PlayfairDisplay_700Bold",
                },
              ]}
            >
              Notification Frequency
            </Text>
            <Text
              style={[
                styles.modalSubtitle,
                {
                  color: colors.textSecondary,
                  fontFamily: "DMSans_400Regular",
                },
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
                    borderColor:
                      intervalMinutes === interval
                        ? colors.gold
                        : colors.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.intervalText,
                    {
                      color:
                        intervalMinutes === interval
                          ? colors.gold
                          : colors.text,
                      fontFamily: "DMSans_600SemiBold",
                    },
                  ]}
                >
                  Every {interval} minutes
                </Text>
                {intervalMinutes === interval && (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={colors.gold}
                  />
                )}
              </Pressable>
            ))}

            <Pressable
              onPress={() => setShowIntervalModal(false)}
              style={({ pressed }) => [
                styles.modalCloseButton,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text
                style={[
                  styles.modalCloseText,
                  {
                    color: colors.text,
                    fontFamily: "DMSans_600SemiBold",
                  },
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
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: colors.background,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <Text
                style={{
                  color: colors.text,
                  fontSize: 20,
                  fontFamily: "PlayfairDisplay_700Bold",
                }}
              >
                Change Password
              </Text>
              <Pressable onPress={() => setShowChangePw(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            {[
              {
                label: "Current Password",
                value: currentPw,
                setter: setCurrentPw,
                show: showCurrentPw,
                toggleShow: () => setShowCurrentPw(!showCurrentPw),
              },
              {
                label: "New Password",
                value: newPw,
                setter: setNewPw,
                show: showNewPw,
                toggleShow: () => setShowNewPw(!showNewPw),
              },
              {
                label: "Confirm New Password",
                value: confirmPw,
                setter: setConfirmPw,
                show: showNewPw,
                toggleShow: () => setShowNewPw(!showNewPw),
              },
            ].map((field) => (
              <View
                key={field.label}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  borderRadius: 12,
                  borderWidth: 1,
                  paddingHorizontal: 14,
                  height: 52,
                  marginBottom: 12,
                  backgroundColor: colors.inputBg || colors.surface,
                  borderColor: colors.border,
                }}
              >
                <TextInput
                  placeholder={field.label}
                  placeholderTextColor={colors.textSecondary}
                  value={field.value}
                  onChangeText={field.setter}
                  secureTextEntry={!field.show}
                  style={{
                    flex: 1,
                    color: colors.text,
                    fontSize: 15,
                    fontFamily: "DMSans_400Regular",
                  }}
                />
                <Pressable onPress={field.toggleShow} hitSlop={12}>
                  <Ionicons
                    name={field.show ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={colors.textSecondary}
                  />
                </Pressable>
              </View>
            ))}

            {!!pwError && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 10,
                }}
              >
                <Ionicons
                  name="alert-circle"
                  size={16}
                  color={colors.error}
                />
                <Text
                  style={{
                    color: colors.error,
                    fontSize: 13,
                    fontFamily: "DMSans_400Regular",
                    flex: 1,
                  }}
                >
                  {pwError}
                </Text>
              </View>
            )}

            <Pressable
              onPress={() => changePwMutation.mutate()}
              disabled={changePwMutation.isPending}
              style={({ pressed }) => ({
                backgroundColor: colors.tint,
                borderRadius: 14,
                height: 52,
                alignItems: "center",
                justifyContent: "center",
                marginTop: 4,
                marginBottom: 20,
                opacity:
                  pressed || changePwMutation.isPending ? 0.85 : 1,
              })}
            >
              {changePwMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text
                  style={{
                    color: "#fff",
                    fontSize: 16,
                    fontFamily: "DMSans_700Bold",
                  }}
                >
                  Save Password
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  navHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 28,
    lineHeight: 34,
  },
  navActions: {
    flexDirection: "row",
    gap: 8,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  // Profile Hero
  profileHeroOuter: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 24,
    overflow: "hidden",
  },
  profileHeroBg: {
    padding: 28,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(72,118,168,0.18)",
  },
  profileTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatarContainer: {
    position: "relative",
  },
  avatarRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    padding: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInner: {
    width: 82,
    height: 82,
    borderRadius: 41,
    overflow: "hidden",
  },
  avatarBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  profileInfo: {
    flex: 1,
    minWidth: 0,
  },
  profileNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  profileName: {
    fontSize: 20,
    flexShrink: 1,
  },
  verifiedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#D4A853",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  profileUsername: {
    fontSize: 14,
    marginBottom: 10,
  },
  profileTags: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  tagGold: {},
  tagBlue: {},
  tagText: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.3,
  },

  // Quick Actions
  quickActions: {
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  quickAction: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  quickActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },

  // Streak Card
  streakSection: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  streakCard: {
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: "rgba(212,168,83,0.25)",
  },
  streakTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  streakBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  streakMain: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 16,
    marginBottom: 24,
  },
  streakFlame: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  streakNumbers: {
    flex: 1,
  },
  streakCount: {
    fontSize: 52,
    lineHeight: 56,
  },
  streakCountLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginTop: 2,
  },
  streakMeta: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  streakMetaItem: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  streakMetaLabel: {
    fontSize: 11,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  streakMetaValue: {
    fontSize: 20,
  },
  streakProgressSection: {},
  streakProgressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  streakProgressLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  streakProgressPct: {
    fontSize: 12,
  },
  streakProgressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  streakProgressFill: {
    height: 6,
    borderRadius: 3,
    minWidth: 6,
  },

  // Stats Section
  statsSection: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
  },
  sectionLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  sectionLinkText: {
    fontSize: 13,
    fontWeight: "600",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    width: "47.5%",
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    overflow: "hidden",
  },
  statCardGold: {
    backgroundColor: "linear-gradient(160deg, #1D4260, #193A54)",
  },
  statCardAccentGreen: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: 3,
    backgroundColor: "#30D158",
  },
  statCardAccentPurple: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: 3,
    backgroundColor: "#BF5AF2",
  },
  statCardAccentBlue: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: 3,
    backgroundColor: "#64B5F6",
  },
  statCardAccentGold: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: 3,
    backgroundColor: "#D4A853",
  },
  statIconRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  statIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statTrend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statTrendUp: {},
  statTrendText: {
    fontSize: 11,
    fontWeight: "600",
  },
  statValue: {
    fontSize: 28,
    lineHeight: 32,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "500",
  },

  // Settings Section
  settingsSection: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  settingsGroup: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(72,118,168,0.18)",
  },
  settingsIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  settingsContent: {
    flex: 1,
    minWidth: 0,
  },
  settingsLabel: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  settingsDesc: {
    fontSize: 12,
  },
  settingsRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  settingsValue: {
    fontSize: 13,
    fontWeight: "500",
  },

  // Danger Zone
  dangerSection: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  dangerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(240,100,100,0.15)",
  },

  // Footer
  footer: {
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(72,118,168,0.18)",
    marginHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  footerBrand: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 4,
    opacity: 0.6,
  },
  footerSub: {
    fontSize: 11,
    opacity: 0.5,
  },
  footerVersion: {
    fontSize: 10,
    opacity: 0.3,
    marginTop: 8,
  },

  // Modals
  modalOverlay: {
    position: "absolute",
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
    gap: 12,
  },
  modalTitle: {
    fontSize: 24,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 12,
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
    marginTop: 8,
  },
  modalCloseText: {
    fontSize: 16,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 22,
    marginBottom: 16,
    textAlign: "center",
  },
  languageItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  languageName: {
    flex: 1,
    fontSize: 16,
  },
  languageNative: {
    fontSize: 14,
  },
});
