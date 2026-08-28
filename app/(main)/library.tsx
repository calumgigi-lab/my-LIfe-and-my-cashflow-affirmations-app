import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useColorScheme,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Image,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "@tanstack/react-query";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useThemeColors } from "@/constants/colors";
import { queryClient, apiRequest } from "@/lib/query-client";
import { purchaseBooklet } from "@/lib/booklet-purchases";
import { PaymentDetailsModal } from "@/components/PaymentDetailsModal";
import {
  getBookletCover,
  isJune2026Celebration,
  JUNE_2026_CELEBRATION_TAGLINE,
} from "@/lib/booklet-covers";

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

type FilterType = "all" | "unlocked" | "locked" | "favorites";

export default function LibraryScreen() {
  const scheme = useColorScheme();
  const colors = useThemeColors(scheme);
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBooklet, setSelectedBooklet] = useState<{
    id: number;
    month: number;
    year: number;
  } | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const { data: bookletList, isLoading, refetch: refetchBooklets } = useQuery<any[]>({
    queryKey: ["/api/booklets"],
  });

  const { data: accessData, refetch: refetchAccess } = useQuery<{
    unlockedBookletIds: number[];
    previewDays: number;
    monthlyPriceNaira: number;
  }>({
    queryKey: ["/api/booklets/access"],
  });

  const { data: providerData } = useQuery<{ provider: string }>({
    queryKey: ["/api/payment-provider"],
    staleTime: 300_000,
  });

  const { data: rewardsData, refetch: refetchRewards } = useQuery<{ points: number }>({
    queryKey: ["/api/rewards/balance"],
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchBooklets(), refetchAccess(), refetchRewards()]);
    setRefreshing(false);
  };

  const paymentProvider =
    providerData?.provider === "flutterwave" ? "flutterwave" : "bank_transfer";

  const verifyPurchaseMutation = useMutation({
    mutationFn: async (booklet: { id: number; month: number; year: number }) => {
      await purchaseBooklet(booklet);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/booklets/access"] });
    },
  });

  const unlockedSet = new Set(accessData?.unlockedBookletIds ?? []);
  const monthlyPriceNaira = accessData?.monthlyPriceNaira ?? 1500;
  const unlockedCount = accessData?.unlockedBookletIds?.length ?? 0;
  const totalCount = bookletList?.length ?? 0;
  const pointsEarned = rewardsData?.points ?? 0;

  const featuredBooklet = bookletList?.find((b: any) => b.id === 299);

  const filteredBooklets = useMemo(() => {
    if (!bookletList) return [];
    let list = [...bookletList];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (b: any) =>
          b.title?.toLowerCase().includes(q) ||
          `${monthNames[b.month]} ${b.year}`.toLowerCase().includes(q)
      );
    }

    if (activeFilter === "unlocked") {
      list = list.filter((b: any) => unlockedSet.has(b.id));
    } else if (activeFilter === "locked") {
      list = list.filter((b: any) => !unlockedSet.has(b.id));
    }

    list.sort((a: any, b: any) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });

    return list;
  }, [bookletList, searchQuery, activeFilter, unlockedSet]);

  const handleUnlockBooklet = (booklet: {
    id: number;
    month: number;
    year: number;
  }) => {
    setSelectedBooklet(booklet);
    setShowPaymentModal(true);
  };

  const handleConfirmPayment = async () => {
    if (!selectedBooklet) throw new Error("No booklet selected");
    return new Promise<void>((resolve, reject) => {
      verifyPurchaseMutation.mutate(selectedBooklet, {
        onSuccess: () => {
          setShowPaymentModal(false);
          setSelectedBooklet(null);
          resolve();
        },
        onError: (error: any) => {
          reject(new Error(error?.message || "Could not unlock this booklet"));
        },
      });
    });
  };

  const filters: { key: FilterType; label: string; count?: number }[] = [
    { key: "all", label: "All" },
    { key: "unlocked", label: "Unlocked", count: unlockedCount },
    { key: "locked", label: "Locked", count: totalCount - unlockedCount },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.background, colors.surface + "40", colors.background]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 16, paddingBottom: 120 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.gold}
            colors={[colors.gold]}
          />
        }
      >
        <Animated.View entering={FadeInDown.duration(500)}>
          <View style={styles.nav}>
            <Text
              style={[
                styles.navTitle,
                { color: colors.text, fontFamily: "PlayfairDisplay_700Bold" },
              ]}
            >
              Library
            </Text>
            <Pressable
              style={[
                styles.navBtn,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border + "30",
                },
              ]}
            >
              <Ionicons
                name="options-outline"
                size={20}
                color={colors.textSecondary}
              />
            </Pressable>
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(500).delay(100)}
          style={styles.searchWrap}
        >
          <View
            style={[
              styles.searchBox,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border + "30",
              },
            ]}
          >
            <Ionicons
              name="search-outline"
              size={18}
              color={colors.textSecondary + "80"}
            />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search affirmations..."
              placeholderTextColor={colors.textSecondary + "60"}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(500).delay(180)}
          style={styles.chipsRow}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsContent}
          >
            {filters.map((f) => {
              const isActive = activeFilter === f.key;
              const label =
                f.count !== undefined ? `${f.label} (${f.count})` : f.label;
              return (
                <Pressable
                  key={f.key}
                  onPress={() => setActiveFilter(f.key)}
                  style={[
                    styles.chip,
                    isActive
                      ? {
                          backgroundColor: colors.gold,
                          borderColor: colors.gold,
                        }
                      : {
                          backgroundColor: colors.surface,
                          borderColor: colors.border + "30",
                        },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: isActive ? colors.background : colors.textSecondary,
                        fontFamily: isActive
                          ? "DMSans_600SemiBold"
                          : "DMSans_500Medium",
                      },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(500).delay(260)}
          style={[
            styles.statsBar,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border + "30",
            },
          ]}
        >
          <Text style={[styles.statText, { color: colors.textSecondary }]}>
            <Text style={[styles.statStrong, { color: colors.gold }]}>
              {unlockedCount}
            </Text>{" "}
            Unlocked
          </Text>
          <View style={[styles.statDot, { backgroundColor: colors.textSecondary + "40" }]} />
          <Text style={[styles.statText, { color: colors.textSecondary }]}>
            <Text style={[styles.statStrong, { color: colors.gold }]}>
              {totalCount}
            </Text>{" "}
            Available
          </Text>
          <View style={[styles.statDot, { backgroundColor: colors.textSecondary + "40" }]} />
          <Text style={[styles.statText, { color: colors.textSecondary }]}>
            <Text style={[styles.statStrong, { color: colors.gold }]}>
              {pointsEarned}
            </Text>{" "}
            pts earned
          </Text>
        </Animated.View>

        {featuredBooklet && activeFilter === "all" && (
          <Animated.View
            entering={FadeInDown.duration(600).delay(340)}
            style={styles.featuredWrap}
          >
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/booklet/[id]",
                  params: { id: featuredBooklet.id.toString() },
                })
              }
              style={({ pressed }) => [
                styles.featuredCard,
                { opacity: pressed ? 0.95 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
              ]}
            >
              <LinearGradient
                colors={["#2A1A00", "#3D2800", "#1E1200", "#4A3200", "#2A1A00"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.featuredBgRadial1} />
              <View style={styles.featuredBgRadial2} />

              <View
                style={[
                  styles.featuredBadge,
                  {
                    backgroundColor: colors.gold + "30",
                    borderColor: colors.gold + "40",
                  },
                ]}
              >
                <Ionicons name="trophy-outline" size={12} color={colors.gold} />
                <Text
                  style={[
                    styles.featuredBadgeText,
                    { color: colors.gold, fontFamily: "DMSans_600SemiBold" },
                  ]}
                >
                  Celebrating 1 Year of Wonders
                </Text>
              </View>

              <Text
                style={[
                  styles.featuredMonth,
                  { color: colors.gold, fontFamily: "DMSans_600SemiBold" },
                ]}
              >
                June 2026 — Special Edition
              </Text>

              <Text
                style={[
                  styles.featuredTitle,
                  {
                    color: colors.text,
                    fontFamily: "PlayfairDisplay_600SemiBold",
                  },
                ]}
              >
                {featuredBooklet.title}
              </Text>

              <Text
                style={[
                  styles.featuredSub,
                  { color: colors.textSecondary, fontFamily: "DMSans_400Regular" },
                ]}
                numberOfLines={2}
              >
                {JUNE_2026_CELEBRATION_TAGLINE}
              </Text>

              <View style={styles.featuredFooter}>
                <View style={styles.featuredStatus}>
                  <Ionicons name="lock-closed" size={14} color={colors.gold} />
                  <Text
                    style={[
                      styles.featuredStatusText,
                      { color: colors.gold, fontFamily: "DMSans_600SemiBold" },
                    ]}
                  >
                    ₦{monthlyPriceNaira.toLocaleString()} to unlock
                  </Text>
                </View>
                <Pressable
                  onPress={() =>
                    handleUnlockBooklet({
                      id: featuredBooklet.id,
                      month: featuredBooklet.month,
                      year: featuredBooklet.year,
                    })
                  }
                  style={[
                    styles.featuredCta,
                    { backgroundColor: colors.gold },
                  ]}
                >
                  <Text
                    style={[
                      styles.featuredCtaText,
                      {
                        color: colors.background,
                        fontFamily: "DMSans_600SemiBold",
                      },
                    ]}
                  >
                    Unlock Now
                  </Text>
                  <Ionicons
                    name="arrow-forward-outline"
                    size={14}
                    color={colors.background}
                  />
                </Pressable>
              </View>
            </Pressable>
          </Animated.View>
        )}

        <Animated.View
          entering={FadeInDown.duration(500).delay(420)}
          style={styles.sectionHead}
        >
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.text, fontFamily: "PlayfairDisplay_500Medium" },
            ]}
          >
            All Booklets
          </Text>
          <Text
            style={[
              styles.sectionCount,
              { color: colors.textSecondary, fontFamily: "DMSans_500Medium" },
            ]}
          >
            {filteredBooklets.length} booklets
          </Text>
        </Animated.View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.gold} />
          </View>
        ) : filteredBooklets.length === 0 ? (
          <View style={styles.emptyStateWrap}>
            <View
              style={[
                styles.emptyIconCircle,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border + "30",
                },
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={28}
                color={colors.textSecondary}
              />
            </View>
            <Text
              style={[
                styles.emptyTitle,
                { color: colors.text, fontFamily: "PlayfairDisplay_500Medium" },
              ]}
            >
              No booklets found
            </Text>
            <Text
              style={[
                styles.emptyDesc,
                {
                  color: colors.textSecondary,
                  fontFamily: "DMSans_400Regular",
                },
              ]}
            >
              Try a different search or filter
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {filteredBooklets.map((booklet: any, index: number) => {
              const isUnlocked = unlockedSet.has(booklet.id);
              const coverColors: [string, string] = booklet.coverColor
                ? [booklet.coverColor, booklet.coverColor + "CC"]
                : [colors.surface, colors.surfaceSecondary];

              return (
                <Animated.View
                  key={booklet.id}
                  entering={FadeInDown.duration(400).delay(500 + index * 80)}
                  style={styles.gridItem}
                >
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: "/booklet/[id]",
                        params: { id: booklet.id.toString() },
                      })
                    }
                    style={({ pressed }) => [
                      styles.bookletCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border + "30",
                        opacity: pressed ? 0.92 : 1,
                        transform: [{ scale: pressed ? 0.97 : 1 }],
                      },
                    ]}
                  >
                    <LinearGradient
                      colors={coverColors}
                      start={{ x: 0, y: 1 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.bookletCover}
                    >
                      {getBookletCover(booklet.month, booklet.year) && (
                        <Image
                          source={getBookletCover(booklet.month, booklet.year)!}
                          style={styles.coverImage}
                          resizeMode="cover"
                        />
                      )}
                      {!isUnlocked && <View style={styles.lockedOverlay} />}

                      <Text
                        style={[
                          styles.coverMonth,
                          { fontFamily: "DMSans_600SemiBold" },
                        ]}
                      >
                        {monthNames[booklet.month]} {booklet.year}
                      </Text>
                      <Text
                        style={[
                          styles.coverTitle,
                          { fontFamily: "PlayfairDisplay_600SemiBold" },
                        ]}
                        numberOfLines={2}
                      >
                        {booklet.title}
                      </Text>
                    </LinearGradient>

                    <View style={styles.bookletBody}>
                      {isUnlocked ? (
                        <View
                          style={[
                            styles.statusBadge,
                            {
                              backgroundColor:
                                colors.success + "15",
                            },
                          ]}
                        >
                          <Ionicons
                            name="checkmark-circle"
                            size={14}
                            color={colors.success}
                          />
                          <Text
                            style={[
                              styles.statusText,
                              {
                                color: colors.success,
                                fontFamily: "DMSans_600SemiBold",
                              },
                            ]}
                          >
                            Unlocked
                          </Text>
                        </View>
                      ) : (
                        <View
                          style={[
                            styles.statusBadge,
                            {
                              backgroundColor:
                                colors.textSecondary + "12",
                            },
                          ]}
                        >
                          <Ionicons
                            name="lock-closed"
                            size={12}
                            color={colors.textSecondary}
                          />
                          <Text
                            style={[
                              styles.statusText,
                              {
                                color: colors.textSecondary,
                                fontFamily: "DMSans_600SemiBold",
                              },
                            ]}
                          >
                            Locked
                          </Text>
                        </View>
                      )}

                      <Text
                        style={[
                          styles.bookletPrice,
                          { color: colors.gold, fontFamily: "DMSans_600SemiBold" },
                        ]}
                      >
                        ₦{monthlyPriceNaira.toLocaleString()}
                      </Text>
                    </View>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        )}

        {!isLoading && filteredBooklets.length > 0 && (
          <Animated.View
            entering={FadeInDown.duration(500).delay(900)}
            style={styles.unlockMoreWrap}
          >
            <View
              style={[
                styles.unlockMoreIcon,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border + "30",
                },
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={28}
                color={colors.textSecondary}
              />
            </View>
            <Text
              style={[
                styles.unlockMoreTitle,
                {
                  color: colors.text,
                  fontFamily: "PlayfairDisplay_500Medium",
                },
              ]}
            >
              Unlock more booklets
            </Text>
            <Text
              style={[
                styles.unlockMoreDesc,
                {
                  color: colors.textSecondary,
                  fontFamily: "DMSans_400Regular",
                },
              ]}
            >
              Subscribe for ₦{monthlyPriceNaira.toLocaleString()}/month to unlock
              all {totalCount} booklets and earn more affirmation points.
            </Text>
          </Animated.View>
        )}
      </ScrollView>

      <PaymentDetailsModal
        visible={showPaymentModal}
        bookletTitle={
          selectedBooklet
            ? `${monthNames[selectedBooklet.month]} ${selectedBooklet.year}`
            : ""
        }
        amount={monthlyPriceNaira}
        paymentProvider={paymentProvider}
        bookletId={selectedBooklet?.id}
        onConfirmPayment={handleConfirmPayment}
        onCancel={() => {
          setShowPaymentModal(false);
          setSelectedBooklet(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  navTitle: { fontSize: 28, letterSpacing: -0.5 },
  navBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  searchWrap: { marginBottom: 12 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  chipsRow: { marginBottom: 16 },
  chipsContent: { gap: 8 },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 50,
    borderWidth: 1,
  },
  chipText: { fontSize: 13 },
  statsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 18,
    gap: 8,
    marginBottom: 18,
  },
  statText: { fontSize: 13, fontWeight: "500" },
  statStrong: { fontWeight: "700" },
  statDot: { width: 3, height: 3, borderRadius: 1.5 },
  featuredWrap: { marginBottom: 24 },
  featuredCard: {
    borderRadius: 24,
    overflow: "hidden",
    padding: 28,
    borderWidth: 1,
    borderColor: "rgba(212,168,83,0.25)",
  },
  featuredBgRadial1: {
    position: "absolute",
    top: -80,
    right: -60,
    width: 200,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(212,168,83,0.12)",
  },
  featuredBgRadial2: {
    position: "absolute",
    bottom: -60,
    left: -40,
    width: 160,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(212,168,83,0.08)",
  },
  featuredBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 50,
    borderWidth: 1,
    marginBottom: 16,
  },
  featuredBadgeText: { fontSize: 11, letterSpacing: 0.3 },
  featuredMonth: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  featuredTitle: {
    fontSize: 22,
    lineHeight: 28,
    marginBottom: 4,
  },
  featuredSub: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  featuredFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  featuredStatus: { flexDirection: "row", alignItems: "center", gap: 6 },
  featuredStatusText: { fontSize: 13 },
  featuredCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  featuredCtaText: { fontSize: 13 },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 18 },
  sectionCount: { fontSize: 13 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginBottom: 30,
  },
  gridItem: { width: "47.5%" },
  bookletCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  bookletCover: {
    height: 130,
    justifyContent: "flex-end",
    padding: 12,
  },
  coverImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    borderRadius: 0,
  },
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,44,79,0.5)",
    borderRadius: 0,
  },
  coverMonth: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    color: "rgba(255,255,255,0.85)",
    marginBottom: 4,
    position: "relative",
    zIndex: 2,
  },
  coverTitle: {
    fontSize: 15,
    color: "#fff",
    lineHeight: 20,
    position: "relative",
    zIndex: 2,
  },
  bookletBody: {
    padding: 12,
    gap: 10,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  statusText: { fontSize: 11 },
  bookletPrice: { fontSize: 13 },
  loadingContainer: { paddingVertical: 60, alignItems: "center" },
  emptyStateWrap: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 16, marginBottom: 6 },
  emptyDesc: { fontSize: 13, textAlign: "center", lineHeight: 20 },
  unlockMoreWrap: {
    alignItems: "center",
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  unlockMoreIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  unlockMoreTitle: { fontSize: 16, marginBottom: 6, textAlign: "center" },
  unlockMoreDesc: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },
});
