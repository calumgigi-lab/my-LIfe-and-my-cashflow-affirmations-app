import React from "react";
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  Pressable,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors } from "@/constants/colors";

export interface AppUpdateInfo {
  enabled: boolean;
  minVersionCode: number;
  force: boolean;
  title: string;
  message: string;
  url: string;
}

export function AppUpdateScreen({ appUpdate }: { appUpdate: AppUpdateInfo }) {
  const scheme = useColorScheme();
  const colors = useThemeColors(scheme);
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.goldLight, borderColor: colors.gold }]}>
        <Ionicons name="cloud-download" size={40} color={colors.gold} />
      </View>

      <Text style={[styles.title, { color: colors.text, fontFamily: "PlayfairDisplay_700Bold" }]}>
        {appUpdate.title || "Update required"}
      </Text>

      <Text style={[styles.message, { color: colors.textSecondary, fontFamily: "DMSans_400Regular" }]}>
        {appUpdate.message}
      </Text>

      <Pressable
        onPress={() => Linking.openURL(appUpdate.url)}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: pressed ? colors.tintDark : colors.tint },
        ]}
      >
        <Ionicons name="logo-google-playstore" size={18} color={colors.background} />
        <Text style={[styles.buttonText, { color: colors.background, fontFamily: "DMSans_600SemiBold" }]}>
          Update now
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: { fontSize: 28, textAlign: "center", marginBottom: 16 },
  message: { fontSize: 16, lineHeight: 24, textAlign: "center", marginBottom: 28 },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    minWidth: 180,
    justifyContent: "center",
  },
  buttonText: { fontSize: 16 },
});
