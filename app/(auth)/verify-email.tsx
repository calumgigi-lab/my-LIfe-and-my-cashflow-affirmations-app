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
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth-context";
import { useThemeColors } from "@/constants/colors";
import { apiRequest } from "@/lib/query-client";

export default function VerifyEmailScreen() {
  const { email: paramEmail } = useLocalSearchParams<{ email?: string }>();
  const { user, updateUser } = useAuth();
  const scheme = useColorScheme();
  const colors = useThemeColors(scheme);
  const insets = useSafeAreaInsets();

  const email = (paramEmail as string) || user?.email || "";
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleVerify() {
    if (!email || otpCode.trim().length < 6) {
      setError("Enter the 6-digit code from your email");
      return;
    }
    setLoading(true);
    setError("");
    setInfo("");
    try {
      const res = await apiRequest("POST", "/api/auth/verify-email", {
        email,
        otpCode: otpCode.trim(),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Verification failed");
      }
      const data = await res.json();
      await updateUser(data);
      router.replace("/(main)");
    } catch (err: any) {
      setError(err.message || "Invalid or expired code");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!email) return;
    setResending(true);
    setError("");
    setInfo("");
    try {
      await apiRequest("POST", "/api/auth/resend-verification", { email });
      setOtpCode("");
      setInfo("A new code was sent. Enter the latest code from your email (older codes still work for 60 minutes).");
    } catch {
      setInfo("A new code was sent if your email is registered. Check your inbox and spam.");
    } finally {
      setResending(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Pressable onPress={() => router.back()} style={styles.closeBtn} hitSlop={16}>
        <Ionicons name="close" size={28} color={colors.text} />
      </Pressable>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 32,
            paddingHorizontal: 24,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.iconWrap, { backgroundColor: colors.gold + "20" }]}>
            <Ionicons name="mail-open-outline" size={40} color={colors.gold} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Verify your email</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            We sent a 6-digit code to{"\n"}
            <Text style={{ fontFamily: "DMSans_600SemiBold", color: colors.text }}>{email}</Text>
            {"\n"}The code expires in 60 minutes. Check your inbox and spam folder.
          </Text>

          <TextInput
            value={otpCode}
            onChangeText={(t) => setOtpCode(t.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            placeholderTextColor={colors.textSecondary}
            keyboardType="number-pad"
            maxLength={6}
            style={[
              styles.otpInput,
              { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.border },
            ]}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {info ? <Text style={[styles.info, { color: colors.gold }]}>{info}</Text> : null}

          <Pressable
            onPress={handleVerify}
            disabled={loading}
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: colors.tint, opacity: pressed || loading ? 0.85 : 1 },
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Verify Email</Text>
            )}
          </Pressable>

          <Pressable onPress={handleResend} disabled={resending} style={styles.resendBtn}>
            <Text style={[styles.resendText, { color: colors.gold }]}>
              {resending ? "Sending…" : "Resend code"}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontFamily: "PlayfairDisplay_700Bold",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    fontFamily: "DMSans_400Regular",
    marginBottom: 28,
  },
  otpInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontSize: 28,
    letterSpacing: 12,
    textAlign: "center",
    fontFamily: "DMSans_700Bold",
    marginBottom: 12,
  },
  error: {
    color: "#E53935",
    textAlign: "center",
    marginBottom: 12,
    fontFamily: "DMSans_400Regular",
  },
  info: {
    textAlign: "center",
    marginBottom: 12,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "DMSans_400Regular",
  },
  primaryBtn: {
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
  },
  resendBtn: {
    paddingVertical: 16,
    alignItems: "center",
  },
  resendText: {
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
  },
  closeBtn: {
    position: "absolute",
    top: 60,
    right: 20,
    zIndex: 10,
  },
});
