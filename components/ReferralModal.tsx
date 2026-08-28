import React from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  useColorScheme,
  ActivityIndicator,
  Share,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useThemeColors } from "@/constants/colors";

interface Props {
  visible: boolean;
  onClose: () => void;
}

interface ReferralData {
  referralCode: string;
  totalReferrals: number;
  pointsPerReferral: number;
}

export default function ReferralModal({ visible, onClose }: Props) {
  const scheme = useColorScheme();
  const colors = useThemeColors(scheme);
  const insets = useSafeAreaInsets();

  const { data, isLoading } = useQuery<ReferralData>({
    queryKey: ["/api/referral/my-code"],
    enabled: visible,
  });

  async function handleCopy() {
    if (!data?.referralCode) return;
    await Clipboard.setStringAsync(data.referralCode);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Copied!", "Your referral code has been copied to clipboard.");
  }

  async function handleShare() {
    if (!data?.referralCode) return;
    try {
      await Share.share({
        message: `Join me on My Life & My Cash Flow Affirmations! Use my referral code ${data.referralCode} when signing up to get 200 bonus points. Download the app and start your affirmation journey today! 🌟`,
        title: "Join My Life & My Cash Flow Affirmations",
      });
    } catch {
      // user cancelled
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background,
              paddingBottom: insets.bottom + 16,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconBg, { backgroundColor: colors.gold + "20" }]}>
              <Ionicons name="gift" size={22} color={colors.gold} />
            </View>
            <Text style={[styles.title, { color: colors.text, fontFamily: "PlayfairDisplay_700Bold" }]}>
              Refer & Earn
            </Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Description */}
          <Text style={[styles.desc, { color: colors.textSecondary, fontFamily: "DMSans_400Regular" }]}>
            Share your code with friends. You earn{" "}
            <Text style={{ color: colors.gold, fontFamily: "DMSans_600SemiBold" }}>
              {data?.pointsPerReferral ?? 500} pts
            </Text>{" "}
            for every friend who joins, and they get{" "}
            <Text style={{ color: colors.gold, fontFamily: "DMSans_600SemiBold" }}>200 pts</Text> as a welcome bonus.
          </Text>

          {/* Code card */}
          {isLoading ? (
            <ActivityIndicator color={colors.gold} style={{ paddingVertical: 24 }} />
          ) : (
            <View style={[styles.codeCard, { backgroundColor: colors.surface, borderColor: colors.gold + "40" }]}>
              <Text style={[styles.codeLabel, { color: colors.textSecondary, fontFamily: "DMSans_400Regular" }]}>
                Your Referral Code
              </Text>
              <Text style={[styles.code, { color: colors.gold, fontFamily: "DMSans_700Bold" }]}>
                {data?.referralCode ?? "—"}
              </Text>
              <Pressable
                onPress={handleCopy}
                style={({ pressed }) => [
                  styles.copyBtn,
                  { backgroundColor: colors.gold + "15", borderColor: colors.gold + "30", opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Ionicons name="copy-outline" size={16} color={colors.gold} />
                <Text style={[styles.copyText, { color: colors.gold, fontFamily: "DMSans_600SemiBold" }]}>
                  Copy Code
                </Text>
              </Pressable>
            </View>
          )}

          {/* Stats */}
          {data && (
            <View style={[styles.statsRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.stat}>
                <Text style={[styles.statNum, { color: colors.text, fontFamily: "DMSans_700Bold" }]}>
                  {data.totalReferrals}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary, fontFamily: "DMSans_400Regular" }]}>
                  Friends Referred
                </Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.stat}>
                <Text style={[styles.statNum, { color: colors.gold, fontFamily: "DMSans_700Bold" }]}>
                  {data.totalReferrals * data.pointsPerReferral}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary, fontFamily: "DMSans_400Regular" }]}>
                  Points Earned
                </Text>
              </View>
            </View>
          )}

          {/* Share button */}
          <Pressable
            onPress={handleShare}
            style={({ pressed }) => [
              styles.shareBtn,
              { backgroundColor: colors.tint, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Ionicons name="share-social" size={20} color="#fff" />
            <Text style={[styles.shareBtnText, { fontFamily: "DMSans_700Bold" }]}>Share with Friends</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    padding: 24,
    gap: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { flex: 1, fontSize: 20 },
  desc: { fontSize: 14, lineHeight: 22 },
  codeCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 20,
    alignItems: "center",
    gap: 8,
  },
  codeLabel: { fontSize: 12, textTransform: "uppercase", letterSpacing: 1 },
  code: { fontSize: 32, letterSpacing: 6 },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 4,
  },
  copyText: { fontSize: 13 },
  statsRow: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  stat: { flex: 1, alignItems: "center", gap: 4 },
  statNum: { fontSize: 24 },
  statLabel: { fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },
  statDivider: { width: 1, marginHorizontal: 8 },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 54,
    borderRadius: 16,
  },
  shareBtnText: { color: "#fff", fontSize: 16 },
});
