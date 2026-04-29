import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useThemeColors } from "@/constants/colors";
import { apiRequest } from "@/lib/query-client";

type Step = "email" | "reset";

export default function ForgotPasswordScreen() {
  const scheme = useColorScheme();
  const colors = useThemeColors(scheme);
  const insets = useSafeAreaInsets();
  const buttonGradient = [colors.tint, colors.tintLight, colors.goldDark] as const;

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  async function handleRequestReset() {
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await apiRequest("POST", "/api/auth/forgot-password", { email: email.trim() });
      setSuccessMessage(
        "A 6-digit reset code has been sent to your email. Check your inbox (or ask an admin if you don't receive it).",
      );
      setStep("reset");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword() {
    if (!otpCode.trim() || otpCode.length !== 6) {
      setError("Please enter the 6-digit code from your email");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await apiRequest("POST", "/api/auth/reset-password", {
        email: email.trim(),
        otpCode: otpCode.trim(),
        newPassword,
      });
      setError("");
      router.replace("/(auth)/login");
    } catch (err: any) {
      const msg = String(err?.message || "");
      if (msg.includes("Invalid or expired")) {
        setError("That code is invalid or has expired. Please request a new one.");
      } else {
        setError("Reset failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 40,
              paddingBottom: insets.bottom + 40,
            },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>

          <View style={styles.headerSection}>
            <View style={[styles.iconCircle, { backgroundColor: colors.tint + "20" }]}>
              <Ionicons name="lock-open-outline" size={40} color={colors.tint} />
            </View>
            <Text style={[styles.title, { color: colors.text, fontFamily: "PlayfairDisplay_700Bold" }]}>
              {step === "email" ? "Forgot Password" : "Reset Password"}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary, fontFamily: "DMSans_400Regular" }]}>
              {step === "email"
                ? "Enter your account email to receive a reset code"
                : `Enter the code sent to ${email}`}
            </Text>
          </View>

          {step === "email" ? (
            <View style={styles.formSection}>
              <View style={[styles.inputContainer, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <Ionicons name="mail-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text, fontFamily: "DMSans_400Regular" }]}
                  placeholder="Email address"
                  placeholderTextColor={colors.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {!!error && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={16} color={colors.error} />
                  <Text style={[styles.errorText, { color: colors.error, fontFamily: "DMSans_400Regular" }]}>
                    {error}
                  </Text>
                </View>
              )}

              <Pressable
                onPress={handleRequestReset}
                disabled={loading}
                style={({ pressed }) => [styles.button, { opacity: pressed ? 0.9 : 1 }]}
              >
                <LinearGradient colors={buttonGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.buttonGradient}>
                  {loading ? <ActivityIndicator color="#fff" /> : (
                    <Text style={[styles.buttonText, { fontFamily: "DMSans_700Bold" }]}>Send Reset Code</Text>
                  )}
                </LinearGradient>
              </Pressable>
            </View>
          ) : (
            <View style={styles.formSection}>
              {!!successMessage && (
                <View style={[styles.successBox, { backgroundColor: colors.tint + "15", borderColor: colors.tint + "40" }]}>
                  <Ionicons name="checkmark-circle-outline" size={16} color={colors.tint} />
                  <Text style={[styles.successText, { color: colors.tint, fontFamily: "DMSans_400Regular" }]}>
                    {successMessage}
                  </Text>
                </View>
              )}

              <View style={[styles.inputContainer, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <Ionicons name="keypad-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.otpInput, { color: colors.text, fontFamily: "DMSans_700Bold" }]}
                  placeholder="6-digit code"
                  placeholderTextColor={colors.textSecondary}
                  value={otpCode}
                  onChangeText={(t) => setOtpCode(t.replace(/\D/g, "").slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>

              <View style={[styles.inputContainer, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text, fontFamily: "DMSans_400Regular" }]}
                  placeholder="New password (min 6 characters)"
                  placeholderTextColor={colors.textSecondary}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showPassword}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={12}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textSecondary} />
                </Pressable>
              </View>

              <View style={[styles.inputContainer, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text, fontFamily: "DMSans_400Regular" }]}
                  placeholder="Confirm new password"
                  placeholderTextColor={colors.textSecondary}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                />
              </View>

              {!!error && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={16} color={colors.error} />
                  <Text style={[styles.errorText, { color: colors.error, fontFamily: "DMSans_400Regular" }]}>
                    {error}
                  </Text>
                </View>
              )}

              <Pressable
                onPress={handleResetPassword}
                disabled={loading}
                style={({ pressed }) => [styles.button, { opacity: pressed ? 0.9 : 1 }]}
              >
                <LinearGradient colors={buttonGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.buttonGradient}>
                  {loading ? <ActivityIndicator color="#fff" /> : (
                    <Text style={[styles.buttonText, { fontFamily: "DMSans_700Bold" }]}>Reset Password</Text>
                  )}
                </LinearGradient>
              </Pressable>

              <Pressable onPress={() => { setStep("email"); setError(""); setSuccessMessage(""); }} style={styles.retryLink}>
                <Text style={[styles.retryText, { color: colors.textSecondary, fontFamily: "DMSans_400Regular" }]}>
                  Didn&apos;t receive a code?{" "}
                  <Text style={{ color: colors.gold, fontFamily: "DMSans_600SemiBold" }}>Try again</Text>
                </Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 28, justifyContent: "center" },
  backButton: { width: 44, height: 44, justifyContent: "center", marginBottom: 8 },
  headerSection: { alignItems: "center", marginBottom: 36 },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: "center", justifyContent: "center", marginBottom: 20,
  },
  title: { fontSize: 30, lineHeight: 38, marginBottom: 10, textAlign: "center" },
  subtitle: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  formSection: { gap: 16 },
  inputContainer: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, height: 56,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, height: "100%" },
  otpInput: { fontSize: 22, letterSpacing: 10, textAlign: "center" },
  errorContainer: { flexDirection: "row", alignItems: "center", gap: 6 },
  errorText: { fontSize: 14, flex: 1 },
  successBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    padding: 12, borderRadius: 12, borderWidth: 1,
  },
  successText: { fontSize: 13, flex: 1, lineHeight: 20 },
  button: { borderRadius: 14, overflow: "hidden", marginTop: 4 },
  buttonGradient: { height: 56, alignItems: "center", justifyContent: "center" },
  buttonText: { color: "#fff", fontSize: 17 },
  retryLink: { alignItems: "center", paddingVertical: 8 },
  retryText: { fontSize: 14, textAlign: "center" },
});
