import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  useColorScheme,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useThemeColors } from "@/constants/colors";
import Animated, { FadeInDown } from "react-native-reanimated";

const JOURNAL_STORAGE_KEY = "journal_entries";

type JournalEntry = {
  id: string;
  date: string;
  content: string;
  createdAt: string;
};

export default function JournalScreen() {
  const scheme = useColorScheme();
  const colors = useThemeColors(scheme);
  const insets = useSafeAreaInsets();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [newEntry, setNewEntry] = useState("");
  const [loaded, setLoaded] = useState(false);

  // Load entries on mount
  React.useEffect(() => {
    loadEntries();
  }, []);

  async function loadEntries() {
    try {
      const stored = await AsyncStorage.getItem(JOURNAL_STORAGE_KEY);
      if (stored) {
        setEntries(JSON.parse(stored));
      }
      setLoaded(true);
    } catch {
      setLoaded(true);
    }
  }

  async function saveEntry() {
    if (!newEntry.trim()) return;

    const entry: JournalEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      content: newEntry.trim(),
      createdAt: new Date().toISOString(),
    };

    const updated = [entry, ...entries];
    setEntries(updated);
    setNewEntry("");

    try {
      await AsyncStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      Alert.alert("Error", "Could not save entry. Please try again.");
    }
  }

  async function deleteEntry(id: string) {
    Alert.alert("Delete Entry", "Are you sure you want to delete this entry?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const updated = entries.filter((e) => e.id !== id);
          setEntries(updated);
          try {
            await AsyncStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(updated));
          } catch {}
        },
      },
    ]);
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    if (isToday) return `Today · ${time}`;
    if (isYesterday) return `Yesterday · ${time}`;

    return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) + ` · ${time}`;
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 16, paddingBottom: 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text
            style={[styles.headerTitle, { color: colors.text, fontFamily: "PlayfairDisplay_600SemiBold" }]}
          >
            Journal
          </Text>
          <View style={{ width: 24 }} />
        </Animated.View>

        {/* New Entry */}
        <Animated.View entering={FadeInDown.duration(500).delay(100)}>
          <View
            style={[
              styles.newEntryCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text
              style={[
                styles.newEntryLabel,
                { color: colors.textSecondary, fontFamily: "DMSans_500Medium" },
              ]}
            >
              What's on your mind today?
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  color: colors.text,
                  backgroundColor: "rgba(72,118,168,0.08)",
                  borderColor: colors.border,
                  fontFamily: "DMSans_400Regular",
                },
              ]}
              multiline
              numberOfLines={6}
              placeholder="Write your thoughts, reflections, or prayers..."
              placeholderTextColor={colors.textSecondary}
              value={newEntry}
              onChangeText={setNewEntry}
              textAlignVertical="top"
            />
            <Pressable
              onPress={saveEntry}
              disabled={!newEntry.trim()}
              style={({ pressed }) => [
                styles.saveBtn,
                {
                  backgroundColor: newEntry.trim() ? colors.gold : "rgba(72,118,168,0.15)",
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <Ionicons
                name="add-circle-outline"
                size={20}
                color={newEntry.trim() ? "#0A1E38" : colors.textSecondary}
              />
              <Text
                style={[
                  styles.saveBtnText,
                  {
                    color: newEntry.trim() ? "#0A1E38" : colors.textSecondary,
                    fontFamily: "DMSans_600SemiBold",
                  },
                ]}
              >
                Save Entry
              </Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* Entries */}
        <Animated.View entering={FadeInDown.duration(500).delay(200)} style={styles.entriesSection}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.text, fontFamily: "PlayfairDisplay_600SemiBold" },
            ]}
          >
            Your Entries
          </Text>

          {entries.length === 0 && loaded ? (
            <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="journal-outline" size={48} color={colors.textSecondary} />
              <Text
                style={[styles.emptyTitle, { color: colors.text, fontFamily: "DMSans_600SemiBold" }]}
              >
                No entries yet
              </Text>
              <Text
                style={[styles.emptySubtext, { color: colors.textSecondary, fontFamily: "DMSans_400Regular" }]}
              >
                Start writing your thoughts and reflections above
              </Text>
            </View>
          ) : (
            entries.map((entry) => (
              <View
                key={entry.id}
                style={[
                  styles.entryCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Text
                  style={[
                    styles.entryDate,
                    { color: colors.textSecondary, fontFamily: "DMSans_400Regular" },
                  ]}
                >
                  {formatDate(entry.date)}
                </Text>
                <Text
                  style={[
                    styles.entryContent,
                    { color: colors.text, fontFamily: "DMSans_400Regular" },
                  ]}
                >
                  {entry.content}
                </Text>
                <Pressable
                  onPress={() => deleteEntry(entry.id)}
                  hitSlop={8}
                  style={styles.deleteBtn}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.textSecondary} />
                </Pressable>
              </View>
            ))
          )}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 20,
  },
  newEntryCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 28,
  },
  newEntryLabel: {
    fontSize: 14,
    marginBottom: 12,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 140,
    marginBottom: 16,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 100,
    paddingVertical: 14,
  },
  saveBtnText: {
    fontSize: 15,
  },
  entriesSection: {},
  sectionTitle: {
    fontSize: 20,
    marginBottom: 16,
  },
  entryCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    marginBottom: 12,
  },
  entryDate: {
    fontSize: 12,
    marginBottom: 8,
  },
  entryContent: {
    fontSize: 15,
    lineHeight: 22,
  },
  deleteBtn: {
    position: "absolute",
    top: 14,
    right: 14,
  },
  emptyState: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 40,
    alignItems: "center",
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
  },
});
