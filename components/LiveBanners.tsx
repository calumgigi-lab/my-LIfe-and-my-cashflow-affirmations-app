import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Linking,
  useColorScheme,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors } from "@/constants/colors";
import type { AppUpdateInfo } from "@/components/AppUpdateScreen";

export interface AnnouncementInfo {
  enabled: boolean;
  id: string;
  title: string;
  message: string;
  level: string;
}

const ANNOUNCEMENT_DISMISS_KEY = "dismissed_announcement_id";
const UPDATE_DISMISS_KEY = "dismissed_update_version";

const LEVEL_COLORS: Record<string, string> = {
  info: "#2196F3",
  success: "#4CAF50",
  warning: "#E3A24B",
};

interface Props {
  announcement: AnnouncementInfo | null;
  /** Pass the soft (non-forced) update info, or null when no update banner should show. */
  softUpdate: AppUpdateInfo | null;
}

export function LiveBanners({ announcement, softUpdate }: Props) {
  const scheme = useColorScheme();
  const colors = useThemeColors(scheme);
  const insets = useSafeAreaInsets();

  const [dismissedAnnouncementId, setDismissedAnnouncementId] = useState<string | null>(null);
  const [dismissedUpdateVersion, setDismissedUpdateVersion] = useState<number | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ANNOUNCEMENT_DISMISS_KEY).then(setDismissedAnnouncementId).catch(() => {});
    AsyncStorage.getItem(UPDATE_DISMISS_KEY)
      .then((v) => setDismissedUpdateVersion(v ? parseInt(v, 10) : null))
      .catch(() => {});
  }, []);

  const showAnnouncement =
    !!announcement &&
    announcement.enabled &&
    !!announcement.message &&
    dismissedAnnouncementId !== announcement.id;

  const showUpdate =
    !!softUpdate &&
    softUpdate.enabled &&
    dismissedUpdateVersion !== softUpdate.minVersionCode;

  if (!showAnnouncement && !showUpdate) return null;

  const dismissAnnouncement = () => {
    if (!announcement) return;
    setDismissedAnnouncementId(announcement.id);
    AsyncStorage.setItem(ANNOUNCEMENT_DISMISS_KEY, announcement.id).catch(() => {});
  };

  const dismissUpdate = () => {
    if (!softUpdate) return;
    setDismissedUpdateVersion(softUpdate.minVersionCode);
    AsyncStorage.setItem(UPDATE_DISMISS_KEY, String(softUpdate.minVersionCode)).catch(() => {});
  };

  return (
    <View style={[styles.wrap, { top: insets.top + 6 }]} pointerEvents="box-none">
      {showAnnouncement && announcement && (
        <View
          style={[
            styles.banner,
            { backgroundColor: colors.surface, borderColor: LEVEL_COLORS[announcement.level] || LEVEL_COLORS.info },
          ]}
        >
          <View style={[styles.accent, { backgroundColor: LEVEL_COLORS[announcement.level] || LEVEL_COLORS.info }]} />
          <View style={styles.bannerBody}>
            {!!announcement.title && (
              <Text style={[styles.bannerTitle, { color: colors.text }]} numberOfLines={1}>
                {announcement.title}
              </Text>
            )}
            <Text style={[styles.bannerMessage, { color: colors.textSecondary }]} numberOfLines={4}>
              {announcement.message}
            </Text>
          </View>
          <Pressable onPress={dismissAnnouncement} hitSlop={10} style={styles.close}>
            <Ionicons name="close" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>
      )}

      {showUpdate && softUpdate && (
        <View style={[styles.banner, { backgroundColor: colors.surface, borderColor: colors.gold }]}>
          <View style={[styles.accent, { backgroundColor: colors.gold }]} />
          <View style={styles.bannerBody}>
            <Text style={[styles.bannerTitle, { color: colors.text }]} numberOfLines={1}>
              {softUpdate.title || "Update available"}
            </Text>
            <Text style={[styles.bannerMessage, { color: colors.textSecondary }]} numberOfLines={3}>
              {softUpdate.message}
            </Text>
            <Pressable onPress={() => Linking.openURL(softUpdate.url)} style={styles.updateBtn}>
              <Ionicons name="logo-google-playstore" size={14} color={colors.gold} />
              <Text style={[styles.updateBtnText, { color: colors.gold }]}>Update now</Text>
            </Pressable>
          </View>
          <Pressable onPress={dismissUpdate} hitSlop={10} style={styles.close}>
            <Ionicons name="close" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 1000,
    gap: 8,
  },
  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    paddingRight: 8,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  accent: { width: 4, alignSelf: "stretch" },
  bannerBody: { flex: 1, paddingVertical: 10, paddingHorizontal: 12, gap: 3 },
  bannerTitle: { fontSize: 14, fontFamily: "DMSans_700Bold" },
  bannerMessage: { fontSize: 13, lineHeight: 18, fontFamily: "DMSans_400Regular" },
  close: { paddingVertical: 10, paddingHorizontal: 4 },
  updateBtn: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  updateBtnText: { fontSize: 13, fontFamily: "DMSans_600SemiBold" },
});
