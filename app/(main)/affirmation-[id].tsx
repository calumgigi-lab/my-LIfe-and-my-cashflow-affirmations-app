import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
  Pressable,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors } from "@/constants/colors";

export default function AffirmationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  const [affirmation, setAffirmation] = useState<any>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isRead, setIsRead] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAffirmation();
  }, [id]);

  const fetchAffirmation = async () => {
    try {
      const response = await fetch(`/api/affirmations/${id}`);
      const data = await response.json();
      setAffirmation(data);
      setIsFavorited(data.isFavorited || false);
      setIsRead(data.isRead || false);
    } catch (error) {
      console.error("Failed to fetch affirmation:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (affirmation?.text) {
      try {
        const Clipboard = require("expo-clipboard");
        await Clipboard.setStringAsync(affirmation.text);
        Alert.alert("Copied", "Affirmation copied to clipboard");
      } catch {
        await Share.share({ message: affirmation.text });
      }
    }
  };

  const handleShare = async () => {
    if (affirmation?.text) {
      await Share.share({
        message: affirmation.text,
      });
    }
  };

  const handleToggleFavorite = () => {
    setIsFavorited(!isFavorited);
  };

  const handleMarkAsRead = () => {
    setIsRead(true);
    Alert.alert("Success", "Affirmation marked as read!");
  };

  if (loading || !affirmation) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: colors.background, paddingTop: insets.top },
        ]}
      >
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Loading...
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top },
      ]}
    >
      <LinearGradient
        colors={[colors.background, colors.surface]}
        style={styles.gradient}
      >
        <View style={styles.navBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.navButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.navTitle, { color: colors.text }]}>
            Affirmation
          </Text>
          <View style={styles.navButton} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(600)} style={styles.quoteContainer}>
            <Ionicons
              name="chatbubble-ellipses"
              size={40}
              color={colors.gold}
              style={styles.quoteIconLeft}
            />
            <Text style={[styles.quoteText, { color: colors.text }]}>
              {affirmation.text}
            </Text>
            <Ionicons
              name="chatbubble-ellipses"
              size={40}
              color={colors.gold}
              style={styles.quoteIconRight}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(600).delay(200)} style={styles.actionBar}>
            <TouchableOpacity
              onPress={handleToggleFavorite}
              style={[
                styles.actionButton,
                { backgroundColor: colors.surfaceSecondary },
              ]}
            >
              <Ionicons
                name={isFavorited ? "heart" : "heart-outline"}
                size={24}
                color={isFavorited ? colors.error : colors.text}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleCopy}
              style={[
                styles.actionButton,
                { backgroundColor: colors.surfaceSecondary },
              ]}
            >
              <Ionicons name="copy-outline" size={24} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleShare}
              style={[
                styles.actionButton,
                { backgroundColor: colors.surfaceSecondary },
              ]}
            >
              <Ionicons name="share-outline" size={24} color={colors.text} />
            </TouchableOpacity>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(600).delay(400)} style={[styles.detailsCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <Text style={[styles.detailsTitle, { color: colors.gold }]}>
              Details
            </Text>
            <View style={styles.detailRow}>
              <Ionicons name="pricetag-outline" size={20} color={colors.tint} />
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                Category:
              </Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {affirmation.category || "General"}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="person-outline" size={20} color={colors.tint} />
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                Source:
              </Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {affirmation.source || "Unknown"}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={20} color={colors.tint} />
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                Date:
              </Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {affirmation.date || new Date().toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="checkmark-circle-outline" size={20} color={colors.tint} />
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                Status:
              </Text>
              <Text
                style={[
                  styles.detailValue,
                  { color: isRead ? colors.success : colors.text },
                ]}
              >
                {isRead ? "Read" : "Unread"}
              </Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(600).delay(600)} style={[styles.journalCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
            <Ionicons name="book-outline" size={28} color={colors.gold} />
            <Text style={[styles.journalTitle, { color: colors.gold }]}>
              Journal Prompt
            </Text>
            <Text style={[styles.journalText, { color: colors.text }]}>
              {affirmation.journalPrompt ||
                "How does this affirmation resonate with your current life situation? Write about a time when you felt this truth deeply."}
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(600).delay(800)}>
            <TouchableOpacity
              onPress={handleMarkAsRead}
              disabled={isRead}
              style={[
                styles.markReadButton,
                {
                  backgroundColor: isRead ? colors.surfaceSecondary : colors.gold,
                  opacity: isRead ? 0.6 : 1,
                },
              ]}
            >
              <Ionicons
                name={isRead ? "checkmark-done" : "checkmark-circle-outline"}
                size={22}
                color={colors.background}
              />
              <Text style={[styles.markReadText, { color: colors.background }]}>
                {isRead ? "Already Marked as Read" : "Mark as Read"}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  loadingText: {
    fontSize: 18,
    textAlign: "center",
    marginTop: 100,
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
  quoteContainer: {
    alignItems: "center",
    marginVertical: 30,
    paddingHorizontal: 10,
  },
  quoteIconLeft: {
    alignSelf: "flex-start",
    marginBottom: 10,
    opacity: 0.7,
  },
  quoteIconRight: {
    alignSelf: "flex-end",
    marginTop: 10,
    opacity: 0.7,
    transform: [{ rotate: "180deg" }],
  },
  quoteText: {
    fontSize: 24,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 36,
    fontStyle: "italic",
    paddingHorizontal: 10,
  },
  actionBar: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginBottom: 30,
  },
  actionButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  detailsCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  journalCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 25,
    borderWidth: 1,
    alignItems: "center",
  },
  journalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 10,
  },
  journalText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  markReadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
  },
  markReadText: {
    fontSize: 16,
    fontWeight: "bold",
  },
});
