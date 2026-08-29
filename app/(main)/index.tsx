import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useColorScheme,
  ScrollView,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
  Share,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery, useMutation } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { useAuth } from "@/lib/auth-context";
import { useThemeColors } from "@/constants/colors";
import { apiRequest, getApiUrl, queryClient } from "@/lib/query-client";
import { purchaseBooklet } from "@/lib/booklet-purchases";
import { PaymentDetailsModal } from "@/components/PaymentDetailsModal";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { useTranslatedAffirmation } from "@/lib/use-translated-content";

const PREVIEW_LINES = 4;

export default function TodayScreen() {
  const { user } = useAuth();
  const scheme = useColorScheme();
  const colors = useThemeColors(scheme);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [savedHero, setSavedHero] = useState(false);
  const [completedAffirmation, setCompletedAffirmation] = useState(false);
  const [expandedAff, setExpandedAff] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [adminBonusAwarded, setAdminBonusAwarded] = useState(false);
  const cardRef = useRef<View>(null);

  useEffect(() => {
    if (user && !adminBonusAwarded) {
      setAdminBonusAwarded(true);
      apiRequest("POST", "/api/rewards/admin-daily").catch(() => {});
    }
  }, [user]);

  const { data: todayAff, isLoading: affLoading, refetch: refetchAff } = useQuery<any>({
    queryKey: ["/api/affirmations/today"],
  });

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery<any>({
    queryKey: ["/api/stats"],
  });

  const { data: rewards } = useQuery<any>({
    queryKey: ["/api/rewards/balance"],
  });

  const { data: completionCheck } = useQuery<any>({
    queryKey: ["/api/completions/check", todayAff?.id?.toString()],
    enabled: !!todayAff?.id,
  });

  const { data: todayAccess } = useQuery<{
    bookletId: number;
    unlocked: boolean;
    previewDays: number;
    monthlyPriceNaira: number;
  }>({
    queryKey: ["/api/booklets", todayAff?.bookletId, "access"],
    enabled: !!todayAff?.bookletId,
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/booklets/${todayAff.bookletId}/access`);
      return response.json();
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (affirmationId: number) => {
      const res = await apiRequest("POST", `/api/affirmations/${affirmationId}/complete`);
      return res.json();
    },
    onSuccess: (data: any) => {
      setCompletedAffirmation(true);
      queryClient.setQueryData(["/api/completions/check", todayAff?.id?.toString()], { completed: true });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/completions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/completions/check"] });
      queryClient.invalidateQueries({ queryKey: ["/api/streak"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rewards/balance"] });
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
    onError: (error: any) => {
      Alert.alert("Error", error?.message || "Could not mark as affirmed. Please try again.");
    },
  });

  const unlockMutation = useMutation({
    mutationFn: async () => {
      const productId = `affirmation_${todayAff.bookletMonth}_${todayAff.bookletYear}`;
      const response = await apiRequest("POST", "/api/purchases/verify", {
        bookletId: Number(todayAff.bookletId),
        platform: Platform.OS,
        productId,
        transactionId: `manual_${Platform.OS}_${todayAff.bookletId}_${Date.now()}`,
        purchaseToken: `manual_${productId}_${Date.now()}`,
      });
      return response.json();
    },
    onSuccess: () => {
      setShowPaymentModal(false);
      queryClient.invalidateQueries({ queryKey: ["/api/booklets/access"] });
      queryClient.invalidateQueries({ queryKey: ["/api/booklets", todayAff?.bookletId, "access"] });
    },
    onError: (error: any) => {
      Alert.alert("Payment Error", error?.message || "Could not record payment. Please try again.");
    },
  });

  const isCompleted = completionCheck?.completed === true || completedAffirmation || completeMutation.isSuccess;
  const previewDays = todayAccess?.previewDays ?? 2;
  const isTodayLocked = !!todayAff && todayAccess?.unlocked === false && todayAff.dayNumber > previewDays;
  const monthlyPriceNaira = todayAccess?.monthlyPriceNaira ?? 1500;
  const todayImageUrl = todayAff?.imageUrl
    ? (todayAff.imageUrl.startsWith("http") || todayAff.imageUrl.startsWith("data:")
      ? todayAff.imageUrl
      : new URL(todayAff.imageUrl, getApiUrl()).toString())
    : null;
  const isLoading = affLoading || statsLoading;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchAff(), refetchStats()]);
    await new Promise((r) => setTimeout(r, 800));
    setRefreshing(false);
  }, []);

  const now = new Date();
  const greeting =
    now.getHours() < 12 ? t("today.greeting_morning") : now.getHours() < 17 ? t("today.greeting_afternoon") : t("today.greeting_evening");
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const formattedDate = `${dayNames[now.getDay()]}, ${monthNames[now.getMonth()]} ${now.getDate()}`;

  const streakCount = stats?.currentStreak ?? 0;
  const totalAffirmed = stats?.totalAffirmed ?? 0;
  const bestStreak = stats?.longestStreak ?? 0;
  const streakProgress = Math.min(streakCount / 42, 1);

  // Time-based progress
  const currentHour = now.getHours();
  const isMorning = currentHour >= 5 && currentHour < 12;
  const isAfternoon = currentHour >= 12 && currentHour < 17;
  const isEvening = currentHour >= 17 || currentHour < 5;
  const completedCount = isCompleted ? 1 : 0;
  const totalSlots = isMorning ? 1 : isAfternoon ? 2 : 3;
  const progressPercent = Math.round((completedCount / totalSlots) * 100);

  const morningDone = isCompleted && isMorning;
  const afternoonDone = isCompleted && isAfternoon;
  const eveningDone = isCompleted && isEvening;

  // Affirmation preview text
  const { translatedTitle, translatedContent } = useTranslatedAffirmation(todayAff?.title, todayAff?.content);
  const fullContent = translatedContent || todayAff?.content || todayAff?.title || "";
  const displayTitle = translatedTitle || todayAff?.title;
  const isLongContent = fullContent.length > 200;
  const previewContent = isLongContent ? fullContent.slice(0, 200).trim() + "..." : fullContent;
  const displayContent = expandedAff || !isLongContent ? fullContent : previewContent;

  // Share as screenshot
  const handleShare = async () => {
    if (Platform.OS !== "web") {
      try {
        const uri = await captureRef(cardRef, {
          format: "png",
          quality: 1,
        });
        await Sharing.shareAsync(uri, {
          mimeType: "image/png",
          dialogTitle: "Share Today's Affirmation",
        });
      } catch {
        // Fallback to text share
        Share.share({
          message: `${displayTitle || "Today's Affirmation"}\n\n${fullContent}\n\n— My Life & My Cashflow Affirmations`,
        });
      }
    } else {
      Share.share({
        message: `${displayTitle || "Today's Affirmation"}\n\n${fullContent}\n\n— My Life & My Cashflow Affirmations`,
      });
    }
  };

  // Recent affirmations from stats
  const recentAffirmations = stats?.recentAffirmations?.slice(0, 3) ?? [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 72,
            paddingBottom: 120,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} colors={[colors.gold]} progressBackgroundColor={colors.surface} />
        }
      >
        {/* Greeting Header */}
        <Animated.View entering={FadeInDown.duration(600).delay(100)}>
          <View style={styles.greetingRow}>
            <Ionicons name="sunny" size={26} color={colors.gold} style={styles.greetingIcon} />
            <Text
              style={[
                styles.greetingText,
                { color: colors.text, fontFamily: "PlayfairDisplay_600SemiBold" },
              ]}
            >
              {greeting}, {user?.displayName || user?.username || "Friend"}
            </Text>
          </View>
          <Text
            style={[
              styles.greetingDate,
              { color: colors.textSecondary, fontFamily: "DMSans_400Regular" },
            ]}
          >
            {formattedDate}
          </Text>
        </Animated.View>

        {/* Daily Streak Banner */}
        <Animated.View
          entering={FadeInDown.duration(600).delay(180)}
          style={[
            styles.streakBanner,
            {
              backgroundColor: "rgba(212,168,83,0.12)",
              borderColor: "rgba(212,168,83,0.25)",
            },
          ]}
        >
          <View style={styles.streakTop}>
            <View style={styles.streakLeft}>
              <Ionicons name="flame" size={22} color={colors.gold} />
              <Text
                style={[
                  styles.streakCount,
                  { color: colors.gold, fontFamily: "PlayfairDisplay_600SemiBold" },
                ]}
              >
                {streakCount}
              </Text>
              <Text
                style={[
                  styles.streakLabel,
                  { color: colors.textSecondary, fontFamily: "DMSans_400Regular" },
                ]}
              >
                Day Streak
              </Text>
            </View>
            <Text
              style={[
                styles.streakMilestone,
                { color: colors.textSecondary, fontFamily: "DMSans_400Regular" },
              ]}
            >
              {streakCount}/{bestStreak > 0 ? bestStreak + 1 : 42} to beat personal best · {rewards?.totalEarned ?? 0} pts
            </Text>
          </View>
          <View style={styles.streakProgressTrack}>
            <LinearGradient
              colors={[colors.gold, colors.goldDark, "#E0B96A"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.streakProgressFill, { width: `${Math.max(streakProgress * 100, 2)}%` }]}
            />
          </View>
        </Animated.View>

        {/* Stats Row */}
        <Animated.View
          entering={FadeInDown.duration(600).delay(240)}
          style={[styles.statsRow, { backgroundColor: colors.surface, borderColor: "rgba(255,255,255,0.12)" }]}
        >
          <View style={[styles.statItem]}>
            <Text
              style={[
                styles.statValue,
                { color: colors.gold, fontFamily: "PlayfairDisplay_700Bold" },
              ]}
            >
              {totalAffirmed}
            </Text>
            <Text
              style={[
                styles.statLabel,
                { color: colors.textSecondary, fontFamily: "DMSans_500Medium" },
              ]}
            >
              Affirmed
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: "rgba(255,255,255,0.1)" }]} />
          <View style={[styles.statItem]}>
            <Text
              style={[
                styles.statValue,
                { color: colors.gold, fontFamily: "PlayfairDisplay_700Bold" },
              ]}
            >
              {stats?.unlockedBooklets ?? 0}
            </Text>
            <Text
              style={[
                styles.statLabel,
                { color: colors.textSecondary, fontFamily: "DMSans_500Medium" },
              ]}
            >
              Booklets
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: "rgba(255,255,255,0.1)" }]} />
          <View style={[styles.statItem]}>
            <Text
              style={[
                styles.statValue,
                { color: colors.gold, fontFamily: "PlayfairDisplay_700Bold" },
              ]}
            >
              {bestStreak}
            </Text>
            <Text
              style={[
                styles.statLabel,
                { color: colors.textSecondary, fontFamily: "DMSans_500Medium" },
              ]}
            >
              Best Streak
            </Text>
          </View>
        </Animated.View>

        {/* Hero Affirmation Card */}
        <Animated.View entering={FadeInUp.duration(700).delay(300)}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.gold} />
            </View>
          ) : todayAff ? (
            <>
              <View ref={cardRef} collapsable={false}>
                <LinearGradient
                  colors={["rgba(212,168,83,0.35)", "rgba(212,168,83,0.08)", "rgba(212,168,83,0.25)"]}
                  start={{ x: 0.3, y: 0 }}
                  end={{ x: 0.7, y: 1 }}
                  style={styles.affirmationCardBorder}
                >
                  <View
                    style={[
                      styles.affirmationCardInner,
                      { backgroundColor: colors.surface },
                    ]}
                  >
                    <Text style={[styles.quoteMarkOpen, { color: "rgba(212,168,83,0.07)" }]}>
                      {"\u201C"}
                    </Text>
                    <Text style={[styles.quoteMarkClose, { color: "rgba(212,168,83,0.05)" }]}>
                      {"\u201D"}
                    </Text>

                    <View
                      style={[
                        styles.affirmationBadge,
                        {
                          backgroundColor: "rgba(212,168,83,0.12)",
                          borderColor: "rgba(212,168,83,0.25)",
                        },
                      ]}
                    >
                      <View style={[styles.badgeDot, { backgroundColor: colors.gold }]} />
                      <Text
                        style={[
                          styles.badgeText,
                          { color: colors.gold, fontFamily: "DMSans_600SemiBold" },
                        ]}
                      >
                        {displayTitle || t("today.todays_affirmation")}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.affirmationQuote,
                        { color: colors.text, fontFamily: "PlayfairDisplay_500Medium" },
                      ]}
                    >
                      {displayContent}
                    </Text>

                    {isLongContent && (
                      <Pressable onPress={() => setExpandedAff(!expandedAff)}>
                        <Text
                          style={[
                            styles.readMoreLink,
                            { color: colors.gold, fontFamily: "DMSans_600SemiBold" },
                          ]}
                        >
                          {expandedAff ? "Show Less" : "Read Full Affirmation"}
                        </Text>
                      </Pressable>
                    )}

                    <Text
                      style={[
                        styles.affirmationAttribution,
                        { color: colors.textSecondary, fontFamily: "DMSans_400Regular" },
                      ]}
                    >
                      — {formattedDate}
                      {todayAff.bookletTitle ? ` · ${todayAff.bookletTitle}` : ""}
                    </Text>

                    <View style={styles.affirmationActions}>
                      <Pressable
                        onPress={() => setSavedHero(!savedHero)}
                        style={({ pressed }) => [
                          styles.actionIconBtn,
                          {
                            backgroundColor: savedHero
                              ? "rgba(212,168,83,0.15)"
                              : "rgba(255,255,255,0.05)",
                            borderColor: savedHero
                              ? "rgba(212,168,83,0.25)"
                              : colors.border,
                            opacity: pressed ? 0.8 : 1,
                          },
                        ]}
                      >
                        <Ionicons
                          name={savedHero ? "heart" : "heart-outline"}
                          size={19}
                          color={savedHero ? colors.gold : colors.textSecondary}
                        />
                      </Pressable>

                      <Pressable
                        onPress={handleShare}
                        style={({ pressed }) => [
                          styles.actionIconBtn,
                          {
                            backgroundColor: "rgba(255,255,255,0.05)",
                            borderColor: colors.border,
                            opacity: pressed ? 0.8 : 1,
                          },
                        ]}
                      >
                        <Ionicons name="share-outline" size={19} color={colors.textSecondary} />
                      </Pressable>

                      {isTodayLocked ? (
                        <Pressable
                          onPress={() => setShowPaymentModal(true)}
                          disabled={unlockMutation.isPending}
                          style={({ pressed }) => [
                            styles.markCompleteBtn,
                            { opacity: pressed || unlockMutation.isPending ? 0.9 : 1 },
                          ]}
                        >
                          <LinearGradient
                            colors={[colors.gold, colors.goldDark, "#E0B96A"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.markCompleteBtnGradient}
                          >
                            {unlockMutation.isPending ? (
                              <ActivityIndicator color="#0A1E38" size="small" />
                            ) : (
                              <>
                                <Ionicons name="lock-closed" size={17} color="#0A1E38" />
                                <Text
                                  style={[
                                    styles.markCompleteBtnText,
                                    { fontFamily: "DMSans_600SemiBold" },
                                  ]}
                                >
                                  Unlock for ₦{monthlyPriceNaira}
                                </Text>
                              </>
                            )}
                          </LinearGradient>
                        </Pressable>
                      ) : !isCompleted ? (
                        <Pressable
                          onPress={() => {
                            if (!isCompleted && !completeMutation.isPending) {
                              completeMutation.mutate(todayAff.id);
                            }
                          }}
                          disabled={completeMutation.isPending || isCompleted}
                          style={({ pressed }) => [
                            styles.markCompleteBtn,
                            { opacity: pressed ? 0.9 : 1 },
                          ]}
                        >
                          <LinearGradient
                            colors={[colors.gold, colors.goldDark, "#E0B96A"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.markCompleteBtnGradient}
                          >
                            {completeMutation.isPending ? (
                              <ActivityIndicator color="#0A1E38" size="small" />
                            ) : (
                              <>
                                <Ionicons name="checkmark-circle-outline" size={17} color="#0A1E38" />
                                <Text
                                  style={[
                                    styles.markCompleteBtnText,
                                    { fontFamily: "DMSans_600SemiBold" },
                                  ]}
                                >
                                  Mark Complete
                                </Text>
                              </>
                            )}
                          </LinearGradient>
                        </Pressable>
                      ) : (
                        <View style={styles.completedBtn}>
                          <Ionicons name="checkmark-circle" size={17} color={colors.success} />
                          <Text
                            style={[
                              styles.completedBtnText,
                              { color: colors.success, fontFamily: "DMSans_600SemiBold" },
                            ]}
                          >
                            Completed
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </LinearGradient>

                {todayImageUrl ? (
                  <Image
                    source={{ uri: todayImageUrl }}
                    style={[styles.todayImage, { backgroundColor: colors.surfaceSecondary }]}
                    resizeMode="cover"
                    onError={() => {}}
                  />
                ) : (
                  <View style={[styles.todayImage, { backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center" }]}>
                    <Ionicons name="image-outline" size={40} color={colors.textSecondary} />
                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>Image unavailable</Text>
                  </View>
                )}
              </View>
            </>
          ) : (
            <View
              style={[
                styles.emptyCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Ionicons name="book-outline" size={48} color={colors.textSecondary} />
              <Text
                style={[styles.emptyTitle, { color: colors.text, fontFamily: "DMSans_600SemiBold" }]}
              >
                No affirmation for today
              </Text>
              <Text
                style={[
                  styles.emptySubtext,
                  { color: colors.textSecondary, fontFamily: "DMSans_400Regular" },
                ]}
              >
                Check back soon or browse the library
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Progress Section */}
        <Animated.View entering={FadeInDown.duration(600).delay(400)} style={styles.progressSection}>
          <Text
            style={[
              styles.sectionHeading,
              { color: colors.text, fontFamily: "PlayfairDisplay_600SemiBold" },
            ]}
          >
            Today's Progress
          </Text>

          <View style={styles.progressOverview}>
            <View style={styles.progressRingWrap}>
              <View style={styles.progressRingOuter}>
                <View
                  style={[
                    styles.progressRingTrack,
                    { backgroundColor: "rgba(72,118,168,0.18)" },
                  ]}
                />
                <View
                  style={[
                    styles.progressRingFill,
                    {
                      borderColor: colors.gold,
                      transform: [{ rotate: `${(completedCount / 3) * 360 - 90}deg` }],
                    },
                    completedCount === 0 && { borderColor: "transparent" },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.progressRingLabel,
                  { color: colors.gold, fontFamily: "PlayfairDisplay_700Bold" },
                ]}
              >
                {completedCount}/3
              </Text>
            </View>
            <View style={styles.progressInfo}>
              <Text
                style={[
                  styles.progressInfoText,
                  { color: colors.text, fontFamily: "DMSans_500Medium" },
                ]}
              >
                {completedCount} of 3 affirmations complete
              </Text>
              <Text
                style={[
                  styles.progressInfoSub,
                  { color: colors.textSecondary, fontFamily: "DMSans_400Regular" },
                ]}
              >
                {completedCount === 0
                  ? isMorning
                    ? "Start your day with a morning affirmation"
                    : isAfternoon
                    ? "Complete your afternoon affirmation"
                    : "Complete your evening affirmation"
                  : completedCount < 3
                  ? "Keep going, you're doing great!"
                  : "All affirmations complete for today!"}
              </Text>
            </View>
          </View>

          <View style={styles.progressCards}>
            <View
              style={[
                styles.progressCard,
                morningDone
                  ? { backgroundColor: "rgba(48,209,88,0.1)", borderColor: "rgba(48,209,88,0.2)" }
                  : isMorning && !morningDone
                  ? { backgroundColor: colors.surface, borderColor: colors.gold }
                  : { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Ionicons
                name={morningDone ? "checkmark-circle" : isMorning ? "ellipse" : "ellipse-outline"}
                size={20}
                color={morningDone ? colors.success : isMorning ? colors.gold : colors.textSecondary}
              />
              <Text
                style={[
                  styles.progressCardLabel,
                  {
                    color: morningDone ? colors.success : isMorning ? colors.gold : colors.textSecondary,
                    fontFamily: "DMSans_500Medium",
                  },
                ]}
              >
                Morning
              </Text>
            </View>
            <View
              style={[
                styles.progressCard,
                afternoonDone
                  ? { backgroundColor: "rgba(48,209,88,0.1)", borderColor: "rgba(48,209,88,0.2)" }
                  : isAfternoon && !afternoonDone
                  ? { backgroundColor: colors.surface, borderColor: colors.gold }
                  : { backgroundColor: colors.surface, borderColor: colors.border, opacity: isMorning ? 0.5 : 0.7 },
              ]}
            >
              <Ionicons
                name={afternoonDone ? "checkmark-circle" : isAfternoon ? "ellipse" : isMorning ? "lock-closed" : "ellipse-outline"}
                size={afternoonDone || isAfternoon ? 20 : 16}
                color={afternoonDone ? colors.success : isAfternoon ? colors.gold : colors.textSecondary}
              />
              <Text
                style={[
                  styles.progressCardLabel,
                  {
                    color: afternoonDone ? colors.success : isAfternoon ? colors.gold : colors.textSecondary,
                    fontFamily: "DMSans_500Medium",
                  },
                ]}
              >
                Afternoon
              </Text>
            </View>
            <View
              style={[
                styles.progressCard,
                eveningDone
                  ? { backgroundColor: "rgba(48,209,88,0.1)", borderColor: "rgba(48,209,88,0.2)" }
                  : isEvening && !eveningDone
                  ? { backgroundColor: colors.surface, borderColor: colors.gold }
                  : { backgroundColor: colors.surface, borderColor: colors.border, opacity: 0.5 },
              ]}
            >
              <Ionicons
                name={eveningDone ? "checkmark-circle" : isEvening ? "ellipse" : "lock-closed"}
                size={eveningDone || isEvening ? 20 : 16}
                color={eveningDone ? colors.success : isEvening ? colors.gold : colors.textSecondary}
              />
              <Text
                style={[
                  styles.progressCardLabel,
                  {
                    color: eveningDone ? colors.success : isEvening ? colors.gold : colors.textSecondary,
                    fontFamily: "DMSans_500Medium",
                  },
                ]}
              >
                Evening
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Recent Affirmations */}
        <Animated.View entering={FadeInDown.duration(600).delay(500)} style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text
              style={[
                styles.sectionHeading,
                { color: colors.text, fontFamily: "PlayfairDisplay_600SemiBold" },
              ]}
            >
              Recent
            </Text>
            <Pressable onPress={() => router.push("/(main)/library")}>
              <Text
                style={[styles.seeAllLink, { color: "#64B5F6", fontFamily: "DMSans_500Medium" }]}
              >
                See All
              </Text>
            </Pressable>
          </View>

          {recentAffirmations.length > 0 ? (
            recentAffirmations.map((aff: any, index: number) => {
              const tagColors = [
                { bg: "rgba(191,90,242,0.1)", color: "#BF5AF2" },
                { bg: "rgba(48,209,88,0.1)", color: "#30D158" },
                { bg: "rgba(100,181,246,0.1)", color: "#64B5F6" },
              ];
              const tag = tagColors[index % 3];
              const daysAgo = index === 0 ? "Today" : index === 1 ? "Yesterday" : `${index} days ago`;
              return (
                <Pressable
                  key={aff.id ?? index}
                  onPress={() =>
                    router.push({ pathname: "/affirmation/[id]", params: { id: aff.id.toString() } })
                  }
                  style={({ pressed }) => [
                    styles.recentCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      opacity: pressed ? 0.95 : 1,
                    },
                  ]}
                >
                  <View style={styles.recentCardBody}>
                    <View style={[styles.recentCardTag, { backgroundColor: tag.bg }]}>
                      <Text style={[styles.recentCardTagText, { color: tag.color, fontFamily: "DMSans_600SemiBold" }]}>
                        Day {aff.dayNumber ?? index + 1}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.recentCardQuote,
                        { color: colors.text, fontFamily: "PlayfairDisplay_400Regular" },
                      ]}
                      numberOfLines={2}
                    >
                      "{aff.title}"
                    </Text>
                    <View style={styles.recentCardMeta}>
                      <Text
                        style={[
                          styles.recentCardTime,
                          { color: colors.textSecondary, fontFamily: "DMSans_400Regular" },
                        ]}
                      >
                        {daysAgo} · {aff.bookletTitle || "Booklet"}
                      </Text>
                      <Ionicons name="heart-outline" size={16} color={colors.textSecondary} />
                    </View>
                  </View>
                </Pressable>
              );
            })
          ) : (
            <Text
              style={[
                styles.emptySubtext,
                { color: colors.textSecondary, fontFamily: "DMSans_400Regular", textAlign: "center", paddingVertical: 20 },
              ]}
            >
              Complete affirmations to see them here
            </Text>
          )}
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View entering={FadeInDown.duration(600).delay(600)} style={styles.quickActions}>
          <Pressable
            onPress={handleShare}
            style={({ pressed }) => [
              styles.quickActionBtn,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Ionicons name="share-social-outline" size={22} color={colors.gold} />
            <Text
              style={[
                styles.quickActionLabel,
                { color: colors.textSecondary, fontFamily: "DMSans_500Medium" },
              ]}
            >
              Share Today
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/journal")}
            style={({ pressed }) => [
              styles.quickActionBtn,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Ionicons name="book-outline" size={22} color={colors.gold} />
            <Text
              style={[
                styles.quickActionLabel,
                { color: colors.textSecondary, fontFamily: "DMSans_500Medium" },
              ]}
            >
              Journal
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              Alert.alert("Reminders", "Reminder settings coming soon!");
            }}
            style={({ pressed }) => [
              styles.quickActionBtn,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Ionicons name="notifications-outline" size={22} color={colors.gold} />
            <Text
              style={[
                styles.quickActionLabel,
                { color: colors.textSecondary, fontFamily: "DMSans_500Medium" },
              ]}
            >
              Remind Me
            </Text>
          </Pressable>
        </Animated.View>
      </ScrollView>

      <PaymentDetailsModal
        visible={showPaymentModal}
        bookletTitle={todayAff?.bookletTitle || "Monthly Affirmation"}
        amount={monthlyPriceNaira}
        bookletId={todayAff?.bookletId != null ? Number(todayAff.bookletId) : undefined}
        onConfirmPayment={async () => {
          await unlockMutation.mutateAsync();
        }}
        onCancel={() => setShowPaymentModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },

  // Greeting
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },
  greetingIcon: {
    marginTop: 2,
  },
  greetingText: {
    fontSize: 28,
    letterSpacing: -0.3,
    lineHeight: 34,
  },
  greetingDate: {
    fontSize: 14,
    paddingLeft: 36,
  },

  // Streak Banner
  streakBanner: {
    marginTop: 24,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  streakTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  streakLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  streakCount: {
    fontSize: 18,
  },
  streakLabel: {
    fontSize: 13,
    marginLeft: 2,
  },
  streakMilestone: {
    fontSize: 12,
  },
  streakProgressTrack: {
    width: "100%",
    height: 6,
    borderRadius: 10,
    overflow: "hidden",
  },
  streakProgressFill: {
    height: "100%",
    borderRadius: 10,
  },

  // Stats Row
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 20,
    paddingHorizontal: 16,
    width: "100%",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statValue: {
    fontSize: 26,
  },
  statLabel: {
    fontSize: 11,
    textTransform: "uppercase" as const,
    letterSpacing: 0.8,
  },
  statDivider: {
    width: 1,
    height: 36,
    opacity: 0.6,
  },

  // Hero Affirmation Card
  affirmationCardBorder: {
    marginTop: 28,
    borderRadius: 24,
    padding: 2,
  },
  affirmationCardInner: {
    borderRadius: 22,
    padding: 28,
    position: "relative",
    overflow: "hidden",
  },
  quoteMarkOpen: {
    position: "absolute",
    top: -18,
    left: 16,
    fontSize: 140,
    fontWeight: "700",
    lineHeight: 140,
    zIndex: 0,
  },
  quoteMarkClose: {
    position: "absolute",
    bottom: -56,
    right: 16,
    fontSize: 140,
    fontWeight: "700",
    lineHeight: 140,
    zIndex: 0,
  },
  affirmationBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    borderWidth: 1,
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 24,
    zIndex: 1,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: "uppercase" as const,
    fontWeight: "700",
  },
  affirmationQuote: {
    fontSize: 24,
    fontStyle: "italic",
    lineHeight: 37,
    letterSpacing: -0.1,
    marginBottom: 12,
    zIndex: 1,
  },
  readMoreLink: {
    fontSize: 14,
    marginBottom: 16,
    zIndex: 1,
  },
  affirmationAttribution: {
    fontSize: 13,
    fontStyle: "italic",
    marginBottom: 28,
    zIndex: 1,
  },
  affirmationActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    zIndex: 1,
  },
  actionIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  markCompleteBtn: {
    marginLeft: "auto",
    borderRadius: 100,
    overflow: "hidden",
  },
  markCompleteBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  markCompleteBtnText: {
    fontSize: 14,
    color: "#0A1E38",
  },
  completedBtn: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 100,
    backgroundColor: "rgba(48,209,88,0.12)",
    borderWidth: 1,
    borderColor: "rgba(48,209,88,0.24)",
  },
  completedBtnText: {
    fontSize: 14,
  },

  todayImage: {
    width: "100%",
    height: 200,
    borderRadius: 16,
    marginTop: 16,
    overflow: "hidden",
  },

  // Loading & Empty
  loadingContainer: {
    paddingVertical: 60,
    alignItems: "center",
    marginTop: 28,
  },
  emptyCard: {
    borderRadius: 20,
    padding: 40,
    alignItems: "center",
    borderWidth: 1,
    gap: 12,
    marginTop: 28,
  },
  emptyTitle: {
    fontSize: 18,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
  },

  // Progress Section
  progressSection: {
    marginTop: 32,
  },
  sectionHeading: {
    fontSize: 20,
    marginBottom: 16,
  },
  progressOverview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  progressRingWrap: {
    width: 52,
    height: 52,
    position: "relative",
  },
  progressRingOuter: {
    width: 52,
    height: 52,
    position: "relative",
  },
  progressRingTrack: {
    position: "absolute",
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 4,
  },
  progressRingFill: {
    position: "absolute",
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 4,
    borderTopColor: "transparent",
    borderRightColor: "transparent",
  },
  progressRingLabel: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    textAlign: "center",
    textAlignVertical: "center",
    fontSize: 16,
    lineHeight: 52,
  },
  progressInfo: {
    flex: 1,
  },
  progressInfoText: {
    fontSize: 14,
    marginBottom: 2,
  },
  progressInfoSub: {
    fontSize: 12.5,
  },
  progressCards: {
    flexDirection: "row",
    gap: 10,
  },
  progressCard: {
    flex: 1,
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    gap: 6,
  },
  progressCardLabel: {
    fontSize: 12.5,
  },

  // Recent Affirmations
  recentSection: {
    marginTop: 32,
  },
  recentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  seeAllLink: {
    fontSize: 13,
  },
  recentCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
  },
  recentCardBody: {
    flex: 1,
  },
  recentCardTag: {
    alignSelf: "flex-start",
    borderRadius: 100,
    paddingHorizontal: 9,
    paddingVertical: 3,
    marginBottom: 8,
  },
  recentCardTagText: {
    fontSize: 10.5,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
  },
  recentCardQuote: {
    fontSize: 14.5,
    fontStyle: "italic",
    lineHeight: 21,
    marginBottom: 8,
  },
  recentCardMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  recentCardTime: {
    fontSize: 12,
  },

  // Quick Actions
  quickActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 32,
  },
  quickActionBtn: {
    flex: 1,
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 10,
    gap: 8,
  },
  quickActionLabel: {
    fontSize: 12,
  },
});
