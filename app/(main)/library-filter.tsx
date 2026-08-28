import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Pressable, ScrollView, StyleSheet, Animated as RNAnimated } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useThemeColors } from "@/constants/colors";

type SortOption = "newest" | "oldest" | "alphabetical" | "most-read";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "alphabetical", label: "Alphabetical" },
  { value: "most-read", label: "Most Read" },
];

const STATUS_OPTIONS = [
  { value: "unread", label: "Unread" },
  { value: "read", label: "Read" },
  { value: "favorite", label: "Favorite" },
];

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export default function LibraryFilterScreen() {
  const colors = useThemeColors();

  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [backdropOpacity] = useState(new RNAnimated.Value(0));

  useEffect(() => {
    RNAnimated.timing(backdropOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleBackdropPress = () => {
    RNAnimated.timing(backdropOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => router.back());
  };

  const toggleStatus = (status: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  const toggleMonth = (month: string) => {
    setSelectedMonths((prev) =>
      prev.includes(month)
        ? prev.filter((m) => m !== month)
        : [...prev, month]
    );
  };

  const handleApply = () => {
    const filters = {
      sortBy,
      statuses: selectedStatuses,
      months: selectedMonths,
    };
    console.log("Applying filters:", filters);
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: "transparent" }]}>
      <RNAnimated.View
        style={[styles.backdrop, { opacity: backdropOpacity }]}
      >
        <Pressable style={styles.backdropPressable} onPress={handleBackdropPress} />
      </RNAnimated.View>

      <Animated.View
        entering={FadeInDown.duration(400)}
        style={[styles.sheet, { backgroundColor: colors.surface }]}
      >
        <View style={styles.handleContainer}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
        </View>

        <ScrollView
          style={styles.sheetContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>
              Filter & Sort
            </Text>
            <TouchableOpacity onPress={handleBackdropPress}>
              <Ionicons name="close" size={28} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.gold }]}>
              Sort By
            </Text>
            {SORT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => setSortBy(option.value)}
                style={[styles.radioOption, { borderBottomColor: colors.border }]}
              >
                <View
                  style={[
                    styles.radioOuter,
                    {
                      borderColor:
                        sortBy === option.value ? colors.gold : colors.border,
                    },
                  ]}
                >
                  {sortBy === option.value && (
                    <View style={[styles.radioInner, { backgroundColor: colors.gold }]} />
                  )}
                </View>
                <Text style={[styles.radioLabel, { color: colors.text }]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.gold }]}>
              Status
            </Text>
            <View style={styles.checkboxContainer}>
              {STATUS_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => toggleStatus(option.value)}
                  style={[styles.checkboxOption, { borderBottomColor: colors.border }]}
                >
                  <View
                    style={[
                      styles.checkbox,
                      {
                        borderColor: selectedStatuses.includes(option.value)
                          ? colors.gold
                          : colors.border,
                        backgroundColor: selectedStatuses.includes(option.value)
                          ? colors.gold
                          : "transparent",
                      },
                    ]}
                  >
                    {selectedStatuses.includes(option.value) && (
                      <Ionicons name="checkmark" size={16} color={colors.background} />
                    )}
                  </View>
                  <Text style={[styles.checkboxLabel, { color: colors.text }]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.gold }]}>
              Month
            </Text>
            <View style={styles.chipsContainer}>
              {MONTHS.map((month) => (
                <TouchableOpacity
                  key={month}
                  onPress={() => toggleMonth(month)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selectedMonths.includes(month)
                        ? colors.gold
                        : colors.surfaceSecondary,
                      borderColor: selectedMonths.includes(month)
                        ? colors.gold
                        : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: selectedMonths.includes(month)
                          ? colors.background
                          : colors.text,
                      },
                    ]}
                  >
                    {month}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        <TouchableOpacity
          onPress={handleApply}
          style={[styles.applyButton, { backgroundColor: colors.gold }]}
        >
          <Ionicons name="funnel" size={20} color={colors.background} />
          <Text style={[styles.applyText, { color: colors.background }]}>
            Apply Filters
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  backdropPressable: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    paddingBottom: 30,
  },
  handleContainer: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
  },
  sheetContent: {
    paddingHorizontal: 20,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: "bold",
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
  },
  radioOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 14,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  radioLabel: {
    fontSize: 16,
  },
  checkboxContainer: {
    gap: 4,
  },
  checkboxOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 14,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxLabel: {
    fontSize: 16,
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "600",
  },
  applyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 20,
    marginTop: 25,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
  },
  applyText: {
    fontSize: 16,
    fontWeight: "bold",
  },
});
