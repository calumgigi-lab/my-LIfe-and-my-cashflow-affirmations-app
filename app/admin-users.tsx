import React, { useState } from "react";
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  Alert,
  useColorScheme,
  ActivityIndicator,
  TextInput,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import { useAuth } from "@/lib/auth-context";

interface AppUser {
  id: number;
  username: string;
  email: string;
  displayName: string | null;
  isAdmin: boolean;
  createdAt: string;
}

interface ResetCode {
  id: number;
  email: string;
  username: string;
  displayName: string | null;
  otpCode: string;
  expiresAt: string;
  createdAt: string;
}

type TabKey = "users" | "reset-codes";

export default function AdminUsersPanel() {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<TabKey>("users");
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  React.useEffect(() => {
    if (!authLoading && (!user || !user.isAdmin)) {
      router.replace("/");
    }
  }, [user, authLoading]);

  const { data: users = [], isLoading: usersLoading } = useQuery<AppUser[]>({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/users");
      return res.json();
    },
  });

  const { data: resetCodes = [], isLoading: codesLoading } = useQuery<ResetCode[]>({
    queryKey: ["admin-reset-codes"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/users/reset-codes");
      return res.json();
    },
    enabled: activeTab === "reset-codes",
  });

  const roleMutation = useMutation({
    mutationFn: async ({ userId, isAdmin }: { userId: number; isAdmin: boolean }) => {
      const res = await apiRequest("PUT", `/api/admin/users/${userId}/role`, { isAdmin });
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      Alert.alert(
        "Success",
        vars.isAdmin ? "User promoted to admin." : "Admin rights removed.",
      );
    },
    onError: (err: any) => {
      const msg = String(err?.message || "");
      if (msg.includes("own admin")) {
        Alert.alert("Not Allowed", "You cannot remove your own admin rights.");
      } else {
        Alert.alert("Error", "Could not update user role.");
      }
    },
  });

  function confirmRoleChange(targetUser: AppUser) {
    const action = targetUser.isAdmin ? "Remove admin rights from" : "Promote to admin";
    Alert.alert(
      `${action} ${targetUser.displayName || targetUser.username}?`,
      targetUser.isAdmin
        ? "This user will lose access to all admin features."
        : "This user will gain full admin access including payments and user management.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: targetUser.isAdmin ? "Remove Admin" : "Make Admin",
          style: targetUser.isAdmin ? "destructive" : "default",
          onPress: () => roleMutation.mutate({ userId: targetUser.id, isAdmin: !targetUser.isAdmin }),
        },
      ],
    );
  }

  async function onRefresh() {
    setRefreshing(true);
    await queryClient.refetchQueries({ queryKey: ["admin-users"] });
    await queryClient.refetchQueries({ queryKey: ["admin-reset-codes"] });
    setRefreshing(false);
  }

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.displayName || "").toLowerCase().includes(q)
    );
  });

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const formatTime = (d: string) =>
    new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

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
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Ionicons name="people" size={28} color={colors.text} />
            <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.text }}>
              User Management
            </Text>
          </View>
          <Text style={{ color: colors.text, opacity: 0.6, fontSize: 13, marginTop: 4 }}>
            {users.length} registered users
          </Text>
        </View>

        {/* Tabs */}
        <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 16 }}>
          {([
            { key: "users", label: "All Users", icon: "people-outline" },
            { key: "reset-codes", label: "Reset Codes", icon: "key-outline" },
          ] as const).map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                paddingVertical: 10,
                borderRadius: 10,
                backgroundColor: activeTab === tab.key ? (colors.tint || "#9EC9FF") : (colors.surface || "#1A436F"),
              }}
            >
              <Ionicons name={tab.icon} size={16} color={activeTab === tab.key ? "white" : colors.text} />
              <Text style={{ color: activeTab === tab.key ? "white" : colors.text, fontSize: 13, fontWeight: "600" }}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === "users" && (
          <View style={{ paddingHorizontal: 16 }}>
            {/* Search */}
            <View style={{
              flexDirection: "row", alignItems: "center", gap: 10,
              backgroundColor: colors.surface || "#1A436F",
              borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 14,
            }}>
              <Ionicons name="search-outline" size={18} color={colors.text} style={{ opacity: 0.6 }} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search users..."
                placeholderTextColor={colors.text + "60"}
                style={{ flex: 1, color: colors.text, fontSize: 14 }}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Ionicons name="close-circle" size={18} color={colors.text} style={{ opacity: 0.5 }} />
                </TouchableOpacity>
              )}
            </View>

            {usersLoading ? (
              <ActivityIndicator size="large" color={colors.tint || "#9EC9FF"} style={{ paddingVertical: 40 }} />
            ) : filteredUsers.length === 0 ? (
              <Text style={{ color: colors.text, opacity: 0.5, textAlign: "center", paddingVertical: 40 }}>
                No users found
              </Text>
            ) : (
              filteredUsers.map((u) => (
                <View
                  key={u.id}
                  style={{
                    backgroundColor: colors.surface || "#1A436F",
                    borderRadius: 10, padding: 12, marginBottom: 10,
                    borderLeftWidth: 3,
                    borderLeftColor: u.isAdmin ? (colors.tint || "#9EC9FF") : "transparent",
                  }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 }}>
                        <Text style={{ color: colors.text, fontWeight: "700", fontSize: 15 }}>
                          {u.displayName || u.username}
                        </Text>
                        {u.isAdmin && (
                          <View style={{ backgroundColor: colors.tint + "30", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                            <Text style={{ color: colors.tint, fontSize: 10, fontWeight: "700" }}>ADMIN</Text>
                          </View>
                        )}
                        {u.id === user?.id && (
                          <View style={{ backgroundColor: "#FFD70030", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                            <Text style={{ color: "#FFD700", fontSize: 10, fontWeight: "700" }}>YOU</Text>
                          </View>
                        )}
                      </View>
                      <Text style={{ color: colors.text, opacity: 0.7, fontSize: 12 }}>@{u.username}</Text>
                      <Text style={{ color: colors.text, opacity: 0.6, fontSize: 12 }}>{u.email}</Text>
                      <Text style={{ color: colors.text, opacity: 0.4, fontSize: 11, marginTop: 4 }}>
                        Joined {formatDate(u.createdAt)}
                      </Text>
                    </View>

                    {u.id !== user?.id && (
                      <TouchableOpacity
                        onPress={() => confirmRoleChange(u)}
                        disabled={roleMutation.isPending}
                        style={{
                          backgroundColor: u.isAdmin ? "#F4433620" : "#4CAF5020",
                          borderWidth: 1,
                          borderColor: u.isAdmin ? "#F44336" : "#4CAF50",
                          borderRadius: 8,
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          alignItems: "center",
                          minWidth: 90,
                        }}
                      >
                        <Ionicons
                          name={u.isAdmin ? "remove-circle-outline" : "shield-checkmark-outline"}
                          size={14}
                          color={u.isAdmin ? "#F44336" : "#4CAF50"}
                        />
                        <Text style={{
                          fontSize: 10, fontWeight: "700", marginTop: 2,
                          color: u.isAdmin ? "#F44336" : "#4CAF50",
                        }}>
                          {u.isAdmin ? "Remove Admin" : "Make Admin"}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === "reset-codes" && (
          <View style={{ paddingHorizontal: 16 }}>
            <View style={{ backgroundColor: "#FF980020", borderRadius: 10, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: "#FF980040" }}>
              <Text style={{ color: "#FF9800", fontSize: 13, lineHeight: 20 }}>
                These are active password reset codes. Share the code with the user if they did not receive an email. Codes expire after 15 minutes.
              </Text>
            </View>

            {codesLoading ? (
              <ActivityIndicator size="large" color={colors.tint || "#9EC9FF"} style={{ paddingVertical: 40 }} />
            ) : resetCodes.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 40 }}>
                <Ionicons name="checkmark-circle-outline" size={40} color={colors.text} style={{ opacity: 0.3, marginBottom: 8 }} />
                <Text style={{ color: colors.text, opacity: 0.5, textAlign: "center" }}>
                  No pending reset codes
                </Text>
              </View>
            ) : (
              resetCodes.map((code) => (
                <View
                  key={code.id}
                  style={{
                    backgroundColor: colors.surface || "#1A436F",
                    borderRadius: 10, padding: 14, marginBottom: 10,
                    borderLeftWidth: 3, borderLeftColor: "#FF9800",
                  }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <Text style={{ color: colors.text, fontWeight: "700", fontSize: 15 }}>
                      {code.displayName || code.username}
                    </Text>
                    <Text style={{ color: colors.text, opacity: 0.5, fontSize: 11 }}>
                      Expires: {formatTime(code.expiresAt)}
                    </Text>
                  </View>
                  <Text style={{ color: colors.text, opacity: 0.7, fontSize: 12, marginBottom: 10 }}>
                    {code.email}
                  </Text>
                  <View style={{
                    backgroundColor: "#FF980020", borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14,
                    alignItems: "center", borderWidth: 1, borderColor: "#FF980060",
                  }}>
                    <Text style={{ color: colors.text, opacity: 0.6, fontSize: 11, marginBottom: 4 }}>RESET CODE</Text>
                    <Text style={{ color: "#FF9800", fontSize: 28, fontWeight: "900", letterSpacing: 12 }}>
                      {code.otpCode}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
