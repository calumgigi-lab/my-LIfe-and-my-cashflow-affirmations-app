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
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useThemeColors } from "@/constants/colors";

function AffirmationItem({ aff, index, colors }: any) {
  return (
    <Animated.View entering={FadeInDown.duration(400).delay(index * 60)}>
      <Pressable
        onPress={() => router.push({ pathname: "/affirmation/[id]", params: { id: aff.id.toString() } })}
        style={({ pressed }) => [
          styles.affItem,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: pressed ? 0.92 : 1,
          },
        ]}
      >
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
      </Pressable>
    </Animated.View>
  );
}

export default function BookletDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme();
  const colors = useThemeColors(scheme);
  const insets = useSafeAreaInsets();

  const { data: booklet, isLoading: bookletLoading } = useQuery<any>({
    queryKey: ["/api/booklets", id],
  });

  const { data: affirmationsList, isLoading: affsLoading } = useQuery<any[]>({
    queryKey: [`/api/booklets/${id}/affirmations`],
  });

  const isLoading = bookletLoading || affsLoading;

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
            <View style={[styles.bookletIconLarge, { backgroundColor: (booklet.coverColor || colors.gold) + "20" }]}>
              <Ionicons name="book" size={40} color={booklet.coverColor || colors.gold} />
            </View>
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
          </View>
        )}

        {isLoading ? (
          <ActivityIndicator size="large" color={colors.gold} style={{ paddingVertical: 40 }} />
        ) : (
          <View style={styles.affList}>
            {affirmationsList?.map((aff: any, index: number) => (
              <AffirmationItem key={aff.id} aff={aff} index={index} colors={colors} />
            ))}
          </View>
        )}
      </ScrollView>
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
  bookletIconLarge: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  bookletTitle: { fontSize: 26, textAlign: "center" },
  bookletDesc: { fontSize: 14, textAlign: "center", lineHeight: 20, paddingHorizontal: 20 },
  affCount: { fontSize: 14, marginTop: 4 },
  affList: { gap: 10 },
  affItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 14,
  },
  dayCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircleText: { fontSize: 16 },
  affItemContent: { flex: 1 },
  affItemTitle: { fontSize: 16, marginBottom: 4 },
  affItemPreview: { fontSize: 13, lineHeight: 18 },
});
