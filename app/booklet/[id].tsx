import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useColorScheme,
  ScrollView,
  Platform,
  ActivityIndicator,
  Image,
  ImageSourcePropType,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useThemeColors } from "@/constants/colors";
import { getApiUrl, queryClient, apiRequest } from "@/lib/query-client";
import { purchaseBooklet, getBookletProductId } from "@/lib/booklet-purchases";
import { PaymentDetailsModal } from "@/components/PaymentDetailsModal";

const bookletCovers: Partial<Record<number, ImageSourcePropType>> = {
  1: require("../../book thumbnail/january.png"),
  2: require("../../book thumbnail/february.png"),
  3: require("../../book thumbnail/march.png"),
  5: require("../../book thumbnail/may.png"),
  6: require("../../book thumbnail/june.png"),
  8: require("../../book thumbnail/august.png"),
  9: require("../../book thumbnail/september.png"),
  10: require("../../book thumbnail/october.png"),
  11: require("../../book thumbnail/november.png"),
  12: require("../../book thumbnail/december.png"),
};

function AffirmationItem({ aff, index, colors, locked }: any) {
  const affirmationImageUrl = aff.imageUrl
    ? (aff.imageUrl.startsWith("http")
      ? aff.imageUrl
      : new URL(aff.imageUrl, getApiUrl()).toString())
    : null;

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(index * 60)}>
      <Pressable
        onPress={() => {
          if (locked) return;
          router.push({ pathname: "/affirmation/[id]", params: { id: aff.id.toString() } });
        }}
        style={({ pressed }) => [
          styles.affItem,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: pressed ? 0.92 : 1,
          },
        ]}
      >
        {locked && (
          <View style={styles.lockedOverlayInCard}>
            <Ionicons name="lock-closed" size={18} color="#fff" />
            <Text style={styles.lockedOverlayText}>Locked - Preview available for Day 1 and 2 only</Text>
          </View>
        )}
        <View style={styles.affItemMain}>
          <View style={[styles.dayCircle, { backgroundColor: colors.goldLight }]}>
            <Text style={[styles.dayCircleText, { color: colors.gold, fontFamily: "DMSans_700Bold" }]}>
              {aff.dayNumber}
            </Text>
          </View>
          <View style={styles.affItemContent}>
            <Text style={[styles.affItemTitle, { color: colors.text, fontFamily: "DMSans_600SemiBold" }]}>
              {aff.title}
            </Text>
            <Text
              style={[styles.affItemPreview, { color: colors.textSecondary, fontFamily: "DMSans_400Regular" }]}
              numberOfLines={2}
            >
              {aff.content.split("\n\n")[0]}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </View>
        {affirmationImageUrl && (
          <Image
            source={{ uri: affirmationImageUrl }}
            style={[styles.affItemImage, { backgroundColor: colors.surfaceSecondary }]}
            resizeMode="cover"
          />
        )}
      </Pressable>
    </Animated.View>
  );
}

export default function BookletDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme();
  const colors = useThemeColors(scheme);
  const insets = useSafeAreaInsets();

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isPendingPayment, setIsPendingPayment] = useState(false);

  const { data: booklet, isLoading: bookletLoading } = useQuery<any>({
    queryKey: ["/api/booklets", id],
  });

  const { data: affirmationsList, isLoading: affsLoading } = useQuery<any[]>({
    queryKey: [`/api/booklets/${id}/affirmations`],
  });

  const { data: accessData } = useQuery<{
    bookletId: number;
    unlocked: boolean;
    previewDays: number;
    monthlyPriceNaira: number;
  }>({
    queryKey: [`/api/booklets/${id}/access`],
    enabled: !!id,
  });

  // Mutation to record payment after user confirms they made it
  const recordPaymentMutation = useMutation({
    mutationFn: async () => {
      const productId = getBookletProductId({ month: booklet.month, year: booklet.year });
      const response = await apiRequest("POST", "/api/purchases/verify", {
        bookletId: Number(id),
        platform: Platform.OS,
        productId,
        transactionId: `manual_${Platform.OS}_${id}_${Date.now()}`,
        purchaseToken: `manual_${productId}_${Date.now()}`,
      });
      return response.json();
    },
    onSuccess: () => {
      setShowPaymentModal(false);
      setIsPendingPayment(true);
      queryClient.invalidateQueries({ queryKey: [`/api/booklets/${id}/access`] });
      Alert.alert(
        "Payment Recorded",
        "Your payment is pending admin verification. You'll be able to access the full month once approved.",
      );
    },
    onError: (error: any) => {
      Alert.alert(
        "Error",
        error?.message || "Could not record payment. Please try again.",
      );
    },
  });

  const isLoading = bookletLoading || affsLoading;
  const coverSource = booklet?.month ? bookletCovers[booklet.month] : undefined;
  const previewDays = accessData?.previewDays ?? 2;
  const isUnlocked = accessData?.unlocked ?? false;
  const monthlyPriceNaira = accessData?.monthlyPriceNaira ?? 1500;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 8,
            backgroundColor: colors.background,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text
          style={[styles.headerTitle, { color: colors.text, fontFamily: "DMSans_600SemiBold" }]}
          numberOfLines={1}
        >
          {booklet?.title || "Loading..."}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {booklet && (
          <View style={styles.bookletHeader}>
            <Image
              source={require("@/assets/images/app-logo.png")}
              style={styles.appLogoHeader}
              resizeMode="contain"
            />
            {coverSource ? (
              <Image source={coverSource} style={styles.bookletCoverLarge} resizeMode="cover" />
            ) : (
              <View style={[styles.bookletIconLarge, { backgroundColor: (booklet.coverColor || colors.gold) + "20" }]}>
                <Ionicons name="book" size={40} color={booklet.coverColor || colors.gold} />
              </View>
            )}
            <Text style={[styles.bookletTitle, { color: colors.text, fontFamily: "PlayfairDisplay_700Bold" }]}>
              {booklet.title}
            </Text>
            {booklet.description && (
              <Text style={[styles.bookletDesc, { color: colors.textSecondary, fontFamily: "DMSans_400Regular" }]}>
                {booklet.description}
              </Text>
            )}
            <Text style={[styles.affCount, { color: colors.gold, fontFamily: "DMSans_600SemiBold" }]}>
              {affirmationsList?.length ?? 0} Daily Affirmations
            </Text>

            {/* Lock Banner - Unlocked */}
            {isUnlocked && (
              <View
                style={[
                  styles.lockBanner,
                  { backgroundColor: "#4CAF5030", borderColor: "#4CAF50", borderWidth: 1 },
                ]}
              >
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                <Text style={[styles.lockBannerText, { color: "#4CAF50", fontWeight: "600" }]}>
                  ✓ Unlocked - Full access to all {affirmationsList?.length ?? 0} days
                </Text>
              </View>
            )}

            {/* Lock Banner - Pending Approval */}
            {!isUnlocked && isPendingPayment && (
              <View
                style={[
                  styles.lockBanner,
                  { backgroundColor: "#FF980030", borderColor: "#FF9800", borderWidth: 1 },
                ]}
              >
                <ActivityIndicator size="small" color="#FF9800" />
                <Text style={[styles.lockBannerText, { color: "#FF9800", fontWeight: "600", flex: 1 }]}>
                  Pending admin approval - You'll get access soon
                </Text>
              </View>
            )}

            {/* Lock Banner - Locked (preview available) */}
            {!isUnlocked && !isPendingPayment && (
              <View style={[styles.lockBanner, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                <Ionicons name="lock-closed" size={16} color={colors.gold} />
                <Text style={[styles.lockBannerText, { color: colors.text }]}>
                  Days 1-{previewDays} are free. Unlock full month for ₦{monthlyPriceNaira}.
                </Text>
                <Pressable
                  onPress={() => setShowPaymentModal(true)}
                  disabled={recordPaymentMutation.isPending}
                  style={({ pressed }) => [
                    styles.unlockInlineButton,
                    { backgroundColor: colors.tint, opacity: pressed || recordPaymentMutation.isPending ? 0.85 : 1 },
                  ]}
                >
                  {recordPaymentMutation.isPending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.unlockInlineButtonText}>Unlock</Text>
                  )}
                </Pressable>
              </View>
            )}
          </View>
        )}

        {isLoading ? (
          <ActivityIndicator size="large" color={colors.gold} style={{ paddingVertical: 40 }} />
        ) : (
          <View style={styles.affList}>
            {affirmationsList?.map((aff: any, index: number) => (
              <AffirmationItem
                key={aff.id}
                aff={aff}
                index={index}
                colors={colors}
                locked={!isUnlocked && aff.dayNumber > previewDays}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Payment Details Modal */}
      <PaymentDetailsModal
        visible={showPaymentModal}
        bookletTitle={booklet?.title || ""}
        amount={monthlyPriceNaira}
        onConfirmPayment={async () => {
          await recordPaymentMutation.mutateAsync();
        }}
        onCancel={() => setShowPaymentModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 17, flex: 1, textAlign: "center" },
  scrollContent: { paddingHorizontal: 20 },
  bookletHeader: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 10,
  },
  appLogoHeader: {
    width: 100,
    height: 100,
    borderRadius: 20,
    marginBottom: 8,
  },
  bookletIconLarge: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  bookletCoverLarge: {
    width: 80,
    height: 80,
    borderRadius: 24,
    marginBottom: 8,
  },
  bookletTitle: { fontSize: 26, textAlign: "center" },
  bookletDesc: { fontSize: 14, textAlign: "center", lineHeight: 20, paddingHorizontal: 20 },
  affCount: { fontSize: 14, marginTop: 4 },
  affList: { gap: 10 },
  affItem: {
    flexDirection: "column",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    overflow: "hidden",
  },
  lockedOverlayInCard: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    backgroundColor: "rgba(8, 18, 34, 0.55)",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12,
  },
  lockedOverlayText: {
    color: "#fff",
    fontSize: 12,
    textAlign: "center",
    fontFamily: "DMSans_600SemiBold",
  },
  affItemMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  affItemImage: {
    width: "100%",
    height: 140,
    borderRadius: 10,
    marginTop: 4,
  },
  dayCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircleText: { fontSize: 17 },
  affItemContent: { flex: 1 },
  affItemTitle: { fontSize: 18, marginBottom: 6, lineHeight: 24 },
  affItemPreview: { fontSize: 15, lineHeight: 22 },
  lockBanner: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
    width: "100%",
    alignItems: "center",
  },
  lockBannerText: {
    fontSize: 13,
    textAlign: "center",
    fontFamily: "DMSans_500Medium",
  },
  unlockInlineButton: {
    height: 34,
    minWidth: 86,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  unlockInlineButtonText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "DMSans_700Bold",
  },
});
