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
  Image,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/lib/auth-context";
import { useThemeColors } from "@/constants/colors";

export default function LoginScreen() {
  const { login } = useAuth();
  const scheme = useColorScheme();
  const colors = useThemeColors(scheme);
  const insets = useSafeAreaInsets();
  const buttonGradient = [colors.tint, colors.tintLight, colors.goldDark] as const;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await login(email.trim(), password);
      router.replace("/(main)");
    } catch (err: any) {
      const rawMessage = String(err?.message || err || "");

      if (rawMessage.toLowerCase().includes("network request failed")) {
        setError("Cannot reach server. Check Wi-Fi/network and try again.");
      } else if (rawMessage.includes("401")) {
        setError("Invalid email or password");
      } else {
        let resolvedMessage: string | null = null;

        const jsonStart = rawMessage.indexOf("{");
        if (jsonStart >= 0) {
          try {
            const parsed = JSON.parse(rawMessage.slice(jsonStart));
            if (parsed?.message) {
              resolvedMessage = parsed.message;
            }
          } catch {
            // Ignore JSON parse failures and use fallback extraction below.
          }
        }

        if (!resolvedMessage && rawMessage.includes(":")) {
          const maybeMessage = rawMessage.split(":").slice(1).join(":").trim();
          if (maybeMessage && !maybeMessage.startsWith("{")) {
            resolvedMessage = maybeMessage;
          }
        }

        setError(resolvedMessage || "Something went wrong. Please try again.");
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
              paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 40,
            },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headerSection}>
            <Image
              source={require("@/assets/images/app-logo.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={[styles.subtitle, { color: colors.textSecondary, fontFamily: "DMSans_400Regular" }]}>
              Affirm your way to abundance
            </Text>
          </View>

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

            <View style={[styles.inputContainer, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text, fontFamily: "DMSans_400Regular" }]}
                placeholder="Password"
                placeholderTextColor={colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={12}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={colors.textSecondary}
                />
              </Pressable>
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
              onPress={handleLogin}
              disabled={loading}
              style={({ pressed }) => [
                styles.button,
                { opacity: pressed ? 0.9 : 1 },
              ]}
            >
              <LinearGradient
                colors={buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.buttonGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[styles.buttonText, { fontFamily: "DMSans_700Bold" }]}>
                    Sign In
                  </Text>
                )}
              </LinearGradient>
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary, fontFamily: "DMSans_400Regular" }]}>
              Don't have an account?
            </Text>
            <Pressable onPress={() => router.push("/(auth)/register")}>
              <Text style={[styles.footerLink, { color: colors.gold, fontFamily: "DMSans_600SemiBold" }]}>
                Sign Up
              </Text>
            </Pressable>
          </View>

          <View style={styles.brandingFooter}>
            <Text style={[styles.brandingText, { color: colors.textSecondary + "80", fontFamily: "DMSans_400Regular" }]}>
              My Life & My Cash Flow Affirmations
            </Text>
            <Text style={[styles.brandingSubtext, { color: colors.textSecondary + "60", fontFamily: "DMSans_400Regular" }]}>
              A subsidiary of Zion House INT'L
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    justifyContent: "center",
  },
  headerSection: {
    alignItems: "center",
    marginBottom: 48,
  },
  logoImage: {
    width: 280,
    height: 280,
    borderRadius: 40,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
  },
  formSection: {
    gap: 16,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: "100%",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  errorText: {
    fontSize: 14,
  },
  button: {
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 8,
  },
  buttonGradient: {
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 17,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 32,
  },
  footerText: {
    fontSize: 15,
  },
  footerLink: {
    fontSize: 15,
  },
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
});
