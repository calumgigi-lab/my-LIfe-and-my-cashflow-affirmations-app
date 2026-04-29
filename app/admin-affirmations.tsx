import React, { useState } from "react";
import { View, ScrollView, TextInput, TouchableOpacity, Text, Alert, useColorScheme, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import { useAuth } from "@/lib/auth-context";

interface Affirmation {
  id?: number;
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

interface DuplicateAffirmation {
  id: number;
  bookletId: number;
  dayNumber: number;
  title: string;
  contentPreview: string;
  bookletTitle: string;
  month: number;
  year: number;
  duplicateCount: number;
}

type ActiveTab = "edit" | "duplicates";

export default function AdminAffirmationsPanel() {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<ActiveTab>("edit");
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
      const res = await apiRequest("GET", "/api/booklets");
      return res.json();
    },
  });

  // Fetch duplicate affirmations
  const { data: duplicates = [], isLoading: dupsLoading, refetch: refetchDups } = useQuery<DuplicateAffirmation[]>({
    queryKey: ["admin-affirmation-duplicates"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/affirmations/duplicates");
      return res.json();
    },
    enabled: activeTab === "duplicates",
  });

  // Delete affirmation mutation
  const deleteMutation = useMutation({
    mutationFn: async (affId: number) => {
      const res = await apiRequest("DELETE", `/api/admin/affirmations/${affId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-affirmation-duplicates"] });
      queryClient.invalidateQueries({ queryKey: ["affirmations"] });
      Alert.alert("Deleted", "Affirmation removed.");
    },
    onError: () => {
      Alert.alert("Error", "Failed to delete affirmation.");
    },
  });

  // Fetch affirmations for selected booklet
  const { data: affirmationsList = [] } = useQuery({
    queryKey: ["affirmations", selectedBooklet],
    queryFn: async () => {
      if (!selectedBooklet) return [];
      const res = await apiRequest("GET", `/api/booklets/${selectedBooklet}`);
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

        await apiRequest(method, endpoint, {
          bookletId: selectedBooklet,
          dayNumber: selectedDay,
          title: affirmationTitle,
          content: affirmationContent,
        });

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
            marginBottom: 16,
            fontFamily: "PlayfairDisplay_700Bold",
          }}
        >
          Affirmations
        </Text>

        {/* Tab Selector */}
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
          {(["edit", "duplicates"] as ActiveTab[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 10,
                alignItems: "center",
                backgroundColor: activeTab === tab ? colors.tint : colors.surface,
                borderWidth: 1,
                borderColor: activeTab === tab ? colors.tint : colors.border,
              }}
            >
              <Text style={{ color: activeTab === tab ? "#fff" : colors.text, fontWeight: "600", fontSize: 13, textTransform: "capitalize" }}>
                {tab === "edit" ? "Edit / Add" : "Find Duplicates"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

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

        {activeTab === "edit" && selectedBooklet && (
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

        {/* Duplicates Tab */}
        {activeTab === "duplicates" && (
          <View>
            <View style={{ backgroundColor: "#FF980015", borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: "#FF980040" }}>
              <Text style={{ color: "#FF9800", fontSize: 13, lineHeight: 20 }}>
                These affirmations share identical content across booklets. Keep the original and delete the duplicates.
              </Text>
            </View>

            {dupsLoading ? (
              <ActivityIndicator size="large" color={colors.tint} style={{ paddingVertical: 40 }} />
            ) : duplicates.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 60, gap: 10 }}>
                <Text style={{ fontSize: 36 }}>✅</Text>
                <Text style={{ color: colors.text, opacity: 0.5, textAlign: "center", fontSize: 15 }}>
                  No duplicate affirmations found.
                </Text>
                <TouchableOpacity onPress={() => void refetchDups()} style={{ backgroundColor: colors.tint + "20", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, marginTop: 8 }}>
                  <Text style={{ color: colors.tint, fontWeight: "600" }}>Refresh</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 12 }}>
                  Found {duplicates.length} duplicate entr{duplicates.length === 1 ? "y" : "ies"} across booklets
                </Text>
                {duplicates.map((dup) => (
                  <View
                    key={dup.id}
                    style={{
                      backgroundColor: colors.surface,
                      borderRadius: 10, padding: 12, marginBottom: 10,
                      borderLeftWidth: 3, borderLeftColor: "#FF9800",
                      borderWidth: 1, borderColor: colors.border,
                    }}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontWeight: "700", fontSize: 14, marginBottom: 2 }}>{dup.title}</Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 4 }}>
                          {dup.bookletTitle} · Day {dup.dayNumber} · {dup.month}/{dup.year}
                        </Text>
                        <Text style={{ color: colors.text, opacity: 0.6, fontSize: 12, lineHeight: 18 }} numberOfLines={3}>
                          {dup.contentPreview}...
                        </Text>
                        <View style={{ backgroundColor: "#FF980025", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: "flex-start", marginTop: 6 }}>
                          <Text style={{ color: "#FF9800", fontSize: 10, fontWeight: "700" }}>
                            {dup.duplicateCount}x DUPLICATE
                          </Text>
                        </View>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() =>
                        Alert.alert(
                          "Delete this affirmation?",
                          `Day ${dup.dayNumber} from "${dup.bookletTitle}" will be permanently removed.`,
                          [
                            { text: "Cancel", style: "cancel" },
                            { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(dup.id) },
                          ],
                        )
                      }
                      disabled={deleteMutation.isPending}
                      style={{
                        backgroundColor: "#F4433620", borderRadius: 8, paddingVertical: 8,
                        alignItems: "center", borderWidth: 1, borderColor: "#F4433640",
                        marginTop: 8, flexDirection: "row", justifyContent: "center", gap: 6,
                      }}
                    >
                      <Text style={{ color: "#F44336", fontWeight: "600", fontSize: 13 }}>Delete Duplicate</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
