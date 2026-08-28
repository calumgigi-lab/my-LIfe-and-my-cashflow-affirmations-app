import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useColorScheme,
  ScrollView,
  Platform,
  ActivityIndicator,
  Share,
  Animated,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import AnimatedRN, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useThemeColors } from "@/constants/colors";
import { getApiUrl, queryClient, apiRequest } from "@/lib/query-client";
import { purchaseBooklet, getBookletProductId } from "@/lib/booklet-purchases";
import { PaymentDetailsModal } from "@/components/PaymentDetailsModal";

const HERO_GRADIENT: [string, string, string, string] = [
  "#3a1a6e",
  "#7b2fbe",
  "#5c3d99",
  "#c99a2e",
];

const BORDER_COLORS = ["#D4A853", "#BF5AF2", "#64B5F6"];

const TAG_STYLES: { bg: string; color: string; border: string }[] = [
  { bg: "rgba(212,168,83,0.12)", color: "#D4A853", border: "rgba(212,168,83,0.25)" },
  { bg: "rgba(191,90,242,0.1)", color: "#BF5AF2", border: "rgba(191,90,242,0.2)" },
  { bg: "rgba(100,181,246,0.1)", color: "#64B5F6", border: "rgba(100,181,246,0.2)" },
  { bg: "rgba(48,209,88,0.1)", color: "#30D158", border: "rgba(48,209,88,0.2)" },
];

const monthNames = [
  "",
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

function Sparkle({
  delay,
  size,
  color,
  top,
  right,
  left,
  bottom,
}: {
  delay: number;
  size: number;
  color: string;
  top?: number;
  right?: number;
  left?: number;
  bottom?: number;
}) {
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(animValue, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(animValue, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [animValue, delay]);

  const translateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  const scale = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.15],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        top,
        right,
        left,
        bottom,
        opacity: 0.7,
        transform: [{ translateY }, { scale }],
      }}
    >
      <Ionicons name="star" size={size} color={color} />
    </Animated.View>
  );
}

function AffirmationCard({
  aff,
  index,
  isLocked,
  colors,
  onToggleFavorite,
  saved,
}: {
  aff: any;
  index: number;
  isLocked: boolean;
  colors: any;
  onToggleFavorite: (id: number) => void;
  saved: boolean;
}) {
  const borderColor = BORDER_COLORS[index % BORDER_COLORS.length];

  return (
    <AnimatedRN.View entering={FadeInDown.duration(400).delay(index * 60)}>
      <Pressable
        onPress={() => {
          if (isLocked) return;
          router.push({ pathname: "/(main)/affirmation/[id]", params: { id: aff.id.toString() } });
        }}
        style={({ pressed }) => [
          styles.affCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border + "30",
            borderLeftColor: borderColor,
            opacity: pressed ? 0.92 : 1,
            transform: [{ translateX: pressed ? 2 : 0 }],
          },
        ]}
      >
        <Text
          style={[
            styles.affNum,
            { color: colors.textSecondary, fontFamily: "PlayfairDisplay_700Bold" },
          ]}
        >
          {String(aff.dayNumber ?? index + 1).padStart(2, "0")}
        </Text>
        <View style={styles.affContent}>
          <Text
            style={[styles.affText, { color: colors.text, fontFamily: "DMSans_400Regular" }]}
            numberOfLines={2}
          >
            {aff.content?.split("\n\n")[0] ?? aff.title ?? ""}
          </Text>
        </View>
        <Pressable
          onPress={() => onToggleFavorite(aff.id)}
          hitSlop={8}
          style={[
            styles.affHeart,
            { backgroundColor: saved ? "rgba(255,107,138,0.1)" : "rgba(255,255,255,0.04)" },
          ]}
        >
          <Ionicons
            name={saved ? "heart" : "heart-outline"}
            size={18}
            color={saved ? "#ff6b8a" : colors.textSecondary}
          />
        </Pressable>
      </Pressable>
    </AnimatedRN.View>
  );
}

export default function BookletDetailMainScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme();
  const colors = useThemeColors(scheme);
  const insets = useSafeAreaInsets();

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [savedAffirmations, setSavedAffirmations] = useState<Set<number>>(new Set());
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
    },
    onError: (error: any) => {
      queryClient.invalidateQueries({ queryKey: [`/api/booklets/${id}/access`] });
    },
  });

  const isLoading = bookletLoading || affsLoading;
  const previewDays = accessData?.previewDays ?? 2;
  const isUnlocked = accessData?.unlocked ?? false;
  const monthlyPriceNaira = accessData?.monthlyPriceNaira ?? 1500;
  const totalAffirmations = affirmationsList?.length ?? 0;
  const completedCount = isUnlocked ? Math.floor(totalAffirmations * 0.4) : 0;
  const progressPct = totalAffirmations > 0 ? Math.round((completedCount / totalAffirmations) * 100) : 0;
  const monthLabel = booklet?.month ? `${monthNames[booklet.month]} ${booklet.year}` : "";

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out "${booklet?.title}" on Global Affirmation Hub!`,
      });
    } catch {}
  };

  const handleToggleFavorite = (affirmationId: number) => {
    setSavedAffirmations((prev) => {
      const next = new Set(prev);
      if (next.has(affirmationId)) {
        next.delete(affirmationId);
      } else {
        next.add(affirmationId);
      }
      return next;
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ─── NAV ─── */}
      <View
        style={[
          styles.nav,
          {
            paddingTop: insets.top + 8,
            backgroundColor: "rgba(15,44,79,0.72)",
            borderBottomColor: colors.border + "30",
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={[styles.navBtn, { backgroundColor: colors.surface + "60" }]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text
          style={[styles.navTitle, { color: colors.text, fontFamily: "PlayfairDisplay_600SemiBold" }]}
          numberOfLines={1}
        >
          {monthLabel || "Booklet"}
        </Text>
        <View style={styles.navActions}>
          <Pressable
            onPress={handleShare}
            hitSlop={8}
            style={[styles.navBtn, { backgroundColor: colors.surface + "60" }]}
          >
            <Ionicons name="share-outline" size={20} color={colors.text} />
          </Pressable>
          <Pressable
            hitSlop={8}
            style={[styles.navBtn, { backgroundColor: colors.surface + "60" }]}
          >
            <Ionicons name="bookmark-outline" size={20} color={colors.text} />
          </Pressable>
        </View>
      </View>

      {/* ─── SCROLLABLE CONTENT ─── */}
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <ActivityIndicator size="large" color={colors.gold} style={{ paddingVertical: 80 }} />
        ) : (
          <>
            {/* ─── COVER HERO ─── */}
            <AnimatedRN.View entering={FadeInDown.duration(600).delay(50)}>
              <LinearGradient
                colors={HERO_GRADIENT}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.hero}
              >
                <View style={styles.heroRadial1} />
                <View style={styles.heroRadial2} />
                <View style={styles.heroBorder} />

                <Sparkle delay={0} size={18} color="#D4A853" top={32} right={40} />
                <Sparkle delay={800} size={12} color="#D4A853" top={70} right={90} />
                <Sparkle delay={1500} size={14} color="#BF5AF2" top={50} left={30} />
                <Sparkle delay={400} size={10} color="#D4A853" bottom={60} right={24} />
                <Sparkle delay={2000} size={8} color="#F7FBFF" top={20} left={200} />

                <View style={styles.heroContent}>
                  <View style={styles.heroBadge}>
                    <Ionicons name="calendar-outline" size={14} color="#D4A853" />
                    <Text style={styles.heroBadgeText}>{monthLabel}</Text>
                  </View>
                  <Text style={[styles.heroTitle, { fontFamily: "PlayfairDisplay_700Bold" }]}>
                    {booklet?.title || "Booklet"}
                  </Text>
                  <Text style={styles.heroSub}>
                    Monthly Booklet — {totalAffirmations} Days of Affirmations
                  </Text>
                </View>
              </LinearGradient>
            </AnimatedRN.View>

            {/* ─── STATUS BAR ─── */}
            <AnimatedRN.View entering={FadeInDown.duration(500).delay(150)}>
              <View
                style={[
                  styles.statusBar,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border + "30",
                  },
                ]}
              >
                {isUnlocked ? (
                  <View style={[styles.statusBadge, { backgroundColor: "rgba(48,209,88,0.1)" }]}>
                    <Ionicons name="checkmark-circle" size={14} color="#30D158" />
                    <Text style={[styles.statusBadgeText, { color: "#30D158" }]}>Unlocked</Text>
                  </View>
                ) : (
                  <View style={[styles.statusBadge, { backgroundColor: "rgba(191,90,242,0.1)" }]}>
                    <Ionicons name="lock-closed" size={14} color="#BF5AF2" />
                    <Text style={[styles.statusBadgeText, { color: "#BF5AF2" }]}>Locked</Text>
                  </View>
                )}
                <View style={[styles.statusDot, { backgroundColor: colors.textSecondary + "40" }]} />
                <Text style={[styles.statusMeta, { color: colors.textSecondary }]}>
                  {totalAffirmations} Affirmations
                </Text>
                <View style={[styles.statusDot, { backgroundColor: colors.textSecondary + "40" }]} />
                <Text style={[styles.statusMeta, { color: colors.textSecondary }]}>
                  Published {monthLabel}
                </Text>
              </View>
            </AnimatedRN.View>

            {/* ─── DESCRIPTION ─── */}
            {booklet?.description ? (
              <AnimatedRN.View entering={FadeInDown.duration(500).delay(250)} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text
                    style={[
                      styles.sectionTitle,
                      { color: colors.text, fontFamily: "PlayfairDisplay_600SemiBold" },
                    ]}
                  >
                    About This Booklet
                  </Text>
                </View>
                <View
                  style={[
                    styles.descCard,
                    { backgroundColor: colors.surface, borderColor: colors.border + "30" },
                  ]}
                >
                  <Text
                    style={[
                      styles.descText,
                      { color: colors.textSecondary, fontFamily: "DMSans_400Regular" },
                    ]}
                  >
                    {booklet.description}
                  </Text>
                  {booklet.tags && booklet.tags.length > 0 && (
                    <View style={styles.tagsRow}>
                      {booklet.tags.map((tag: string, i: number) => {
                        const tagStyle = TAG_STYLES[i % TAG_STYLES.length];
                        return (
                          <View
                            key={tag}
                            style={[
                              styles.tag,
                              {
                                backgroundColor: tagStyle.bg,
                                borderColor: tagStyle.border,
                              },
                            ]}
                          >
                            <Text style={[styles.tagText, { color: tagStyle.color }]}>{tag}</Text>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              </AnimatedRN.View>
            ) : null}

            {/* ─── AFFIRMATIONS LIST ─── */}
            <AnimatedRN.View entering={FadeInDown.duration(500).delay(350)} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: colors.text, fontFamily: "PlayfairDisplay_600SemiBold" },
                  ]}
                >
                  Affirmations
                </Text>
                <View style={[styles.sectionCount, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.sectionCountText, { color: colors.textSecondary }]}>
                    ({totalAffirmations})
                  </Text>
                </View>
              </View>
              <View style={styles.affList}>
                {affirmationsList?.map((aff: any, index: number) => (
                  <AffirmationCard
                    key={aff.id}
                    aff={aff}
                    index={index}
                    isLocked={!isUnlocked && aff.dayNumber > previewDays}
                    colors={colors}
                    onToggleFavorite={handleToggleFavorite}
                    saved={savedAffirmations.has(aff.id)}
                  />
                ))}
              </View>
            </AnimatedRN.View>

            {/* ─── PROGRESS ─── */}
            {isUnlocked && (
              <AnimatedRN.View entering={FadeInDown.duration(500).delay(450)} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text
                    style={[
                      styles.sectionTitle,
                      { color: colors.text, fontFamily: "PlayfairDisplay_600SemiBold" },
                    ]}
                  >
                    Your Progress
                  </Text>
                </View>
                <View
                  style={[
                    styles.progressCard,
                    { backgroundColor: colors.surface, borderColor: colors.border + "30" },
                  ]}
                >
                  <View style={styles.progressTop}>
                    <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                      {completedCount} of {totalAffirmations} completed
                    </Text>
                    <Text
                      style={[
                        styles.progressPct,
                        { color: colors.gold, fontFamily: "PlayfairDisplay_700Bold" },
                      ]}
                    >
                      {progressPct}%
                    </Text>
                  </View>
                  <View style={[styles.progressBar, { backgroundColor: "rgba(255,255,255,0.06)" }]}>
                    <LinearGradient
                      colors={[colors.gold, "#e8c468"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.progressFill, { width: `${progressPct}%` as any }]}
                    />
                  </View>
                  <View style={styles.progressSub}>
                    <Text style={[styles.progressSubText, { color: colors.textSecondary }]}>
                      Keep going!
                    </Text>
                    <View style={[styles.streakBadge, { backgroundColor: "rgba(212,168,83,0.12)" }]}>
                      <Ionicons name="flame-outline" size={14} color="#D4A853" />
                      <Text style={[styles.streakText, { color: "#D4A853" }]}>Start today</Text>
                    </View>
                  </View>
                </View>
              </AnimatedRN.View>
            )}
          </>
        )}
      </ScrollView>

      {/* ─── BOTTOM ACTION BAR ─── */}
      <View
        style={[
          styles.bottomBar,
          {
            paddingBottom: insets.bottom + 12,
            backgroundColor: "rgba(15,44,79,0.85)",
            borderTopColor: colors.border + "30",
          },
        ]}
      >
        {isUnlocked ? (
          <Pressable
            style={[styles.btnPrimary, { backgroundColor: colors.gold }]}
            onPress={() => {
              if (affirmationsList?.length > 0) {
                router.push({
                  pathname: "/(main)/affirmation/[id]",
                  params: { id: affirmationsList[0].id.toString() },
                });
              }
            }}
          >
            <Ionicons name="book-outline" size={18} color="#1a1a1a" />
            <Text style={[styles.btnPrimaryText, { color: "#1a1a1a", fontFamily: "DMSans_600SemiBold" }]}>
              Continue Reading
            </Text>
          </Pressable>
        ) : (
          <>
            <View style={styles.priceGroup}>
              <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>Unlock for</Text>
              <Text style={[styles.priceValue, { color: colors.gold, fontFamily: "PlayfairDisplay_700Bold" }]}>
                ₦{monthlyPriceNaira.toLocaleString()}
              </Text>
            </View>
            <Pressable
              onPress={() => setShowPaymentModal(true)}
              disabled={recordPaymentMutation.isPending}
              style={({ pressed }) => [
                styles.btnPrimary,
                {
                  backgroundColor: colors.gold,
                  opacity: pressed || recordPaymentMutation.isPending ? 0.85 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}
            >
              {recordPaymentMutation.isPending ? (
                <ActivityIndicator size="small" color="#1a1a1a" />
              ) : (
                <>
                  <Ionicons name="lock-open-outline" size={18} color="#1a1a1a" />
                  <Text style={[styles.btnPrimaryText, { color: "#1a1a1a", fontFamily: "DMSans_600SemiBold" }]}>
                    Unlock Now
                  </Text>
                </>
              )}
            </Pressable>
          </>
        )}
        <Pressable
          onPress={handleShare}
          style={[styles.btnSecondary, { borderColor: colors.border + "40" }]}
        >
          <Ionicons name="share-outline" size={18} color={colors.text} />
        </Pressable>
      </View>

      {/* ─── PAYMENT MODAL ─── */}
      <PaymentDetailsModal
        visible={showPaymentModal}
        bookletTitle={booklet?.title || ""}
        amount={monthlyPriceNaira}
        bookletId={Number(id)}
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

  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: { fontSize: 17, flex: 1, textAlign: "center", marginHorizontal: 6 },
  navActions: { flexDirection: "row", gap: 6 },

  scrollContent: { paddingHorizontal: 16 },

  hero: {
    marginTop: 20,
    borderRadius: 24,
    overflow: "hidden",
    padding: 28,
    paddingBottom: 44,
    minHeight: 310,
    justifyContent: "flex-end",
    position: "relative",
  },
  heroRadial1: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "60%",
    height: "60%",
    borderRadius: 200,
    backgroundColor: "rgba(212,168,83,0.18)",
  },
  heroRadial2: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: "50%",
    height: "50%",
    borderRadius: 150,
    backgroundColor: "rgba(191,90,242,0.15)",
  },
  heroBorder: {
    position: "absolute",
    inset: 6,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "rgba(212,168,83,0.25)",
  },
  heroContent: { position: "relative", zIndex: 2 },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 30,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    marginBottom: 16,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.85)",
  },
  heroTitle: {
    fontSize: 34,
    fontWeight: "700",
    lineHeight: 40,
    color: "#fff",
    marginBottom: 8,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 20,
  },
  heroSub: {
    fontSize: 15,
    fontWeight: "400",
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 0.3,
  },

  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    padding: 14,
    marginTop: -18,
    marginHorizontal: 4,
    borderRadius: 14,
    borderWidth: 1,
    position: "relative",
    zIndex: 3,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusBadgeText: { fontSize: 12, fontWeight: "600" },
  statusDot: { width: 3, height: 3, borderRadius: 1.5 },
  statusMeta: { fontSize: 13 },

  section: { paddingTop: 24 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 20 },
  sectionCount: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  sectionCountText: { fontSize: 13, fontWeight: "500" },

  descCard: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
  },
  descText: { fontSize: 15, lineHeight: 25, marginBottom: 18 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  tagText: { fontSize: 12, fontWeight: "600", letterSpacing: 0.3 },

  affList: { gap: 10 },
  affCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    padding: 18,
    paddingLeft: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderLeftWidth: 3,
  },
  affNum: {
    fontSize: 13,
    fontWeight: "700",
    minWidth: 24,
    paddingTop: 2,
    opacity: 0.6,
  },
  affContent: { flex: 1 },
  affText: { fontSize: 15, lineHeight: 23 },
  affHeart: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  progressCard: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
  },
  progressTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  progressLabel: { fontSize: 14 },
  progressPct: { fontSize: 28, fontWeight: "700" },
  progressBar: {
    width: "100%",
    height: 10,
    borderRadius: 10,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 10,
  },
  progressSub: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  progressSubText: { fontSize: 12 },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  streakText: { fontSize: 12, fontWeight: "600" },

  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  priceGroup: { flexShrink: 0 },
  priceLabel: { fontSize: 11, marginBottom: 2 },
  priceValue: { fontSize: 20, fontWeight: "700" },
  btnPrimary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    borderRadius: 14,
  },
  btnPrimaryText: { fontSize: 15, fontWeight: "600", letterSpacing: 0.2 },
  btnSecondary: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
});
