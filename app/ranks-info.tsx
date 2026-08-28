import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors } from "@/constants/colors";

const RANK_TIERS = [
  {
    name: "Bronze",
    color: "#CD7F32",
    points: "0 - 499",
    benefits: ["Basic affirmations", "Daily reminders", "Simple tracking"],
  },
  {
    name: "Silver",
    color: "#C0C0C0",
    points: "500 - 1,499",
    benefits: ["All Bronze benefits", "Custom affirmations", "Progress stats"],
  },
  {
    name: "Gold",
    color: "#FFD700",
    points: "1,500 - 3,999",
    benefits: ["All Silver benefits", "Priority support", "Exclusive content"],
  },
  {
    name: "Platinum",
    color: "#E5E4E2",
    points: "4,000 - 9,999",
    benefits: ["All Gold benefits", "Early access", "Custom themes"],
  },
  {
    name: "Diamond",
    color: "#B9F2FF",
    points: "10,000+",
    benefits: ["All Platinum benefits", "VIP events", "Personal coach"],
  },
];

const FAQ_ITEMS = [
  {
    question: "How do I earn points?",
    answer:
      "You earn points by reading affirmations, completing journal entries, sharing with friends, and maintaining daily streaks.",
  },
  {
    question: "Do points expire?",
    answer:
      "No, your points never expire. However, inactive accounts may lose rank after 6 months of no activity.",
  },
  {
    question: "Can I lose my rank?",
    answer:
      "Ranks are permanent once achieved, but you must maintain activity to keep your rank visible on your profile.",
  },
  {
    question: "What are the benefits of higher ranks?",
    answer:
      "Higher ranks unlock exclusive content, priority support, custom themes, and special community features.",
  },
];

export default function RanksInfoScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top },
      ]}
    >
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.navButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.text }]}>
          How Ranking Works
        </Text>
        <View style={styles.navButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(600)} style={styles.heroContainer}>
          <Ionicons name="trophy" size={80} color={colors.gold} />
          <Text style={[styles.heroTitle, { color: colors.text }]}>
            Level Up Your Journey
          </Text>
          <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
            Earn points through daily practice and unlock amazing rewards
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(600).delay(200)} style={styles.pointsSection}>
          <Text style={[styles.sectionTitle, { color: colors.gold }]}>
            Earning Points
          </Text>
          <View style={styles.pointsGrid}>
            <View style={[styles.pointsCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <Ionicons name="book" size={28} color={colors.tint} />
              <Text style={[styles.pointsValue, { color: colors.text }]}>+10</Text>
              <Text style={[styles.pointsLabel, { color: colors.textSecondary }]}>
                Read Affirmation
              </Text>
            </View>
            <View style={[styles.pointsCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <Ionicons name="create" size={28} color={colors.tint} />
              <Text style={[styles.pointsValue, { color: colors.text }]}>+25</Text>
              <Text style={[styles.pointsLabel, { color: colors.textSecondary }]}>
                Journal Entry
              </Text>
            </View>
            <View style={[styles.pointsCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <Ionicons name="share-social" size={28} color={colors.tint} />
              <Text style={[styles.pointsValue, { color: colors.text }]}>+15</Text>
              <Text style={[styles.pointsLabel, { color: colors.textSecondary }]}>
                Share with Friend
              </Text>
            </View>
            <View style={[styles.pointsCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <Ionicons name="flame" size={28} color={colors.tint} />
              <Text style={[styles.pointsValue, { color: colors.text }]}>+50</Text>
              <Text style={[styles.pointsLabel, { color: colors.textSecondary }]}>
                7-Day Streak
              </Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(600).delay(400)}>
          <Text style={[styles.sectionTitle, { color: colors.gold, marginTop: 30 }]}>
            Rank Tiers
          </Text>
          {RANK_TIERS.map((tier, index) => (
            <View
              key={tier.name}
              style={[styles.tierCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
            >
              <View style={styles.tierHeader}>
                <View
                  style={[
                    styles.tierBadge,
                    { backgroundColor: tier.color },
                  ]}
                >
                  <Ionicons
                    name={
                      tier.name === "Diamond"
                        ? "diamond"
                        : tier.name === "Platinum"
                        ? "shield"
                        : tier.name === "Gold"
                        ? "star"
                        : tier.name === "Silver"
                        ? "moon"
                        : "leaf"
                    }
                    size={24}
                    color={colors.background}
                  />
                </View>
                <View style={styles.tierInfo}>
                  <Text style={[styles.tierName, { color: tier.color }]}>
                    {tier.name}
                  </Text>
                  <Text style={[styles.tierPoints, { color: colors.textSecondary }]}>
                    {tier.points} points
                  </Text>
                </View>
              </View>
              <View style={styles.tierBenefits}>
                {tier.benefits.map((benefit, bIndex) => (
                  <View key={bIndex} style={styles.benefitRow}>
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color={colors.success}
                    />
                    <Text style={[styles.benefitText, { color: colors.text }]}>
                      {benefit}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(600).delay(600)} style={styles.faqSection}>
          <Text style={[styles.sectionTitle, { color: colors.gold }]}>
            Frequently Asked Questions
          </Text>
          {FAQ_ITEMS.map((faq, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => toggleFaq(index)}
              style={[styles.faqItem, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
            >
              <View style={styles.faqHeader}>
                <Text style={[styles.faqQuestion, { color: colors.text }]}>
                  {faq.question}
                </Text>
                <Ionicons
                  name={expandedFaq === index ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={colors.tint}
                />
              </View>
              {expandedFaq === index && (
                <Text style={[styles.faqAnswer, { color: colors.textSecondary }]}>
                  {faq.answer}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </Animated.View>

        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.gotItButton, { backgroundColor: colors.gold }]}
        >
          <Text style={[styles.gotItText, { color: colors.background }]}>
            Got It
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  navBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  navButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  navTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  heroContainer: {
    alignItems: "center",
    marginVertical: 30,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "bold",
    marginTop: 20,
    textAlign: "center",
  },
  heroSubtitle: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 10,
    paddingHorizontal: 20,
  },
  pointsSection: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
  },
  pointsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  pointsCard: {
    width: "48%",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  pointsValue: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 10,
  },
  pointsLabel: {
    fontSize: 12,
    marginTop: 5,
    textAlign: "center",
  },
  tierCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  tierHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 14,
  },
  tierBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  tierInfo: {
    flex: 1,
  },
  tierName: {
    fontSize: 18,
    fontWeight: "bold",
  },
  tierPoints: {
    fontSize: 14,
    marginTop: 2,
  },
  tierBenefits: {
    gap: 8,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  benefitText: {
    fontSize: 14,
  },
  faqSection: {
    marginTop: 30,
  },
  faqItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
  },
  faqHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
    marginRight: 10,
  },
  faqAnswer: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
  },
  gotItButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 30,
  },
  gotItText: {
    fontSize: 16,
    fontWeight: "bold",
  },
});
