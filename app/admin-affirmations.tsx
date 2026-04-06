import React, { useState } from "react";
import { View, ScrollView, TextInput, TouchableOpacity, Text, Alert, useColorScheme } from "react-native";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";

interface Affirmation {
  dayNumber: number;
  title: string;
  content: string;
}

interface Booklet {
  id: number;
  title: string;
  month: number;
  year: number;
}

export default function AdminAffirmationsPanel() {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();

  const [selectedBooklet, setSelectedBooklet] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [affirmationTitle, setAffirmationTitle] = useState("");
  const [affirmationContent, setAffirmationContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Redirect non-admin users
  React.useEffect(() => {
    if (!authLoading && (!user || !user.isAdmin)) {
      router.replace("/");
    }
  }, [user, authLoading]);

  // Fetch all booklets
  const { data: bookletsList } = useQuery({
    queryKey: ["booklets"],
    queryFn: async () => {
      const res = await fetch("/api/booklets");
      return res.json();
    },
  });

  // Fetch affirmations for selected booklet
  const { data: affirmationsList = [] } = useQuery({
    queryKey: ["affirmations", selectedBooklet],
    queryFn: async () => {
      if (!selectedBooklet) return [];
      const res = await fetch(`/api/booklets/${selectedBooklet}`);
      return res.json();
    },
    enabled: !!selectedBooklet,
  });

  // Load affirmation for selected day
  React.useEffect(() => {
    if (affirmationsList.length > 0) {
      const aff = affirmationsList.find((a: Affirmation) => a.dayNumber === selectedDay);
      if (aff) {
        setAffirmationTitle(aff.title);
        setAffirmationContent(aff.content);
      } else {
        setAffirmationTitle("");
        setAffirmationContent("");
      }
    }
  }, [selectedDay, affirmationsList]);

  // Save affirmation mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      setIsSaving(true);
      try {
        if (!selectedBooklet) throw new Error("No booklet selected");

        // Check if affirmation exists
        const existing = affirmationsList.find((a: Affirmation) => a.dayNumber === selectedDay);

        const endpoint = existing
          ? `/api/admin/affirmations/${existing.id}`
          : "/api/admin/affirmations";

        const method = existing ? "PUT" : "POST";

        const res = await fetch(endpoint, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookletId: selectedBooklet,
            dayNumber: selectedDay,
            title: affirmationTitle,
            content: affirmationContent,
          }),
        });

        if (!res.ok) throw new Error("Failed to save");

        queryClient.invalidateQueries({ queryKey: ["affirmations", selectedBooklet] });
        Alert.alert("Success", `Day ${selectedDay} affirmation saved!`);
      } catch {
        Alert.alert("Error", "Failed to save affirmation");
      } finally {
        setIsSaving(false);
      }
    },
  });

  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingHorizontal: 16,
      }}
    >
      <View style={{ paddingVertical: 20 }}>
        {/* Header */}
        <Text
          style={{
            fontSize: 28,
            fontWeight: "bold",
            color: colors.text,
            marginBottom: 24,
            fontFamily: "PlayfairDisplay_700Bold",
          }}
        >
          📚 Add Affirmations
        </Text>

        {/* Booklet Selection */}
        <View style={{ marginBottom: 24 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: colors.text,
              marginBottom: 12,
            }}
          >
            Select Booklet
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ gap: 10 }}
          >
            {bookletsList?.map((booklet: Booklet) => (
              <TouchableOpacity
                key={booklet.id}
                onPress={() => {
                  setSelectedBooklet(booklet.id);
                  setSelectedDay(1);
                }}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor:
                    selectedBooklet === booklet.id ? colors.tint : colors.surface,
                  borderColor: colors.border,
                  borderWidth: 1,
                }}
              >
                <Text
                  style={{
                    color:
                      selectedBooklet === booklet.id ? "#FFFFFF" : colors.text,
                    fontWeight: "600",
                  }}
                >
                  {booklet.title}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {selectedBooklet && (
          <>
            {/* Day Selection */}
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: colors.text,
                  marginBottom: 12,
                }}
              >
                Select Day (1-31)
              </Text>
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                  <TouchableOpacity
                    key={day}
                    onPress={() => setSelectedDay(day)}
                    style={{
                      width: "23%",
                      aspectRatio: 1,
                      borderRadius: 8,
                      backgroundColor:
                        selectedDay === day ? colors.tint : colors.surface,
                      borderColor: colors.border,
                      borderWidth: 1,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        color:
                          selectedDay === day
                            ? "#FFFFFF"
                            : colors.text,
                        fontWeight: "600",
                        fontSize: 14,
                      }}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Affirmation Title */}
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: colors.text,
                  marginBottom: 8,
                }}
              >
                Title
              </Text>
              <TextInput
                style={{
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: colors.text,
                  backgroundColor: colors.inputBg,
                  fontSize: 14,
                  fontFamily: "DMSans_400Regular",
                }}
                placeholder="e.g., New Beginnings"
                placeholderTextColor={colors.textSecondary}
                value={affirmationTitle}
                onChangeText={setAffirmationTitle}
              />
            </View>

            {/* Affirmation Content */}
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: colors.text,
                  marginBottom: 8,
                }}
              >
                Content
              </Text>
              <TextInput
                style={{
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: colors.text,
                  backgroundColor: colors.inputBg,
                  fontSize: 14,
                  minHeight: 200,
                  textAlignVertical: "top",
                  fontFamily: "DMSans_400Regular",
                }}
                placeholder="Paste or type your affirmation here..."
                placeholderTextColor={colors.textSecondary}
                value={affirmationContent}
                onChangeText={setAffirmationContent}
                multiline
              />
              <Text
                style={{
                  fontSize: 12,
                  color: colors.textSecondary,
                  marginTop: 8,
                }}
              >
                {affirmationContent.length} characters
              </Text>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              onPress={() => saveMutation.mutate()}
              disabled={isSaving || !affirmationTitle || !affirmationContent}
              style={{
                backgroundColor: colors.tint,
                paddingVertical: 14,
                borderRadius: 8,
                alignItems: "center",
                marginBottom: 40,
                opacity: isSaving || !affirmationTitle || !affirmationContent ? 0.5 : 1,
              }}
            >
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 16,
                  fontWeight: "600",
                  fontFamily: "DMSans_600SemiBold",
                }}
              >
                {isSaving ? "Saving..." : `Save Day ${selectedDay}`}
              </Text>
            </TouchableOpacity>

            {/* Quick Stats */}
            <View
              style={{
                backgroundColor: colors.surface,
                padding: 16,
                borderRadius: 8,
                borderColor: colors.border,
                borderWidth: 1,
                marginBottom: 40,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: colors.text,
                  marginBottom: 8,
                }}
              >
                📊 Progress
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                Affirmations filled: {affirmationsList.filter((a: Affirmation) => a.content && !a.content.includes("[ADD")).length} / 31
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 13,
                  marginTop: 4,
                }}
              >
                Current: Day {selectedDay}
              </Text>
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}
