import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useColorScheme,
  ScrollView,
  TextInput,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { useThemeColors } from "@/constants/colors";

const PAYMENT_METHODS = [
  {
    id: "card",
    name: "Credit / Debit Card",
    detail: "•••• 4242",
    icon: "card-outline" as const,
    iconBg: "rgba(212,168,83,0.15)",
    iconColor: "#D4A853",
  },
  {
    id: "bank",
    name: "Bank Transfer",
    detail: "UBA Bank",
    icon: "business-outline" as const,
    iconBg: "rgba(48,209,88,0.12)",
    iconColor: "#30D158",
  },
  {
    id: "flutterwave",
    name: "Flutterwave",
    detail: "Pay with Flutterwave",
    icon: "wallet-outline" as const,
    iconBg: "rgba(100,130,255,0.12)",
    iconColor: "#7B8FFF",
  },
];

export default function CartScreen() {
  const scheme = useColorScheme();
  const colors = useThemeColors(scheme);
  const insets = useSafeAreaInsets();

  const [promoCode, setPromoCode] = useState("");
  const [selectedPayment, setSelectedPayment] = useState("card");

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {/* Nav Bar */}
        <Animated.View entering={FadeInDown.duration(500).delay(50)} style={styles.nav}>
          <Pressable
            style={[styles.navBack, { backgroundColor: colors.surface, borderColor: colors.border + "30" }]}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>
          <Text style={[styles.navTitle, { color: colors.text, fontFamily: "PlayfairDisplay_700Bold" }]}>
            My Cart
          </Text>
          <View style={styles.navRightPlaceholder} />
        </Animated.View>

        {/* Empty Cart State */}
        <Animated.View
          entering={FadeInDown.duration(600).delay(150)}
          style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border + "25" }]}
        >
          <View style={[styles.emptyIconWrap, { backgroundColor: colors.background, borderColor: colors.border + "20" }]}>
            <Ionicons name="bag-handle-outline" size={56} color={colors.textSecondary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text, fontFamily: "PlayfairDisplay_700Bold" }]}>
            Your cart is empty
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Browse our collection of affirmation booklets and add something meaningful to your cart.
          </Text>
          <Pressable
            style={[styles.browseBtn, { backgroundColor: colors.gold }]}
            onPress={() => router.back()}
          >
            <Ionicons name="storefront-outline" size={18} color={colors.background} />
            <Text style={[styles.browseBtnText, { color: colors.background }]}>Browse Store</Text>
          </Pressable>
        </Animated.View>

        {/* Promo Code */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(250)}
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border + "25" }]}
        >
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Promo Code</Text>
          <View style={styles.promoRow}>
            <TextInput
              style={[
                styles.promoInput,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border + "30",
                  color: colors.text,
                },
              ]}
              placeholder="Enter promo code"
              placeholderTextColor={colors.textSecondary + "80"}
              value={promoCode}
              onChangeText={setPromoCode}
              autoCapitalize="characters"
            />
            <Pressable
              style={[styles.promoApply, { borderColor: colors.gold }]}
              onPress={() => {}}
            >
              <Text style={[styles.promoApplyText, { color: colors.gold }]}>Apply</Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* Order Summary */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(300)}
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border + "25" }]}
        >
          <Text style={[styles.cardTitle, { color: colors.text, fontFamily: "PlayfairDisplay_700Bold" }]}>
            Order Summary
          </Text>
          <View style={styles.summaryBody}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Subtotal (0 items)</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{"\u20A6"}0</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.border + "30" }]} />
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.text, fontWeight: "600" }]}>Total</Text>
              <Text style={[styles.summaryTotalValue, { color: colors.gold, fontFamily: "PlayfairDisplay_700Bold" }]}>
                {"\u20A6"}0
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Payment Methods */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(350)}
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border + "25" }]}
        >
          <Text style={[styles.cardTitle, { color: colors.text, fontFamily: "PlayfairDisplay_700Bold" }]}>
            Payment Method
          </Text>
          <View style={styles.paymentList}>
            {PAYMENT_METHODS.map((pm) => {
              const isSelected = selectedPayment === pm.id;
              return (
                <Pressable
                  key={pm.id}
                  style={[
                    styles.paymentOption,
                    {
                      backgroundColor: isSelected ? colors.gold + "10" : colors.background + "30",
                      borderColor: isSelected ? colors.gold + "35" : colors.border + "30",
                    },
                  ]}
                  onPress={() => setSelectedPayment(pm.id)}
                >
                  <View style={[styles.paymentIcon, { backgroundColor: pm.iconBg }]}>
                    <Ionicons name={pm.icon} size={20} color={pm.iconColor} />
                  </View>
                  <View style={styles.paymentInfo}>
                    <Text style={[styles.paymentName, { color: colors.text }]}>{pm.name}</Text>
                    <Text style={[styles.paymentDetail, { color: colors.textSecondary }]}>{pm.detail}</Text>
                  </View>
                  <View
                    style={[
                      styles.radio,
                      { borderColor: isSelected ? colors.gold : colors.border + "50" },
                    ]}
                  >
                    {isSelected && <View style={[styles.radioDot, { backgroundColor: colors.gold }]} />}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        {/* Points Redemption */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(400)}
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border + "25" }]}
        >
          <View style={styles.pointsRow}>
            <View>
              <Text style={[styles.pointsLabel, { color: colors.text }]}>Use Reward Points</Text>
              <Text style={[styles.pointsDetail, { color: colors.textSecondary }]}>
                You have 0 points — earn points by completing daily affirmations
              </Text>
            </View>
            <View style={[styles.toggleTrack, { backgroundColor: colors.border + "40" }]}>
              <View style={[styles.toggleKnob, { left: 2 }]} />
            </View>
          </View>
        </Animated.View>

        {/* Pay Button */}
        <Animated.View entering={FadeInDown.duration(500).delay(450)} style={styles.paySection}>
          <Pressable style={[styles.payBtn, { backgroundColor: colors.gold }]} onPress={() => {}}>
            <Ionicons name="lock-closed" size={18} color={colors.background} />
            <Text style={[styles.payBtnText, { color: colors.background }]}>Pay {"\u20A6"}0</Text>
          </Pressable>
        </Animated.View>

        {/* Security Badge */}
        <Animated.View entering={FadeIn.duration(400).delay(500)}>
          <Text style={[styles.securityBadge, { color: colors.textSecondary }]}>
            Secured by Flutterwave &nbsp;{"\uD83D\uDD12"}
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
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
  navBack: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  navTitle: { fontSize: 20, fontWeight: "600", letterSpacing: -0.5 },
  navRightPlaceholder: { width: 40 },

  emptyState: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 24,
    borderWidth: 1,
    padding: 32,
    alignItems: "center",
  },
  emptyIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    borderWidth: 1,
  },
  emptyTitle: { fontSize: 20, fontWeight: "700", marginBottom: 8, textAlign: "center" },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 24,
    maxWidth: 260,
  },
  browseBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
  },
  browseBtnText: { fontSize: 15, fontWeight: "700" },

  card: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  cardLabel: { fontSize: 13, fontWeight: "500", marginBottom: 12 },
  cardTitle: { fontSize: 19, fontWeight: "600", marginBottom: 16 },

  promoRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  promoInput: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
  },
  promoApply: {
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  promoApplyText: { fontSize: 14, fontWeight: "600" },

  summaryBody: { gap: 12 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 14, fontWeight: "600", fontVariant: ["tabular-nums"] },
  summaryTotalValue: { fontSize: 26, fontWeight: "700", fontVariant: ["tabular-nums"] },
  summaryDivider: { height: 1, marginVertical: 4 },

  paymentList: { gap: 10 },
  paymentOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  paymentIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentInfo: { flex: 1 },
  paymentName: { fontSize: 14, fontWeight: "600" },
  paymentDetail: { fontSize: 12, marginTop: 2 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: { width: 10, height: 10, borderRadius: 5 },

  pointsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pointsLabel: { fontSize: 15, fontWeight: "600" },
  pointsDetail: { fontSize: 13, marginTop: 4, maxWidth: 240 },
  toggleTrack: {
    width: 50,
    height: 28,
    borderRadius: 14,
    position: "relative",
  },
  toggleKnob: {
    position: "absolute",
    top: 3,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#fff",
  },

  paySection: {
    marginHorizontal: 16,
    marginTop: 20,
  },
  payBtn: {
    width: "100%",
    height: 56,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  payBtnText: { fontSize: 17, fontWeight: "700" },

  securityBadge: {
    textAlign: "center",
    fontSize: 12,
    marginTop: 14,
    marginBottom: 8,
  },
});
