import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useColorScheme,
  ScrollView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useThemeColors } from "@/constants/colors";

const monthNames = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const monthIcons: Record<number, string> = {
  1: "snow", 2: "heart", 3: "leaf", 4: "rainy",
  5: "flower", 6: "sunny", 7: "star", 8: "flame",
  9: "earth", 10: "moon", 11: "gift", 12: "sparkles",
};

function BookletCard({ booklet, index, colors, isDark }: any) {
  return (
    <Animated.View entering={FadeInDown.duration(400).delay(index * 80)}>
      <Pressable
        onPress={() => router.push({ pathname: "/booklet/[id]", params: { id: booklet.id.toString() } })}
        style={({ pressed }) => [
          styles.bookletCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: pressed ? 0.92 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
        ]}
      >
        <View style={[styles.bookletIcon, { backgroundColor: booklet.coverColor + "20" }]}>
          <Ionicons
            name={(monthIcons[booklet.month] || "book") as any}
            size={28}
            color={booklet.coverColor}
          />
        </View>
        <View style={styles.bookletInfo}>
          <Text style={[styles.bookletMonth, { color: colors.textSecondary, fontFamily: "DMSans_500Medium" }]}>
            {monthNames[booklet.month]} {booklet.year}
          </Text>
          <Text style={[styles.bookletTitle, { color: colors.text, fontFamily: "DMSans_600SemiBold" }]}>
            {booklet.title}
          </Text>
          {booklet.description && (
            <Text
              style={[styles.bookletDesc, { color: colors.textSecondary, fontFamily: "DMSans_400Regular" }]}
              numberOfLines={2}
            >
              {booklet.description}
            </Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      </Pressable>
    </Animated.View>
  );
}

export default function LibraryScreen() {
  const scheme = useColorScheme();
  const colors = useThemeColors(scheme);
  const insets = useSafeAreaInsets();
  const isDark = scheme === "dark";

  const { data: bookletList, isLoading } = useQuery<any[]>({
    queryKey: ["/api/booklets"],
  });

  const currentMonth = new Date().getMonth() + 1;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 16,
            paddingBottom: 120,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.text, fontFamily: "PlayfairDisplay_700Bold" }]}>
          Library
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary, fontFamily: "DMSans_400Regular" }]}>
          Explore all monthly affirmation booklets
        </Text>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.gold} />
          </View>
        ) : !bookletList || bookletList.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="book-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.text, fontFamily: "DMSans_600SemiBold" }]}>
              No booklets available yet
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary, fontFamily: "DMSans_400Regular" }]}>
              Check back soon for new content
            </Text>
          </View>
        ) : (
          <View style={styles.bookletList}>
            {bookletList
              .sort((a: any, b: any) => {
                if (a.month === currentMonth) return -1;
                if (b.month === currentMonth) return 1;
                return a.month - b.month;
              })
              .map((booklet: any, index: number) => (
                <BookletCard
                  key={booklet.id}
                  booklet={booklet}
                  index={index}
                  colors={colors}
                  isDark={isDark}
                />
              ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  title: { fontSize: 32, lineHeight: 38, marginBottom: 4 },
  subtitle: { fontSize: 15, marginBottom: 28 },
  loadingContainer: { paddingVertical: 60, alignItems: "center" },
  emptyState: {
    borderRadius: 20,
    padding: 40,
    alignItems: "center",
    borderWidth: 1,
    gap: 12,
  },
  emptyText: { fontSize: 18 },
  emptySubtext: { fontSize: 14, textAlign: "center" },
  bookletList: { gap: 12 },
  bookletCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
  },
  bookletIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  bookletInfo: { flex: 1 },
  bookletMonth: { fontSize: 12, textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 2 },
  bookletTitle: { fontSize: 16, marginBottom: 4 },
  bookletDesc: { fontSize: 13, lineHeight: 18 },
});
