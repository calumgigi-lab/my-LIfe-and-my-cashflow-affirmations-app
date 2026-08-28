import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  useColorScheme,
  Platform,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useThemeColors } from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, queryClient } from "@/lib/query-client";
import { LinearGradient } from "expo-linear-gradient";
import { ProfilePictureUpload } from "@/components/ProfilePictureUpload";

const GENDERS = ["Female", "Male", "Prefer not to say"];

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1));
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const YEARS = Array.from({ length: 60 }, (_, i) => String(2010 - i));

export default function EditProfileScreen() {
  const { user } = useAuth();
  const scheme = useColorScheme();
  const colors = useThemeColors(scheme);
  const insets = useSafeAreaInsets();

  const [fullName, setFullName] = useState(user?.displayName ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [gender, setGender] = useState("Female");
  const [day, setDay] = useState("27");
  const [month, setMonth] = useState("August");
  const [year, setYear] = useState("1995");
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifMarketing, setNotifMarketing] = useState(false);

  useEffect(() => {
    setFullName(user?.displayName ?? "");
    setUsername(user?.username ?? "");
    setEmail(user?.email ?? "");
  }, [user]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        displayName: fullName,
        username,
        email,
        phone: phone || undefined,
        bio: bio || undefined,
        gender,
        dateOfBirth: `${year}-${String(MONTHS.indexOf(month) + 1).padStart(2, "0")}-${day.padStart(2, "0")}`,
        notificationPreferences: {
          emailNotifications: notifEmail,
          marketingEmails: notifMarketing,
        },
      };
      const res = await apiRequest("PUT", "/api/auth/profile", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      Alert.alert("Profile Updated", "Your profile has been saved successfully.", [
        { text: "OK" },
      ]);
    },
    onError: (err: any) => {
      Alert.alert("Error", err?.message || "Failed to update profile. Please try again.");
    },
  });

  const initials = (fullName || user?.username || "U")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Nav Bar */}
      <View
        style={[
          styles.nav,
          {
            paddingTop: insets.top + 16,
            backgroundColor: colors.background,
            borderBottomColor: colors.border + "30",
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.navBack,
            { opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
          <Text style={[styles.navBackText, { color: colors.text }]}>Back</Text>
        </Pressable>
        <Text
          style={[
            styles.navTitle,
            { color: colors.text, fontFamily: "PlayfairDisplay_600SemiBold" },
          ]}
        >
          Edit Profile
        </Text>
        <Pressable
          onPress={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          style={({ pressed }) => [
            styles.navSave,
            { opacity: pressed || saveMutation.isPending ? 0.6 : 1 },
          ]}
        >
          {saveMutation.isPending ? (
            <ActivityIndicator size="small" color={colors.gold} />
          ) : (
            <Text style={[styles.navSaveText, { color: colors.gold }]}>Save</Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingBottom: insets.bottom + 40,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar Section */}
        <Animated.View entering={FadeInDown.duration(500).delay(50)} style={styles.avatarSection}>
          <View>
            <LinearGradient
              colors={[colors.gold, colors.goldDark, colors.gold]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarRing}
            >
              <View style={[styles.avatarInner, { backgroundColor: colors.surface }]}>
                <ProfilePictureUpload
                  currentImageUrl={user?.profilePictureUrl || undefined}
                  displayName={user?.displayName || user?.username || "U"}
                  size={102}
                  editable
                />
              </View>
            </LinearGradient>
            <View style={[styles.avatarEditBadge, { backgroundColor: colors.gold, borderColor: colors.background }]}>
              <Ionicons name="camera" size={14} color="#1A1A1A" />
            </View>
          </View>
          <Pressable>
            <Text style={[styles.changePhotoText, { color: colors.gold }]}>Change Photo</Text>
          </Pressable>
        </Animated.View>

        {/* Form Fields Card */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(120)}
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border + "30" }]}
        >
          {/* Full Name */}
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Full Name</Text>
            <View style={[styles.inputWrap, { backgroundColor: colors.inputBg }]}>
              <Ionicons name="person-outline" size={18} color={colors.textSecondary + "80"} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name"
                placeholderTextColor={colors.textSecondary + "60"}
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* Username */}
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Username</Text>
            <View style={[styles.inputWrap, { backgroundColor: colors.inputBg }]}>
              <Ionicons name="at-outline" size={18} color={colors.textSecondary + "80"} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={username}
                onChangeText={setUsername}
                placeholder="Choose a username"
                placeholderTextColor={colors.textSecondary + "60"}
                autoCapitalize="none"
              />
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            </View>
          </View>

          {/* Email */}
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Email</Text>
            <View style={[styles.inputWrap, { backgroundColor: colors.inputBg }]}>
              <Ionicons name="mail-outline" size={18} color={colors.textSecondary + "80"} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor={colors.textSecondary + "60"}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <View style={styles.verifiedBadge}>
                <Ionicons name="shield-checkmark" size={10} color={colors.success} />
                <Text style={[styles.verifiedText, { color: colors.success }]}>Verified</Text>
              </View>
            </View>
          </View>

          {/* Phone */}
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Phone (optional)</Text>
            <View style={[styles.inputWrap, { backgroundColor: colors.inputBg }]}>
              <Ionicons name="call-outline" size={18} color={colors.textSecondary + "80"} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter phone number"
                placeholderTextColor={colors.textSecondary + "60"}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Bio */}
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Bio</Text>
            <View style={[styles.inputWrap, styles.inputWrapMultiline, { backgroundColor: colors.inputBg }]}>
              <Ionicons name="document-text-outline" size={18} color={colors.textSecondary + "80"} style={{ marginTop: 12 }} />
              <TextInput
                style={[styles.input, styles.inputMultiline, { color: colors.text }]}
                value={bio}
                onChangeText={setBio}
                placeholder="Tell us about yourself..."
                placeholderTextColor={colors.textSecondary + "60"}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>
        </Animated.View>

        {/* Date of Birth Card */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(180)}
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border + "30" }]}
        >
          <Text
            style={[
              styles.cardLabel,
              {
                color: colors.textSecondary,
                fontFamily: "PlayfairDisplay_600SemiBold",
              },
            ]}
          >
            Date of Birth
          </Text>
          <View style={styles.dobRow}>
            <View style={styles.dobField}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Day</Text>
              <Pressable
                style={[styles.dobSelector, { backgroundColor: colors.inputBg }]}
                onPress={() => {
                  const idx = DAYS.indexOf(day);
                  setDay(DAYS[(idx + 1) % DAYS.length]);
                }}
              >
                <Text style={[styles.dobText, { color: colors.text }]}>{day}</Text>
                <Ionicons name="chevron-down" size={14} color={colors.textSecondary} style={{ marginLeft: "auto" }} />
              </Pressable>
            </View>
            <View style={styles.dobField}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Month</Text>
              <Pressable
                style={[styles.dobSelector, { backgroundColor: colors.inputBg }]}
                onPress={() => {
                  const idx = MONTHS.indexOf(month);
                  setMonth(MONTHS[(idx + 1) % MONTHS.length]);
                }}
              >
                <Text style={[styles.dobText, { color: colors.text }]}>{month}</Text>
                <Ionicons name="chevron-down" size={14} color={colors.textSecondary} style={{ marginLeft: "auto" }} />
              </Pressable>
            </View>
            <View style={styles.dobField}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Year</Text>
              <Pressable
                style={[styles.dobSelector, { backgroundColor: colors.inputBg }]}
                onPress={() => {
                  const idx = YEARS.indexOf(year);
                  setYear(YEARS[(idx + 1) % YEARS.length]);
                }}
              >
                <Text style={[styles.dobText, { color: colors.text }]}>{year}</Text>
                <Ionicons name="chevron-down" size={14} color={colors.textSecondary} style={{ marginLeft: "auto" }} />
              </Pressable>
            </View>
          </View>
        </Animated.View>

        {/* Gender Card */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(240)}
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border + "30" }]}
        >
          <Text
            style={[
              styles.cardLabel,
              {
                color: colors.textSecondary,
                fontFamily: "PlayfairDisplay_600SemiBold",
              },
            ]}
          >
            Gender
          </Text>
          <View style={styles.genderRow}>
            {GENDERS.map((g) => (
              <Pressable
                key={g}
                onPress={() => {
                  setGender(g);
                  if (Platform.OS !== "web") {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
                style={({ pressed }) => [
                  styles.genderChip,
                  {
                    backgroundColor: gender === g ? "rgba(212,168,83,0.12)" : "transparent",
                    borderColor: gender === g ? "rgba(212,168,83,0.4)" : colors.border + "30",
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.genderChipText,
                    {
                      color: gender === g ? colors.gold : colors.textSecondary,
                    },
                  ]}
                >
                  {g}
                </Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* Notifications Card */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(300)}
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border + "30" }]}
        >
          <Text
            style={[
              styles.cardLabel,
              {
                color: colors.textSecondary,
                fontFamily: "PlayfairDisplay_600SemiBold",
              },
            ]}
          >
            Notifications
          </Text>

          {/* Email Notifications Toggle */}
          <View style={[styles.toggleRow, { borderBottomColor: colors.border + "20" }]}>
            <View style={styles.toggleInfo}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>
                Email Notifications
              </Text>
              <Text style={[styles.toggleDesc, { color: colors.textSecondary }]}>
                Receive affirmation reminders via email
              </Text>
            </View>
            <Pressable
              onPress={() => {
                setNotifEmail(!notifEmail);
                if (Platform.OS !== "web") {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }}
              style={[
                styles.toggleTrack,
                {
                  backgroundColor: notifEmail ? colors.success : colors.inputBg,
                  borderColor: notifEmail ? colors.success : colors.border + "30",
                },
              ]}
            >
              <View
                style={[
                  styles.toggleThumb,
                  { transform: [{ translateX: notifEmail ? 20 : 1 }] },
                ]}
              />
            </Pressable>
          </View>

          {/* Marketing Emails Toggle */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>
                Marketing Emails
              </Text>
              <Text style={[styles.toggleDesc, { color: colors.textSecondary }]}>
                New features, offers &amp; faith content
              </Text>
            </View>
            <Pressable
              onPress={() => {
                setNotifMarketing(!notifMarketing);
                if (Platform.OS !== "web") {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }}
              style={[
                styles.toggleTrack,
                {
                  backgroundColor: notifMarketing ? colors.success : colors.inputBg,
                  borderColor: notifMarketing ? colors.success : colors.border + "30",
                },
              ]}
            >
              <View
                style={[
                  styles.toggleThumb,
                  { transform: [{ translateX: notifMarketing ? 20 : 1 }] },
                ]}
              />
            </Pressable>
          </View>
        </Animated.View>

        {/* Danger Section */}
        <Animated.View entering={FadeInDown.duration(500).delay(360)}>
          <Pressable
            onPress={() =>
              Alert.alert(
                "Delete Account",
                "Are you sure you want to delete your account? This action cannot be undone.",
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "Delete", style: "destructive" },
                ]
              )
            }
            style={({ pressed }) => [
              styles.dangerCard,
              {
                backgroundColor: "rgba(255,69,58,0.06)",
                borderColor: "rgba(255,69,58,0.12)",
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Ionicons name="trash-outline" size={20} color="#FF453A" />
            <Text style={styles.dangerText}>Delete Account</Text>
            <Ionicons name="chevron-forward" size={18} color="#FF453A" style={{ opacity: 0.5 }} />
          </Pressable>
        </Animated.View>

        {/* Save Button */}
        <Animated.View entering={FadeInDown.duration(500).delay(420)} style={styles.saveSection}>
          <Pressable
            onPress={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            style={({ pressed }) => [
              styles.saveBtn,
              {
                opacity: pressed || saveMutation.isPending ? 0.9 : 1,
              },
            ]}
          >
            {saveMutation.isPending ? (
              <ActivityIndicator color="#1A1A1A" />
            ) : (
              <Text style={styles.saveBtnText}>Save Changes</Text>
            )}
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    position: "relative",
  },
  navBack: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  navBackText: {
    fontSize: 15,
    fontFamily: "DMSans_400Regular",
  },
  navTitle: {
    fontSize: 19,
    fontFamily: "PlayfairDisplay_700Bold",
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
  },
  navSave: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  navSaveText: {
    fontSize: 15,
    fontFamily: "DMSans_600SemiBold",
  },

  // Avatar
  avatarSection: {
    alignItems: "center",
    paddingVertical: 28,
    gap: 12,
  },
  avatarRing: {
    width: 108,
    height: 108,
    borderRadius: 999,
    padding: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInner: {
    width: 102,
    height: 102,
    borderRadius: 999,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEditBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  changePhotoText: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.3,
  },

  // Cards
  card: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 12,
  },

  // Fields
  field: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.4,
    marginBottom: 6,
    paddingLeft: 2,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  inputWrapMultiline: {
    alignItems: "flex-start",
    minHeight: 80,
    paddingVertical: 4,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "DMSans_400Regular",
    paddingVertical: 13,
  },
  inputMultiline: {
    paddingVertical: 13,
    minHeight: 60,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(48,209,88,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.3,
  },

  // DOB
  dobRow: {
    flexDirection: "row",
    gap: 10,
  },
  dobField: {
    flex: 1,
  },
  dobSelector: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 13,
  },
  dobText: {
    fontSize: 15,
    fontFamily: "DMSans_400Regular",
  },

  // Gender
  genderRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  genderChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 40,
    borderWidth: 1.5,
  },
  genderChipText: {
    fontSize: 13,
    fontFamily: "DMSans_500Medium",
    letterSpacing: 0.2,
  },

  // Toggle
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  toggleInfo: {
    flex: 1,
    gap: 2,
  },
  toggleLabel: {
    fontSize: 14,
    fontFamily: "DMSans_500Medium",
  },
  toggleDesc: {
    fontSize: 12,
  },
  toggleTrack: {
    width: 48,
    height: 28,
    borderRadius: 14,
    position: "relative",
    borderWidth: 1.5,
    flexShrink: 0,
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: "#fff",
    position: "absolute",
    top: 1.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },

  // Danger
  dangerCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    gap: 14,
  },
  dangerText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
    color: "#FF453A",
  },

  // Save Button
  saveSection: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  saveBtn: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 20,
    backgroundColor: "#D4A853",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#D4A853",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 6,
  },
  saveBtnText: {
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
    color: "#1A1A1A",
    letterSpacing: 0.5,
  },
});
