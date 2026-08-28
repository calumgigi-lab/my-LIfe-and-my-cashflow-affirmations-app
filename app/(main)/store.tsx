import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useColorScheme,
  ScrollView,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useThemeColors } from "@/constants/colors";
import { apiRequest } from "@/lib/query-client";
import { purchaseBooklet } from "@/lib/booklet-purchases";
import { PaymentDetailsModal } from "@/components/PaymentDetailsModal";

const CATEGORIES = ["All", "Monthly", "Bundle Deals", "Premium", "New Arrivals"] as const;

const TESTIMONIALS = [
  {
    id: 1,
    stars: 5,
    text: '"Since I started using these booklets, my mornings have changed completely. I speak life over my finances and business every day. God has been faithful \u2014 my cashflow has improved visibly!"',
    name: "Adaeze O.",
    role: "Lagos, Nigeria",
    initials: "AO",
    color: "#D4A853",
  },
  {
    id: 2,
    stars: 5,
    text: '"I bought the 3-Month Bundle and wished I had started earlier. The June edition celebrating 1 Year of Wonders was so powerful. Every month I look forward to the new booklet. Best investment I\'ve made!"',
    name: "Prince Jardon",
    role: "Abuja, Nigeria",
    initials: "PJ",
    color: "#BF5AF2",
  },
];

export default function StoreScreen() {
  const scheme = useColorScheme();
  const colors = useThemeColors(scheme);
  const insets = useSafeAreaInsets();
  const queryClient_ = useQueryClient();

  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedBooklet, setSelectedBooklet] = useState<{
    id: number;
    title: string;
    amount: number;
  } | null>(null);

  const { data: bookletsData } = useQuery<{ id: number; title: string; month: number; year: number; description: string; coverColor: string }[]>({
    queryKey: ["/api/booklets"],
  });

  const { data: rewardsData } = useQuery<{ points: number; totalEarned: number; totalSpent: number }>({
    queryKey: ["/api/rewards/balance"],
  });

  const { data: accessData } = useQuery<{ unlockedBookletIds: number[]; previewDays: number; monthlyPriceNaira: number }>({
    queryKey: ["/api/booklets/access"],
  });

  const booklets = bookletsData ?? [];
  const points = rewardsData?.points ?? 0;
  const unlockedIds = new Set(accessData?.unlockedBookletIds ?? []);

  const latestBooklet = booklets.length > 0 ? booklets[0] : null;

  const filteredBooklets = booklets.filter((b) => {
    if (activeCategory === "All") return true;
    if (activeCategory === "New Arrivals") return b.month === 8 && b.year === 2026;
    return true;
  });

  const featuredBooklets = booklets.slice(0, 3);

  const handleUnlock = useCallback(
    (booklet: { id: number; title: string }) => {
      if (unlockedIds.has(booklet.id)) {
        router.push({ pathname: "/booklet/[id]", params: { id: booklet.id.toString() } });
        return;
      }
      setSelectedBooklet({ id: booklet.id, title: booklet.title, amount: 1500 });
      setPaymentModalVisible(true);
    },
    [unlockedIds],
  );

  const handleBundle = useCallback(
    (type: "3month" | "annual") => {
      const title = type === "3month" ? "3-Month Bundle" : "Annual Pass";
      const amount = type === "3month" ? 3600 : 12000;
      setSelectedBooklet({ id: 0, title, amount });
      setPaymentModalVisible(true);
    },
    [],
  );

  const handleConfirmPayment = useCallback(async () => {
    if (!selectedBooklet) return;
    if (selectedBooklet.id > 0) {
      const booklet = booklets.find((b) => b.id === selectedBooklet.id);
      if (booklet) {
        await purchaseBooklet({ id: booklet.id, month: booklet.month, year: booklet.year });
      }
    }
    setPaymentModalVisible(false);
    setSelectedBooklet(null);
    queryClient_.invalidateQueries({ queryKey: ["/api/booklets/access"] });
    queryClient_.invalidateQueries({ queryKey: ["/api/rewards/balance"] });
  }, [selectedBooklet, booklets, queryClient_]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {/* Nav Header */}
        <Animated.View entering={FadeInDown.duration(500).delay(50)} style={styles.nav}>
          <Text style={[styles.navTitle, { color: colors.text, fontFamily: "PlayfairDisplay_700Bold" }]}>
            Store
          </Text>
          <Pressable
            style={[styles.navCart, { backgroundColor: colors.surface, borderColor: colors.border + "30" }]}
          >
            <Ionicons name="bag-outline" size={20} color={colors.text} />
            <View style={[styles.navBadge, { backgroundColor: colors.gold }]}>
              <Text style={[styles.navBadgeText, { color: colors.background }]}>0</Text>
            </View>
          </Pressable>
        </Animated.View>

        {/* Hero Banner */}
        <Animated.View entering={FadeInDown.duration(600).delay(100)}>
          <LinearGradient
            colors={["#E85D04", "#C44B03", colors.background]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroBadge}>
              <Ionicons name="sparkles" size={14} color="#FFB380" />
              <Text style={styles.heroBadgeText}>New This Month</Text>
            </View>
            <Text style={[styles.heroLabel, { color: colors.border }]}>August 2026 Edition</Text>
            <Text style={[styles.heroTitle, { color: colors.text, fontFamily: "PlayfairDisplay_700Bold" }]}>
              My Life &{"\n"}My Cashflow Affirmations
            </Text>
            <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
              Start each day with power. A 30-day guided booklet to align your words with God&apos;s promises for your finances and life.
            </Text>
            <Text style={[styles.heroAuthor, { color: colors.border }]}>by Chinedum Ilechukwu</Text>
            <Text style={[styles.heroPrice, { fontFamily: "PlayfairDisplay_700Bold" }]}>{"\u20A6"}1,500</Text>
            <Pressable
              style={styles.heroCta}
              onPress={() =>
                handleUnlock({
                  id: latestBooklet?.id ?? 1,
                  title: latestBooklet?.title ?? "August 2026 Booklet",
                })
              }
            >
              <Ionicons name="lock-open-outline" size={18} color="#1A0A00" />
              <Text style={styles.heroCtaText}>Unlock Now</Text>
            </Pressable>
            <Ionicons name="star" size={28} color="#FFB380" style={[styles.heroStar, { top: 14, right: 20 }]} />
            <Ionicons name="star" size={16} color="#FFB380" style={[styles.heroStar, { top: 48, right: 50, opacity: 0.15 }]} />
            <Ionicons name="star" size={22} color="#FFB380" style={[styles.heroStar, { bottom: 26, right: 14 }]} />
          </LinearGradient>
        </Animated.View>

        {/* Points Balance */}
        <Animated.View entering={FadeInDown.duration(500).delay(200)}>
          <View style={[styles.pointsBar, { backgroundColor: colors.gold + "10", borderColor: colors.gold + "30" }]}>
            <View style={styles.pointsLeft}>
              <LinearGradient
                colors={["#D4A853", "#C49A3A"]}
                style={styles.pointsStarIcon}
              >
                <Ionicons name="star" size={18} color={colors.background} />
              </LinearGradient>
              <View>
                <Text style={[styles.pointsLabel, { color: colors.border }]}>Your Balance</Text>
                <Text style={[styles.pointsValue, { color: colors.gold, fontFamily: "PlayfairDisplay_700Bold" }]}>
                  {points} pts
                </Text>
              </View>
            </View>
            <Pressable style={[styles.pointsRedeem, { borderColor: colors.gold + "30" }]}>
              <Text style={[styles.pointsRedeemText, { color: colors.gold }]}>Redeem</Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* Category Chips */}
        <Animated.View entering={FadeInDown.duration(500).delay(300)} style={styles.categoriesContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesScroll}>
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <Pressable
                  key={cat}
                  onPress={() => setActiveCategory(cat)}
                  style={[
                    styles.catChip,
                    {
                      backgroundColor: isActive ? colors.gold : colors.surface,
                      borderColor: isActive ? "transparent" : colors.border + "30",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.catChipText,
                      { color: isActive ? colors.background : colors.textSecondary },
                    ]}
                  >
                    {cat}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* Featured This Month */}
        <Animated.View entering={FadeInDown.duration(500).delay(350)} style={styles.sectionHead}>
          <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: "PlayfairDisplay_700Bold" }]}>
            Featured This Month
          </Text>
          <Pressable>
            <Text style={[styles.sectionLink, { color: colors.gold }]}>See All</Text>
          </Pressable>
        </Animated.View>
        <Animated.View entering={FadeInDown.duration(500).delay(400)}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredScroll}>
            {featuredBooklets.map((b) => (
              <Pressable
                key={b.id}
                style={[styles.featuredCard, { backgroundColor: colors.surface, borderColor: colors.border + "25" }]}
                onPress={() => handleUnlock({ id: b.id, title: b.title })}
              >
                <LinearGradient
                  colors={[b.coverColor || "#6366F1", darkenColor(b.coverColor || "#6366F1", 30)]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.featuredCardImg}
                >
                  <Text style={styles.featuredMonthTag}>
                    {monthName(b.month)} {b.year}
                  </Text>
                  <Ionicons name="book-outline" size={36} color="rgba(255,255,255,0.35)" />
                </LinearGradient>
                <View style={styles.featuredCardBody}>
                  <Text style={[styles.featuredCardTitle, { color: colors.text }]} numberOfLines={2}>
                    {b.title}
                  </Text>
                  <Text style={[styles.featuredCardPrice, { color: colors.gold, fontFamily: "PlayfairDisplay_700Bold" }]}>
                    {"\u20A6"}1,500
                  </Text>
                  <Pressable
                    style={[styles.btnUnlockSm, { backgroundColor: colors.gold }]}
                    onPress={() => handleUnlock({ id: b.id, title: b.title })}
                  >
                    <Text style={[styles.btnUnlockSmText, { color: colors.background }]}>Unlock</Text>
                  </Pressable>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </Animated.View>

        {/* All Booklets Grid */}
        <Animated.View entering={FadeInDown.duration(500).delay(450)} style={styles.sectionHead}>
          <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: "PlayfairDisplay_700Bold" }]}>
            All Booklets
          </Text>
        </Animated.View>
        <Animated.View entering={FadeInDown.duration(500).delay(500)} style={styles.bookletsGrid}>
          {filteredBooklets.map((b) => {
            const isUnlocked = unlockedIds.has(b.id);
            return (
              <Pressable
                key={b.id}
                style={[styles.bookletCard, { backgroundColor: colors.surface, borderColor: colors.border + "25" }]}
                onPress={() => handleUnlock({ id: b.id, title: b.title })}
              >
                <LinearGradient
                  colors={[b.coverColor || "#1565C0", darkenColor(b.coverColor || "#1565C0", 30)]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.bookletCardImg}
                >
                  <Text style={styles.bookletMonthTag}>
                    {monthName(b.month)} {b.year}
                  </Text>
                  <Ionicons name="book-outline" size={22} color="rgba(255,255,255,0.3)" />
                </LinearGradient>
                <View style={styles.bookletCardBody}>
                  <Text style={[styles.bookletCardTitle, { color: colors.text }]} numberOfLines={2}>
                    {b.title}
                  </Text>
                  <Text style={[styles.bookletCardPrice, { color: colors.gold, fontFamily: "PlayfairDisplay_700Bold" }]}>
                    {"\u20A6"}1,500
                  </Text>
                  <Pressable
                    style={[styles.btnUnlock, { backgroundColor: colors.gold }]}
                    onPress={() => handleUnlock({ id: b.id, title: b.title })}
                  >
                    <Text style={[styles.btnUnlockText, { color: colors.background }]}>
                      {isUnlocked ? "Open" : "Unlock"}
                    </Text>
                  </Pressable>
                </View>
              </Pressable>
            );
          })}
        </Animated.View>

        {/* Bundle Deals */}
        <Animated.View entering={FadeInDown.duration(500).delay(550)} style={styles.sectionHead}>
          <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: "PlayfairDisplay_700Bold" }]}>
            Save More with Bundles
          </Text>
        </Animated.View>
        <Animated.View entering={FadeInDown.duration(500).delay(600)} style={styles.bundleSection}>
          <View style={[styles.bundleCard, { backgroundColor: colors.surface, borderColor: colors.border + "25" }]}>
            <LinearGradient
              colors={[colors.surface, "#163358"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.bundleCardGradient}
            >
              <View style={[styles.bundleBadge, { backgroundColor: colors.gold + "15", borderColor: colors.gold + "30" }]}>
                <Ionicons name="trending-down" size={12} color={colors.gold} />
                <Text style={[styles.bundleBadgeText, { color: colors.gold }]}>Save 20%</Text>
              </View>
              <Text style={[styles.bundleTitle, { color: colors.text, fontFamily: "PlayfairDisplay_700Bold" }]}>
                3-Month Bundle
              </Text>
              <Text style={[styles.bundleDesc, { color: colors.textSecondary }]}>
                Get June, July & August 2026 booklets together and save. Perfect for building a consistent affirmation practice.
              </Text>
              <View style={styles.bundlePriceRow}>
                <Text style={[styles.bundlePrice, { color: colors.gold, fontFamily: "PlayfairDisplay_700Bold" }]}>
                  {"\u20A6"}3,600
                </Text>
                <Text style={[styles.bundleOriginal, { color: colors.border }]}>{"\u20A6"}4,500</Text>
              </View>
              <Pressable style={[styles.btnBundle, { backgroundColor: colors.gold }]} onPress={() => handleBundle("3month")}>
                <Ionicons name="cart-outline" size={16} color={colors.background} />
                <Text style={[styles.btnBundleText, { color: colors.background }]}>Get Bundle</Text>
              </Pressable>
            </LinearGradient>
          </View>
          <View style={[styles.bundleCard, { backgroundColor: colors.surface, borderColor: colors.border + "25" }]}>
            <LinearGradient
              colors={[colors.surface, "#163358"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.bundleCardGradient}
            >
              <View style={[styles.bundleBadge, { backgroundColor: "#BF5AF2" + "15", borderColor: "#BF5AF2" + "30" }]}>
                <Ionicons name="diamond" size={12} color="#BF5AF2" />
                <Text style={[styles.bundleBadgeText, { color: "#BF5AF2" }]}>Best Value</Text>
              </View>
              <Text style={[styles.bundleTitle, { color: colors.text, fontFamily: "PlayfairDisplay_700Bold" }]}>
                Annual Pass
              </Text>
              <Text style={[styles.bundleDesc, { color: colors.textSecondary }]}>
                Unlock every booklet for a full year. Never miss a monthly edition and save over 45% compared to buying individually.
              </Text>
              <View style={styles.bundlePriceRow}>
                <Text style={[styles.bundlePrice, { color: colors.gold, fontFamily: "PlayfairDisplay_700Bold" }]}>
                  {"\u20A6"}12,000
                </Text>
              </View>
              <Pressable style={[styles.btnBundle, { backgroundColor: colors.gold }]} onPress={() => handleBundle("annual")}>
                <Ionicons name="key-outline" size={16} color={colors.background} />
                <Text style={[styles.btnBundleText, { color: colors.background }]}>Get Pass</Text>
              </Pressable>
            </LinearGradient>
          </View>
        </Animated.View>

        {/* Testimonials */}
        <Animated.View entering={FadeInDown.duration(500).delay(650)} style={styles.sectionHead}>
          <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: "PlayfairDisplay_700Bold" }]}>
            What Users Say
          </Text>
        </Animated.View>
        <Animated.View entering={FadeInDown.duration(500).delay(700)} style={styles.testimonialsSection}>
          {TESTIMONIALS.map((t) => (
            <View
              key={t.id}
              style={[styles.testimonialCard, { backgroundColor: colors.surface, borderColor: colors.border + "25" }]}
            >
              <View style={styles.testimonialStars}>
                {Array.from({ length: t.stars }).map((_, i) => (
                  <Ionicons key={i} name="star" size={14} color={colors.gold} />
                ))}
              </View>
              <Text style={[styles.testimonialText, { color: colors.textSecondary }]}>{t.text}</Text>
              <View style={styles.testimonialAuthor}>
                <LinearGradient
                  colors={[t.color, t.color + "CC"]}
                  style={styles.testimonialAvatar}
                >
                  <Text style={[styles.testimonialAvatarText, { color: colors.background }]}>{t.initials}</Text>
                </LinearGradient>
                <View>
                  <Text style={[styles.testimonialName, { color: colors.text }]}>{t.name}</Text>
                  <Text style={[styles.testimonialRole, { color: colors.border }]}>{t.role}</Text>
                </View>
              </View>
            </View>
          ))}
        </Animated.View>

        {/* Footer */}
        <Animated.View entering={FadeInDown.duration(500).delay(750)} style={styles.footer}>
          <View style={[styles.footerIcon, { backgroundColor: colors.gold + "12", borderColor: colors.gold + "25" }]}>
            <Ionicons name="notifications-outline" size={22} color={colors.gold} />
          </View>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            <Text style={{ color: colors.gold, fontWeight: "700" }}>New booklets added every month{"\n"}</Text>
            Subscribe to get notified when new editions drop
          </Text>
        </Animated.View>
      </ScrollView>

      {/* Payment Modal */}
      {selectedBooklet && (
        <PaymentDetailsModal
          visible={paymentModalVisible}
          bookletTitle={selectedBooklet.title}
          amount={selectedBooklet.amount}
          onConfirmPayment={handleConfirmPayment}
          onCancel={() => {
            setPaymentModalVisible(false);
            setSelectedBooklet(null);
          }}
          bookletId={selectedBooklet.id > 0 ? selectedBooklet.id : undefined}
        />
      )}
    </View>
  );
}

function monthName(m: number): string {
  const names = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return names[m] ?? "";
}

function darkenColor(hex: string, amount: number): string {
  const raw = hex.replace("#", "");
  const r = Math.max(0, parseInt(raw.substring(0, 2), 16) - amount);
  const g = Math.max(0, parseInt(raw.substring(2, 4), 16) - amount);
  const b = Math.max(0, parseInt(raw.substring(4, 6), 16) - amount);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  navTitle: { fontSize: 30, letterSpacing: -0.5 },
  navCart: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    borderWidth: 1,
  },
  navBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  navBadgeText: { fontSize: 11, fontWeight: "700" },

  hero: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 24,
    padding: 24,
    overflow: "hidden",
    position: "relative",
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 5,
    backgroundColor: "rgba(232,93,4,0.2)",
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(232,93,4,0.35)",
  },
  heroBadgeText: { fontSize: 12, fontWeight: "600", color: "#FFB380" },
  heroLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  heroTitle: { fontSize: 22, fontWeight: "700", lineHeight: 30, marginBottom: 8, color: "#FFB380" },
  heroSubtitle: { fontSize: 13, lineHeight: 20, marginBottom: 16, maxWidth: 280 },
  heroAuthor: { fontSize: 12, marginBottom: 10 },
  heroPrice: { fontSize: 28, fontWeight: "700", color: "#FFB380", marginBottom: 16, textShadowColor: "rgba(232,93,4,0.3)", textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 20 },
  heroCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    backgroundColor: "linear-gradient(135deg, #FFB380, #FF8C42)",
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 13,
  },
  heroCtaText: { fontSize: 14, fontWeight: "700", color: "#1A0A00" },
  heroStar: { position: "absolute", opacity: 0.25 },

  pointsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
  },
  pointsLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  pointsStarIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  pointsLabel: { fontSize: 11, fontWeight: "500" },
  pointsValue: { fontSize: 16, fontWeight: "700" },
  pointsRedeem: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 99,
    borderWidth: 1,
    backgroundColor: "rgba(212,168,83,0.08)",
  },
  pointsRedeemText: { fontSize: 13, fontWeight: "600" },

  categoriesContainer: { paddingTop: 18 },
  categoriesScroll: { paddingHorizontal: 16, gap: 8 },
  catChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 99,
    borderWidth: 1,
  },
  catChipText: { fontSize: 13, fontWeight: "600" },

  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: "700" },
  sectionLink: { fontSize: 12, fontWeight: "600" },

  featuredScroll: { paddingHorizontal: 16, gap: 12 },
  featuredCard: {
    width: 200,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
  },
  featuredCardImg: { height: 120, alignItems: "center", justifyContent: "center", position: "relative" },
  featuredMonthTag: {
    position: "absolute",
    top: 10,
    left: 10,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "rgba(255,255,255,0.7)",
    backgroundColor: "rgba(0,0,0,0.25)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: "hidden",
  },
  featuredCardBody: { padding: 14 },
  featuredCardTitle: { fontSize: 13, fontWeight: "600", lineHeight: 18, marginBottom: 8, minHeight: 36 },
  featuredCardPrice: { fontSize: 17, fontWeight: "700", marginBottom: 10 },
  btnUnlockSm: { borderRadius: 10, paddingVertical: 9, alignItems: "center" },
  btnUnlockSmText: { fontSize: 12, fontWeight: "700" },

  bookletsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 12,
  },
  bookletCard: {
    width: "47%",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
  },
  bookletCardImg: {
    height: 90,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  bookletMonthTag: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "rgba(255,255,255,0.8)",
    backgroundColor: "rgba(0,0,0,0.3)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: "hidden",
  },
  bookletCardBody: { padding: 12 },
  bookletCardTitle: { fontSize: 12, fontWeight: "600", lineHeight: 17, marginBottom: 6, minHeight: 34 },
  bookletCardPrice: { fontSize: 15, fontWeight: "700", marginBottom: 8 },
  btnUnlock: { borderRadius: 10, paddingVertical: 8, alignItems: "center" },
  btnUnlockText: { fontSize: 11, fontWeight: "700" },

  bundleSection: { paddingHorizontal: 16 },
  bundleCard: {
    borderRadius: 24,
    marginBottom: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  bundleCardGradient: { padding: 22 },
  bundleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 12,
  },
  bundleBadgeText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6 },
  bundleTitle: { fontSize: 19, fontWeight: "700", marginBottom: 6 },
  bundleDesc: { fontSize: 13, lineHeight: 20, marginBottom: 16 },
  bundlePriceRow: { flexDirection: "row", alignItems: "baseline", gap: 10, marginBottom: 16 },
  bundlePrice: { fontSize: 24, fontWeight: "700" },
  bundleOriginal: { fontSize: 14, textDecorationLine: "line-through" },
  btnBundle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  btnBundleText: { fontSize: 14, fontWeight: "700" },

  testimonialsSection: { paddingHorizontal: 16 },
  testimonialCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
  },
  testimonialStars: { flexDirection: "row", gap: 2, marginBottom: 10 },
  testimonialText: { fontSize: 13, lineHeight: 22, marginBottom: 14, fontStyle: "italic" },
  testimonialAuthor: { flexDirection: "row", alignItems: "center", gap: 10 },
  testimonialAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  testimonialAvatarText: { fontSize: 12, fontWeight: "700" },
  testimonialName: { fontSize: 13, fontWeight: "600" },
  testimonialRole: { fontSize: 11 },

  footer: {
    marginTop: 28,
    paddingHorizontal: 16,
    paddingTop: 28,
    paddingBottom: 16,
    alignItems: "center",
    borderTopWidth: 1,
  },
  footerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 1,
  },
  footerText: { fontSize: 13, textAlign: "center", lineHeight: 20 },
});
