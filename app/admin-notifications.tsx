import React, { useState } from "react";
import {
  View,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  useColorScheme,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import { useAuth } from "@/lib/auth-context";

type Category = "update" | "event" | "release" | "announcement";

interface NewsItem {
  id: number;
  title: string;
  message: string;
  category: Category;
  createdAt: string;
}

const CATEGORIES: { value: Category; label: string; color: string }[] = [
  { value: "update", label: "Update", color: "#2196F3" },
  { value: "announcement", label: "Announcement", color: "#9C27B0" },
  { value: "event", label: "Event", color: "#FF9800" },
  { value: "release", label: "Release", color: "#4CAF50" },
];

export default function AdminNotificationsPanel() {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  const insets = useSafeAreaInsets();

  const [refreshing, setRefreshing] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [editingItem, setEditingItem] = useState<NewsItem | null>(null);

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<Category>("announcement");

  React.useEffect(() => {
    if (!authLoading && (!user || !user.isAdmin)) {
      router.replace("/");
    }
  }, [user, authLoading]);

  const { data: newsItems = [], isLoading } = useQuery<NewsItem[]>({
    queryKey: ["/api/news"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/news");
      return res.json();
    },
  });

  const broadcastMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim() || !message.trim()) throw new Error("Title and message are required");
      const res = await apiRequest("POST", "/api/admin/news", {
        title: title.trim(),
        message: message.trim(),
        category,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
      setTitle("");
      setMessage("");
      setCategory("announcement");
      setShowCompose(false);
      Alert.alert("Broadcasted!", "Your notification has been sent to all users.");
    },
    onError: (err: any) => {
      Alert.alert("Error", err?.message || "Failed to send broadcast.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingItem) return;
      if (!title.trim() || !message.trim()) throw new Error("Title and message are required");
      const res = await apiRequest("PUT", `/api/admin/news/${editingItem.id}`, {
        title: title.trim(),
        message: message.trim(),
        category,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
      setEditingItem(null);
      setTitle("");
      setMessage("");
      setCategory("announcement");
      setShowCompose(false);
      Alert.alert("Updated!", "Broadcast updated successfully.");
    },
    onError: (err: any) => {
      Alert.alert("Error", err?.message || "Failed to update broadcast.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/news/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
      Alert.alert("Deleted", "Broadcast removed.");
    },
    onError: () => {
      Alert.alert("Error", "Failed to delete broadcast.");
    },
  });

  function openEdit(item: NewsItem) {
    setEditingItem(item);
    setTitle(item.title);
    setMessage(item.message);
    setCategory(item.category);
    setShowCompose(true);
  }

  function openNew() {
    setEditingItem(null);
    setTitle("");
    setMessage("");
    setCategory("announcement");
    setShowCompose(true);
  }

  function confirmDelete(item: NewsItem) {
    Alert.alert(
      "Delete Broadcast?",
      `"${item.title}" will be removed from all users' feeds.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(item.id) },
      ],
    );
  }

  async function onRefresh() {
    setRefreshing(true);
    await queryClient.refetchQueries({ queryKey: ["/api/news"] });
    setRefreshing(false);
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const getCategoryColor = (cat: Category) =>
    CATEGORIES.find((c) => c.value === cat)?.color || "#2196F3";

  const isPending = broadcastMutation.isPending || updateMutation.isPending;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Header */}
        <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 16, marginBottom: 20 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
            <Text style={{ color: colors.text, fontSize: 15 }}>Back</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Ionicons name="megaphone" size={28} color={colors.text} />
              <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.text }}>
                Broadcast News
              </Text>
            </View>
            <TouchableOpacity
              onPress={openNew}
              style={{
                backgroundColor: colors.tint || "#9EC9FF",
                flexDirection: "row", alignItems: "center", gap: 6,
                paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
              }}
            >
              <Ionicons name="add" size={18} color="white" />
              <Text style={{ color: "white", fontWeight: "700", fontSize: 13 }}>New</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ color: colors.text, opacity: 0.6, fontSize: 13, marginTop: 6 }}>
            {newsItems.length} broadcast{newsItems.length !== 1 ? "s" : ""} in users&apos; news feed
          </Text>
        </View>

        {/* Info Banner */}
        <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
          <View style={{ backgroundColor: colors.tint + "15", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: colors.tint + "30" }}>
            <Text style={{ color: colors.tint, fontSize: 13, lineHeight: 20 }}>
              Broadcasts appear instantly in every user&apos;s Notifications &amp; News feed. A badge count shows on their bell icon until they read it.
            </Text>
          </View>
        </View>

        {/* Broadcasts List */}
        <View style={{ paddingHorizontal: 16 }}>
          {isLoading ? (
            <ActivityIndicator size="large" color={colors.tint || "#9EC9FF"} style={{ paddingVertical: 40 }} />
          ) : newsItems.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 60, gap: 12 }}>
              <Ionicons name="megaphone-outline" size={48} color={colors.text} style={{ opacity: 0.2 }} />
              <Text style={{ color: colors.text, opacity: 0.5, textAlign: "center", fontSize: 15 }}>
                No broadcasts yet.{"\n"}Tap + New to send your first one.
              </Text>
            </View>
          ) : (
            newsItems.map((item) => (
              <View
                key={item.id}
                style={{
                  backgroundColor: colors.surface || "#1A436F",
                  borderRadius: 10, marginBottom: 12, overflow: "hidden",
                  borderLeftWidth: 4, borderLeftColor: getCategoryColor(item.category),
                }}
              >
                <View style={{ padding: 12 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <View style={{ backgroundColor: getCategoryColor(item.category) + "25", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 }}>
                          <Text style={{ color: getCategoryColor(item.category), fontSize: 10, fontWeight: "700" }}>
                            {item.category.toUpperCase()}
                          </Text>
                        </View>
                        <Text style={{ color: colors.text, opacity: 0.5, fontSize: 11 }}>
                          {formatDate(item.createdAt)}
                        </Text>
                      </View>
                      <Text style={{ color: colors.text, fontWeight: "700", fontSize: 15, marginBottom: 4 }}>
                        {item.title}
                      </Text>
                      <Text style={{ color: colors.text, opacity: 0.75, fontSize: 13, lineHeight: 20 }}>
                        {item.message}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                    <TouchableOpacity
                      onPress={() => openEdit(item)}
                      style={{
                        flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
                        gap: 6, backgroundColor: colors.tint + "20", borderRadius: 8, paddingVertical: 8,
                        borderWidth: 1, borderColor: colors.tint + "40",
                      }}
                    >
                      <Ionicons name="pencil-outline" size={14} color={colors.tint} />
                      <Text style={{ color: colors.tint, fontSize: 12, fontWeight: "600" }}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => confirmDelete(item)}
                      style={{
                        flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
                        gap: 6, backgroundColor: "#F4433620", borderRadius: 8, paddingVertical: 8,
                        borderWidth: 1, borderColor: "#F4433640",
                      }}
                    >
                      <Ionicons name="trash-outline" size={14} color="#F44336" />
                      <Text style={{ color: "#F44336", fontSize: 12, fontWeight: "600" }}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Compose Modal */}
      <Modal
        visible={showCompose}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCompose(false)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "90%" }}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <Text style={{ color: colors.text, fontSize: 20, fontWeight: "700" }}>
                  {editingItem ? "Edit Broadcast" : "New Broadcast"}
                </Text>
                <TouchableOpacity onPress={() => setShowCompose(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              {/* Category Selector */}
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: "600", marginBottom: 8 }}>Category</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.value}
                    onPress={() => setCategory(cat.value)}
                    style={{
                      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                      backgroundColor: category === cat.value ? cat.color : cat.color + "20",
                      borderWidth: 1, borderColor: cat.color + "60",
                    }}
                  >
                    <Text style={{ color: category === cat.value ? "white" : cat.color, fontSize: 13, fontWeight: "600" }}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Title Input */}
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: "600", marginBottom: 8 }}>Title</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. New Booklet Released!"
                placeholderTextColor={colors.text + "50"}
                style={{
                  backgroundColor: colors.surface || "#1A436F",
                  borderRadius: 10, padding: 12, color: colors.text, fontSize: 15,
                  marginBottom: 16, borderWidth: 1, borderColor: colors.text + "20",
                }}
                maxLength={200}
              />

              {/* Message Input */}
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: "600", marginBottom: 8 }}>Message</Text>
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="Write your broadcast message here..."
                placeholderTextColor={colors.text + "50"}
                style={{
                  backgroundColor: colors.surface || "#1A436F",
                  borderRadius: 10, padding: 12, color: colors.text, fontSize: 14,
                  minHeight: 120, textAlignVertical: "top",
                  marginBottom: 20, borderWidth: 1, borderColor: colors.text + "20",
                }}
                multiline
                maxLength={2000}
              />
              <Text style={{ color: colors.text, opacity: 0.4, fontSize: 11, marginTop: -16, marginBottom: 16, textAlign: "right" }}>
                {message.length}/2000
              </Text>

              {/* Send Button */}
              <TouchableOpacity
                onPress={() => editingItem ? updateMutation.mutate() : broadcastMutation.mutate()}
                disabled={isPending || !title.trim() || !message.trim()}
                style={{
                  backgroundColor: colors.tint || "#9EC9FF",
                  borderRadius: 12, height: 52,
                  alignItems: "center", justifyContent: "center",
                  flexDirection: "row", gap: 8,
                  opacity: isPending || !title.trim() || !message.trim() ? 0.5 : 1,
                  marginBottom: 16,
                }}
              >
                {isPending ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Ionicons name={editingItem ? "checkmark" : "megaphone"} size={20} color="white" />
                    <Text style={{ color: "white", fontWeight: "700", fontSize: 16 }}>
                      {editingItem ? "Save Changes" : "Broadcast Now"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
