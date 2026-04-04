import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  useColorScheme,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors } from "@/constants/colors";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";

const contentMap: Record<string, { title: string; subtitle: string; bullets: string[] }> = {
  review: {
    title: "Review",
    subtitle: "Share your experience with My Life & My Cashflow Affirmations.",
    bullets: [
      "Tell us what improved in your daily life and cashflow mindset.",
      "Mention your favorite booklet/month and why.",
      "Share recommendations for improving the app experience.",
    ],
  },
  testimonies: {
    title: "Testimonies",
    subtitle: "Stories of transformation from affirmers around the world.",
    bullets: [
      "Faith-built confidence and consistency in daily affirmations.",
      "Improved giving, discipline, and positive declaration habits.",
      "Growth in spiritual boldness, joy, and life direction.",
    ],
  },
  about: {
    title: "About Church",
    subtitle: "Zion House INT'L - networking the world with the Spirit Life.",
    bullets: [
      "Main auditorium: 265 Aba Road by Lagos Street, Rumuomasi, Port Harcourt.",
      "Sunday services: 7:30am, 8:35am, 9:40am, 10:45am.",
      "Wednesday services: from 5:30pm. Friday prayer service: 6:00pm.",
    ],
  },
  support: {
    title: "Contact & Support",
    subtitle: "Need help with access, account, or affirmations?",
    bullets: [
      "Email: mylifeandmycashflowaffirmationspartrershipministry@gmail.com",
      "Phone: 07068323030, 07061058107",
      "Support tip: include your username and a screenshot when reporting issues.",
    ],
  },
  faq: {
    title: "FAQ",
    subtitle: "Common questions and quick answers.",
    bullets: [
      "Q: Why can\'t I sign in? A: Ensure your phone and server are on same Wi-Fi in LAN mode.",
      "Q: Why no image on a day? A: The app now auto-assigns randomized page images for all days.",
      "Q: Can I get old month affirmations? A: Yes, open Library and choose any available month.",
    ],
  },
  notifications: {
    title: "Notifications & News",
    subtitle: "Live updates and reminders from the central news feed.",
    bullets: [
      "Loading updates...",
    ],
  },
};

type NewsItem = {
  id: number;
  title: string;
  message: string;
  category: "update" | "event" | "release";
  createdAt: string;
};

export default function MenuPageScreen() {
  const { page } = useLocalSearchParams<{ page: string }>();
  const scheme = useColorScheme();
  const colors = useThemeColors(scheme);
  const insets = useSafeAreaInsets();
  const [feedbackSubject, setFeedbackSubject] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");

  const key = (page || "").toLowerCase();
  const content = contentMap[key] || {
    title: "Menu",
    subtitle: "Select an available page from the main menu.",
    bullets: ["This page does not exist."],
  };

  const { data: newsItems = [], isLoading: newsLoading } = useQuery<NewsItem[]>({
    queryKey: ["/api/news"],
    enabled: key === "notifications",
  });

  const submitFeedbackMutation = useMutation({
    mutationFn: async () => {
      const subject = feedbackSubject.trim();
      const message = feedbackMessage.trim();

      if (!subject || !message) {
        throw new Error("Please provide both subject and feedback message.");
      }

      await apiRequest("POST", "/api/feedback", {
        subject,
        message,
      });
    },
    onSuccess: () => {
      setFeedbackSubject("");
      setFeedbackMessage("");
      Alert.alert("Feedback Sent", "Thank you. Your feedback has been sent to the product team.");
    },
    onError: (error: any) => {
      Alert.alert("Submission Failed", error?.message || "Could not submit feedback right now.");
    },
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 28,
          paddingHorizontal: 18,
        }}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
          <Text style={[styles.backText, { color: colors.text }]}>Back</Text>
        </Pressable>

        <View style={[styles.hero, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
          <Text style={[styles.title, { color: colors.text }]}>{content.title}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{content.subtitle}</Text>
        </View>

        {key === "notifications" ? (
          <View style={styles.listWrap}>
            {newsLoading ? (
              <ActivityIndicator color={colors.gold} style={{ paddingVertical: 24 }} />
            ) : newsItems.length === 0 ? (
              <View style={[styles.itemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
                <Ionicons name="information-circle-outline" size={18} color={colors.gold} />
                <Text style={[styles.itemText, { color: colors.text }]}>No updates yet.</Text>
              </View>
            ) : (
              newsItems.map((item) => (
                <View
                  key={item.id}
                  style={[styles.newsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <View style={styles.newsMetaRow}>
                    <View style={[styles.newsTag, { backgroundColor: colors.goldLight }]}> 
                      <Text style={[styles.newsTagText, { color: colors.gold }]}> {item.category.toUpperCase()} </Text>
                    </View>
                    <Text style={[styles.newsTime, { color: colors.textSecondary }]}> 
                      {new Date(item.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={[styles.newsTitle, { color: colors.text }]}>{item.title}</Text>
                  <Text style={[styles.newsBody, { color: colors.textSecondary }]}>{item.message}</Text>
                </View>
              ))
            )}
          </View>
        ) : (
          <View style={styles.listWrap}>
            {key === "review" && (
              <View style={[styles.feedbackCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
                <Text style={[styles.feedbackTitle, { color: colors.text }]}>Send Feedback To Product Team</Text>
                <TextInput
                  value={feedbackSubject}
                  onChangeText={setFeedbackSubject}
                  placeholder="Subject"
                  placeholderTextColor={colors.textSecondary}
                  style={[
                    styles.input,
                    {
                      color: colors.text,
                      backgroundColor: colors.inputBg,
                      borderColor: colors.border,
                    },
                  ]}
                  maxLength={120}
                />
                <TextInput
                  value={feedbackMessage}
                  onChangeText={setFeedbackMessage}
                  placeholder="Tell us what you liked, what to improve, and any issues you noticed"
                  placeholderTextColor={colors.textSecondary}
                  style={[
                    styles.input,
                    styles.textArea,
                    {
                      color: colors.text,
                      backgroundColor: colors.inputBg,
                      borderColor: colors.border,
                    },
                  ]}
                  multiline
                  textAlignVertical="top"
                  maxLength={3000}
                />
                <Pressable
                  onPress={() => submitFeedbackMutation.mutate()}
                  disabled={submitFeedbackMutation.isPending}
                  style={({ pressed }) => [
                    styles.feedbackButton,
                    {
                      backgroundColor: colors.tint,
                      opacity: pressed || submitFeedbackMutation.isPending ? 0.85 : 1,
                    },
                  ]}
                >
                  {submitFeedbackMutation.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.feedbackButtonText}>Submit Feedback</Text>
                  )}
                </Pressable>
              </View>
            )}

            {content.bullets.map((item, index) => (
              <View
                key={`${key}-${index}`}
                style={[styles.itemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Ionicons name="checkmark-circle" size={18} color={colors.gold} />
                <Text style={[styles.itemText, { color: colors.text }]}>{item}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
    alignSelf: "flex-start",
  },
  backText: {
    fontSize: 15,
    fontFamily: "DMSans_500Medium",
  },
  hero: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: "PlayfairDisplay_700Bold",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "DMSans_400Regular",
  },
  listWrap: {
    marginTop: 16,
    gap: 10,
  },
  feedbackCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  feedbackTitle: {
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
  },
  textArea: {
    minHeight: 120,
  },
  feedbackButton: {
    height: 46,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  feedbackButtonText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "DMSans_700Bold",
  },
  itemCard: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  itemText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "DMSans_400Regular",
  },
  newsCard: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  newsMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  newsTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  newsTagText: {
    fontSize: 10,
    fontFamily: "DMSans_700Bold",
    letterSpacing: 0.4,
  },
  newsTime: {
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
  },
  newsTitle: {
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
  },
  newsBody: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "DMSans_400Regular",
  },
});
