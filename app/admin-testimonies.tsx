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
  Image,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import Colors from "@/constants/colors";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import { useAuth } from "@/lib/auth-context";

interface TestimonyItem {
  id: number;
  authorName: string;
  body: string;
  imageData: string | null;
  isPublished: boolean;
  sortOrder: number;
  createdAt: string;
}

export default function AdminTestimoniesPanel() {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  const insets = useSafeAreaInsets();

  const [refreshing, setRefreshing] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [editingItem, setEditingItem] = useState<TestimonyItem | null>(null);
  const [authorName, setAuthorName] = useState("");
  const [body, setBody] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [isPublished, setIsPublished] = useState(true);
  const [imageData, setImageData] = useState<string | null>(null);

  React.useEffect(() => {
    if (!authLoading && (!user || !user.isAdmin)) router.replace("/");
  }, [user, authLoading]);

  const { data: items = [], isLoading } = useQuery<TestimonyItem[]>({
    queryKey: ["/api/admin/testimonies"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/testimonies");
      return res.json();
    },
  });

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow photo access to attach images.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.45,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      setImageData(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  }

  function resetForm() {
    setAuthorName("");
    setBody("");
    setSortOrder("0");
    setIsPublished(true);
    setImageData(null);
    setEditingItem(null);
    setShowCompose(false);
  }

  function openEdit(item: TestimonyItem) {
    setEditingItem(item);
    setAuthorName(item.authorName);
    setBody(item.body);
    setSortOrder(String(item.sortOrder));
    setIsPublished(item.isPublished);
    setImageData(item.imageData);
    setShowCompose(true);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!authorName.trim() || !body.trim()) throw new Error("Author name and testimony text are required");
      const payload = {
        authorName: authorName.trim(),
        body: body.trim(),
        sortOrder: parseInt(sortOrder) || 0,
        isPublished,
        imageData: imageData || undefined,
      };
      if (editingItem) {
        const res = await apiRequest("PUT", `/api/admin/testimonies/${editingItem.id}`, payload);
        return res.json();
      }
      const res = await apiRequest("POST", "/api/admin/testimonies", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/testimonies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/testimonies"] });
      resetForm();
      Alert.alert("Saved", editingItem ? "Testimony updated." : "Testimony published.");
    },
    onError: (err: any) => Alert.alert("Error", err?.message || "Could not save testimony."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/testimonies/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/testimonies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/testimonies"] });
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.refetchQueries({ queryKey: ["/api/admin/testimonies"] });
    setRefreshing(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", padding: 16, gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: "700", color: colors.text, flex: 1 }}>Testimonies</Text>
        <TouchableOpacity
          onPress={() => { resetForm(); setShowCompose(true); }}
          style={{ backgroundColor: colors.gold, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 }}
        >
          <Text style={{ color: colors.background, fontWeight: "700" }}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12 }}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.gold} style={{ marginTop: 40 }} />
        ) : items.length === 0 ? (
          <Text style={{ color: colors.textSecondary, textAlign: "center", marginTop: 24 }}>No testimonies yet.</Text>
        ) : (
          items.map((item) => (
            <View
              key={item.id}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                padding: 14,
                gap: 8,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: colors.gold, fontWeight: "700" }}>{item.authorName}</Text>
                <Text style={{ color: item.isPublished ? "#4CAF50" : colors.textSecondary, fontSize: 12 }}>
                  {item.isPublished ? "Published" : "Draft"}
                </Text>
              </View>
              <Text style={{ color: colors.text, lineHeight: 20 }} numberOfLines={4}>{item.body}</Text>
              {item.imageData && (
                <Image source={{ uri: item.imageData }} style={{ width: "100%", height: 120, borderRadius: 8 }} />
              )}
              <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
                <TouchableOpacity onPress={() => openEdit(item)}>
                  <Text style={{ color: colors.gold, fontWeight: "600" }}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    Alert.alert("Delete testimony?", "This cannot be undone.", [
                      { text: "Cancel", style: "cancel" },
                      { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(item.id) },
                    ])
                  }
                >
                  <Text style={{ color: "#E53935", fontWeight: "600" }}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={showCompose} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: "90%" }}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: 16 }}>
                {editingItem ? "Edit Testimony" : "New Testimony"}
              </Text>
              <TextInput
                value={authorName}
                onChangeText={setAuthorName}
                placeholder="Author name"
                placeholderTextColor={colors.textSecondary}
                style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, color: colors.text, marginBottom: 10 }}
              />
              <TextInput
                value={body}
                onChangeText={setBody}
                placeholder="Testimony text"
                placeholderTextColor={colors.textSecondary}
                multiline
                textAlignVertical="top"
                style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, color: colors.text, minHeight: 120, marginBottom: 10 }}
              />
              <TextInput
                value={sortOrder}
                onChangeText={setSortOrder}
                placeholder="Sort order (0 = first)"
                keyboardType="number-pad"
                placeholderTextColor={colors.textSecondary}
                style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, color: colors.text, marginBottom: 10 }}
              />
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <Text style={{ color: colors.text }}>Published</Text>
                <Switch value={isPublished} onValueChange={setIsPublished} trackColor={{ true: colors.gold }} />
              </View>
              <TouchableOpacity onPress={pickImage} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <Ionicons name="image-outline" size={20} color={colors.gold} />
                <Text style={{ color: colors.gold }}>{imageData ? "Change photo" : "Add photo (optional)"}</Text>
              </TouchableOpacity>
              {imageData && <Image source={{ uri: imageData }} style={{ width: "100%", height: 140, borderRadius: 10, marginBottom: 12 }} />}
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity onPress={resetForm} style={{ flex: 1, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.border }}>
                  <Text style={{ textAlign: "center", color: colors.text }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  style={{ flex: 1, padding: 14, borderRadius: 10, backgroundColor: colors.gold }}
                >
                  {saveMutation.isPending ? (
                    <ActivityIndicator color={colors.background} />
                  ) : (
                    <Text style={{ textAlign: "center", color: colors.background, fontWeight: "700" }}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
