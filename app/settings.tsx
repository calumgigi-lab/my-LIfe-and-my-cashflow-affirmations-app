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

const LANGUAGES = ["English", "French", "Spanish", "Portuguese", "Arabic", "Swahili"];
const THEMES = ["Dark", "Light"];

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  const { data: notifSettings } = useQuery<any>({
    queryKey: ["/api/notification-settings"],
  });

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [intervalMinutes, setIntervalMinutes] = useState(30);
  const [showIntervalModal, setShowIntervalModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [selectedTheme, setSelectedTheme] = useState("Dark");

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
        await scheduleAffirmationReminders(startHour, endHour, intervalMinutes);
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

  function handleLogout() {
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

  function handleDeleteAccount() {
    Alert.alert(
      "Delete Account",
      "This action is permanent and cannot be undone. Are you sure you want to delete your account?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Alert.alert("Account Deleted", "Your account has been deleted.");
          },
        },
      ]
    );
  }

  function handleEditProfile() {
    router.push("/edit-profile");
  }

  function handleEmail() {
    Alert.alert("Email Address", "Navigate to email settings.");
  }

  function handleReminderHours() {
    Alert.alert("Reminder Hours", "Navigate to reminder hours settings.");
  }

  function handleHelpSupport() {
    Alert.alert("Help & Support", "Navigate to help & support.");
  }

  function handlePrivacyPolicy() {
    Alert.alert("Privacy Policy", "Navigate to privacy policy.");
  }

  function handleTermsOfService() {
    Alert.alert("Terms of Service", "Navigate to terms of service.");
  }

  const initials = (user?.displayName || user?.username || "U")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const maskedEmail = user?.email
    ? user.email.replace(/(.{3})(.*)(@.*)/, "$1***$3")
    : "user***@email.com";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingBottom: 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Nav Bar */}
        <View style={styles.navBar}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.navBack,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border + "30",
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>
          <Text
            style={[
              styles.navTitle,
              { color: colors.text, fontFamily: "PlayfairDisplay_700Bold" },
            ]}
          >
            Settings
          </Text>
        </View>

        {/* Profile Card */}
        <Animated.View entering={FadeInDown.duration(500).delay(20)}>
          <Pressable
            onPress={handleEditProfile}
            style={({ pressed }) => [
              styles.profileCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border + "30",
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <View style={styles.avatarOuter}>
              <View
                style={[
                  styles.avatar,
                  { backgroundColor: colors.surfaceSecondary },
                ]}
              >
                <Text
                  style={[
                    styles.avatarInitials,
                    { color: colors.gold, fontFamily: "PlayfairDisplay_700Bold" },
                  ]}
                >
                  {initials}
                </Text>
              </View>
            </View>
            <View style={styles.profileInfo}>
              <Text
                style={[
                  styles.profileName,
                  { color: colors.text, fontFamily: "PlayfairDisplay_700Bold" },
                ]}
                numberOfLines={1}
              >
                {user?.displayName || user?.username}
              </Text>
              <Text
                style={[styles.profileUsername, { color: colors.textSecondary }]}
              >
                @{user?.username}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textSecondary}
            />
          </Pressable>
        </Animated.View>

        {/* Account Section */}
        <Text
          style={[
            styles.sectionLabel,
            { color: colors.textSecondary },
          ]}
        >
          Account
        </Text>
        <Animated.View
          entering={FadeInDown.duration(500).delay(60)}
          style={[
            styles.cardGroup,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border + "30",
            },
          ]}
        >
          <Pressable
            onPress={handleEditProfile}
            style={({ pressed }) => [
              styles.settingItem,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View
              style={[
                styles.settingIcon,
                { backgroundColor: "rgba(212,168,83,0.12)" },
              ]}
            >
              <Ionicons name="person-outline" size={20} color={colors.gold} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Edit Profile
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textSecondary}
            />
          </Pressable>

          <Pressable
            onPress={() => {
              setShowChangePw(true);
              setCurrentPw("");
              setNewPw("");
              setConfirmPw("");
              setPwError("");
            }}
            style={({ pressed }) => [
              styles.settingItem,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View
              style={[
                styles.settingIcon,
                { backgroundColor: "rgba(48,209,88,0.1)" },
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={colors.success}
              />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Change Password
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textSecondary}
            />
          </Pressable>

          <Pressable
            onPress={handleEmail}
            style={({ pressed }) => [
              styles.settingItem,
              { borderBottomWidth: 0, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View
              style={[
                styles.settingIcon,
                { backgroundColor: "rgba(100,181,246,0.1)" },
              ]}
            >
              <Ionicons name="mail-outline" size={20} color="#64B5F6" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Email Address
              </Text>
            </View>
            <View style={styles.settingRight}>
              <Text
                style={[styles.settingValue, { color: colors.textSecondary }]}
              >
                {maskedEmail}
              </Text>
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={12} color={colors.success} />
                <Text style={[styles.verifiedText, { color: colors.success }]}>
                  Verified
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textSecondary}
              />
            </View>
          </Pressable>
        </Animated.View>

        {/* Preferences Section */}
        <Text
          style={[
            styles.sectionLabel,
            { color: colors.textSecondary },
          ]}
        >
          Preferences
        </Text>
        <Animated.View
          entering={FadeInDown.duration(500).delay(120)}
          style={[
            styles.cardGroup,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border + "30",
            },
          ]}
        >
          {/* Push Notifications */}
          <View style={styles.settingItem}>
            <View
              style={[
                styles.settingIcon,
                { backgroundColor: "rgba(212,168,83,0.12)" },
              ]}
            >
              <Ionicons
                name="notifications-outline"
                size={20}
                color={colors.gold}
              />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Push Notifications
              </Text>
              <Text
                style={[styles.settingDesc, { color: colors.textSecondary }]}
              >
                Receive affirmation reminders
              </Text>
            </View>
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

          {/* Reminder Frequency */}
          <Pressable
            onPress={() => setShowIntervalModal(true)}
            style={({ pressed }) => [
              styles.settingItem,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View
              style={[
                styles.settingIcon,
                { backgroundColor: "rgba(100,181,246,0.1)" },
              ]}
            >
              <Ionicons name="time-outline" size={20} color="#64B5F6" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Reminder Frequency
              </Text>
            </View>
            <View style={styles.settingRight}>
              <Text
                style={[styles.settingValue, { color: colors.textSecondary }]}
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

          {/* Daily Reminder Hours */}
          <Pressable
            onPress={handleReminderHours}
            style={({ pressed }) => [
              styles.settingItem,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View
              style={[
                styles.settingIcon,
                { backgroundColor: "rgba(191,90,242,0.1)" },
              ]}
            >
              <Ionicons name="alarm-outline" size={20} color="#BF5AF2" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Daily Reminder Hours
              </Text>
            </View>
            <View style={styles.settingRight}>
              <Text
                style={[styles.settingValue, { color: colors.textSecondary }]}
              >
                8:00 AM – 9:00 PM
              </Text>
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
              styles.settingItem,
              { borderBottomWidth: 0, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View
              style={[
                styles.settingIcon,
                { backgroundColor: "rgba(100,181,246,0.1)" },
              ]}
            >
              <Ionicons name="globe-outline" size={20} color="#64B5F6" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Language
              </Text>
            </View>
            <View style={styles.settingRight}>
              <Text
                style={[styles.settingValue, { color: colors.textSecondary }]}
              >
                {selectedLanguage}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textSecondary}
              />
            </View>
          </Pressable>
        </Animated.View>

        {/* Appearance Section */}
        <Text
          style={[
            styles.sectionLabel,
            { color: colors.textSecondary },
          ]}
        >
          Appearance
        </Text>
        <Animated.View
          entering={FadeInDown.duration(500).delay(190)}
          style={[
            styles.cardGroup,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border + "30",
            },
          ]}
        >
          <Pressable
            onPress={() => setShowThemeModal(true)}
            style={({ pressed }) => [
              styles.settingItem,
              { borderBottomWidth: 0, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View
              style={[
                styles.settingIcon,
                { backgroundColor: "rgba(191,90,242,0.1)" },
              ]}
            >
              <Ionicons
                name="color-palette-outline"
                size={20}
                color="#BF5AF2"
              />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Theme
              </Text>
            </View>
            <View style={styles.settingRight}>
              <Text
                style={[styles.settingValue, { color: colors.textSecondary }]}
              >
                {selectedTheme}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textSecondary}
              />
            </View>
          </Pressable>
        </Animated.View>

        {/* Support Section */}
        <Text
          style={[
            styles.sectionLabel,
            { color: colors.textSecondary },
          ]}
        >
          Support
        </Text>
        <Animated.View
          entering={FadeInDown.duration(500).delay(260)}
          style={[
            styles.cardGroup,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border + "30",
            },
          ]}
        >
          <Pressable
            onPress={handleHelpSupport}
            style={({ pressed }) => [
              styles.settingItem,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View
              style={[
                styles.settingIcon,
                { backgroundColor: "rgba(100,181,246,0.1)" },
              ]}
            >
              <Ionicons
                name="help-circle-outline"
                size={20}
                color="#64B5F6"
              />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Help & Support
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textSecondary}
            />
          </Pressable>

          <Pressable
            onPress={handlePrivacyPolicy}
            style={({ pressed }) => [
              styles.settingItem,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View
              style={[
                styles.settingIcon,
                { backgroundColor: "rgba(100,181,246,0.1)" },
              ]}
            >
              <Ionicons
                name="document-text-outline"
                size={20}
                color="#64B5F6"
              />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Privacy Policy
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textSecondary}
            />
          </Pressable>

          <Pressable
            onPress={handleTermsOfService}
            style={({ pressed }) => [
              styles.settingItem,
              { borderBottomWidth: 0, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View
              style={[
                styles.settingIcon,
                { backgroundColor: "rgba(100,181,246,0.1)" },
              ]}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color="#64B5F6"
              />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Terms of Service
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textSecondary}
            />
          </Pressable>
        </Animated.View>

        {/* Danger Zone */}
        <Text
          style={[
            styles.sectionLabel,
            { color: colors.textSecondary },
          ]}
        >
          Danger Zone
        </Text>
        <Animated.View
          entering={FadeInDown.duration(500).delay(330)}
          style={[
            styles.cardGroup,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border + "30",
            },
          ]}
        >
          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => [
              styles.settingItem,
              styles.dangerItem,
              { opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <View
              style={[
                styles.settingIcon,
                { backgroundColor: "rgba(240,100,100,0.08)" },
              ]}
            >
              <Ionicons name="log-out-outline" size={20} color={colors.error} />
            </View>
            <View style={styles.settingInfo}>
              <Text
                style={[styles.settingLabel, { color: colors.error, fontWeight: "600" }]}
              >
                Sign Out
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.error} />
          </Pressable>

          <Pressable
            onPress={handleDeleteAccount}
            style={({ pressed }) => [
              styles.settingItem,
              { borderBottomWidth: 0, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <View
              style={[
                styles.settingIcon,
                { backgroundColor: "rgba(240,100,100,0.08)" },
              ]}
            >
              <Ionicons name="trash-outline" size={20} color={colors.error} />
            </View>
            <View style={styles.settingInfo}>
              <Text
                style={[styles.settingLabel, { color: colors.error, fontSize: 14 }]}
              >
                Delete Account
              </Text>
              <Text
                style={[styles.settingDesc, { color: colors.textSecondary, fontSize: 11 }]}
              >
                This action is permanent and cannot be undone
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.error} />
          </Pressable>
        </Animated.View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text
            style={[styles.footerBrand, { color: colors.textSecondary }]}
          >
            Global Affirmation Hub
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
        <View style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
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
                  <Ionicons name="checkmark-circle" size={20} color={colors.gold} />
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
                  { color: colors.text, fontFamily: "DMSans_600SemiBold" },
                ]}
              >
                Done
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Language Modal */}
      <Modal
        visible={showLanguageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text
              style={[
                styles.modalTitle,
                { color: colors.text, fontFamily: "PlayfairDisplay_700Bold" },
              ]}
            >
              Language
            </Text>
            <Text
              style={[
                styles.modalSubtitle,
                { color: colors.textSecondary, fontFamily: "DMSans_400Regular" },
              ]}
            >
              Select your preferred language
            </Text>
            {LANGUAGES.map((lang) => (
              <Pressable
                key={lang}
                onPress={() => {
                  setSelectedLanguage(lang);
                  setShowLanguageModal(false);
                }}
                style={({ pressed }) => [
                  styles.intervalOption,
                  {
                    backgroundColor:
                      selectedLanguage === lang
                        ? colors.gold + "20"
                        : colors.inputBg,
                    borderColor:
                      selectedLanguage === lang
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
                        selectedLanguage === lang
                          ? colors.gold
                          : colors.text,
                      fontFamily: "DMSans_600SemiBold",
                    },
                  ]}
                >
                  {lang}
                </Text>
                {selectedLanguage === lang && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.gold} />
                )}
              </Pressable>
            ))}
            <Pressable
              onPress={() => setShowLanguageModal(false)}
              style={({ pressed }) => [
                styles.modalCloseButton,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text
                style={[
                  styles.modalCloseText,
                  { color: colors.text, fontFamily: "DMSans_600SemiBold" },
                ]}
              >
                Cancel
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Theme Modal */}
      <Modal
        visible={showThemeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowThemeModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text
              style={[
                styles.modalTitle,
                { color: colors.text, fontFamily: "PlayfairDisplay_700Bold" },
              ]}
            >
              Theme
            </Text>
            <Text
              style={[
                styles.modalSubtitle,
                { color: colors.textSecondary, fontFamily: "DMSans_400Regular" },
              ]}
            >
              Choose your preferred appearance
            </Text>
            {THEMES.map((theme) => (
              <Pressable
                key={theme}
                onPress={() => {
                  setSelectedTheme(theme);
                  setShowThemeModal(false);
                }}
                style={({ pressed }) => [
                  styles.intervalOption,
                  {
                    backgroundColor:
                      selectedTheme === theme
                        ? colors.gold + "20"
                        : colors.inputBg,
                    borderColor:
                      selectedTheme === theme
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
                        selectedTheme === theme
                          ? colors.gold
                          : colors.text,
                      fontFamily: "DMSans_600SemiBold",
                    },
                  ]}
                >
                  {theme}
                </Text>
                {selectedTheme === theme && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.gold} />
                )}
              </Pressable>
            ))}
            <Pressable
              onPress={() => setShowThemeModal(false)}
              style={({ pressed }) => [
                styles.modalCloseButton,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text
                style={[
                  styles.modalCloseText,
                  { color: colors.text, fontFamily: "DMSans_600SemiBold" },
                ]}
              >
                Cancel
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
                <Ionicons name="alert-circle" size={16} color={colors.error} />
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
                opacity: pressed || changePwMutation.isPending ? 0.85 : 1,
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
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 14,
    marginBottom: 8,
    gap: 14,
  },
  navBack: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: {
    fontSize: 20,
    lineHeight: 26,
  },

  // Profile Card
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  avatarOuter: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2.5,
    borderColor: "rgba(212,168,83,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: 16,
    letterSpacing: 1,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 14,
    minWidth: 0,
  },
  profileName: {
    fontSize: 17,
    lineHeight: 22,
  },
  profileUsername: {
    fontSize: 13,
    marginTop: 1,
  },

  // Section Labels
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    paddingHorizontal: 24,
    marginBottom: 10,
    marginTop: 28,
  },

  // Card Groups
  cardGroup: {
    marginHorizontal: 16,
    marginBottom: 6,
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },

  // Setting Items
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(72,118,168,0.18)",
    gap: 14,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  settingInfo: {
    flex: 1,
    minWidth: 0,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: "500",
    lineHeight: 20,
  },
  settingDesc: {
    fontSize: 12.5,
    marginTop: 2,
    lineHeight: 16,
  },
  settingRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  settingValue: {
    fontSize: 13.5,
    fontWeight: "500",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(48,209,88,0.1)",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  verifiedText: {
    fontSize: 10.5,
    fontWeight: "600",
  },

  // Danger
  dangerItem: {
    borderColor: "rgba(240,100,100,0.3)",
  },

  // Footer
  footer: {
    alignItems: "center",
    paddingTop: 36,
    paddingBottom: 20,
  },
  footerBrand: {
    fontSize: 16,
    fontWeight: "600",
    opacity: 0.6,
  },
  footerVersion: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.7,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modalContent: {
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
});
