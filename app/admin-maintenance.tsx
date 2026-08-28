import React, { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  useColorScheme,
  ActivityIndicator,
  Switch,
  Pressable,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import { useAuth } from "@/lib/auth-context";

interface MaintenanceSettings {
  enabled: boolean;
  message: string;
  endAt: string | null;
}
interface AppUpdateSettings {
  enabled: boolean;
  minVersionCode: number;
  force: boolean;
  title: string;
  message: string;
  url: string;
}
interface AnnouncementSettings {
  enabled: boolean;
  id: string;
  title: string;
  message: string;
  level: string;
}
interface LiveControls {
  maintenance: MaintenanceSettings;
  appUpdate: AppUpdateSettings;
  announcement: AnnouncementSettings;
}

function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function parseLocalInput(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const d = new Date(trimmed.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}
function addHours(hours: number): string {
  const d = new Date();
  d.setHours(d.getHours() + hours);
  return d.toISOString();
}

export default function LiveControlsPanel() {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  const insets = useSafeAreaInsets();

  // Maintenance
  const [mEnabled, setMEnabled] = useState(false);
  const [mMessage, setMMessage] = useState("");
  const [mEndAt, setMEndAt] = useState("");

  // App update
  const [uEnabled, setUEnabled] = useState(false);
  const [uForce, setUForce] = useState(false);
  const [uMinCode, setUMinCode] = useState("");
  const [uTitle, setUTitle] = useState("");
  const [uMessage, setUMessage] = useState("");
  const [uUrl, setUUrl] = useState("");

  // Announcement
  const [aEnabled, setAEnabled] = useState(false);
  const [aTitle, setATitle] = useState("");
  const [aMessage, setAMessage] = useState("");
  const [aLevel, setALevel] = useState("info");

  const { data, isLoading, refetch, isFetching } = useQuery<LiveControls>({
    queryKey: ["/api/admin/live-controls"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/live-controls");
      return res.json();
    },
    enabled: !!user?.isAdmin,
  });

  useEffect(() => {
    if (!authLoading && (!user || !user.isAdmin)) router.replace("/");
  }, [authLoading, user]);

  useEffect(() => {
    if (!data) return;
    setMEnabled(data.maintenance.enabled);
    setMMessage(data.maintenance.message || "");
    setMEndAt(toLocalInputValue(data.maintenance.endAt));
    setUEnabled(data.appUpdate.enabled);
    setUForce(data.appUpdate.force);
    setUMinCode(String(data.appUpdate.minVersionCode || ""));
    setUTitle(data.appUpdate.title || "");
    setUMessage(data.appUpdate.message || "");
    setUUrl(data.appUpdate.url || "");
    setAEnabled(data.announcement.enabled);
    setATitle(data.announcement.title || "");
    setAMessage(data.announcement.message || "");
    setALevel(data.announcement.level || "info");
  }, [data]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/live-controls"] });
    queryClient.invalidateQueries({ queryKey: ["/api/settings/public"] });
  };

  const maintenanceMutation = useMutation({
    mutationFn: async () => {
      const endAt = parseLocalInput(mEndAt);
      if (mEndAt.trim() && !endAt) throw new Error("End time must be YYYY-MM-DD HH:MM");
      const res = await apiRequest("PUT", "/api/admin/maintenance", {
        enabled: mEnabled,
        message: mMessage.trim() || undefined,
        endAt,
      });
      return res.json();
    },
    onSuccess: () => {
      invalidate();
      Alert.alert(mEnabled ? "Maintenance enabled" : "Maintenance disabled");
    },
    onError: (e: Error) => Alert.alert("Error", e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      let minCode = uMinCode ? parseInt(uMinCode, 10) : 0;
      if (uEnabled && (!uMinCode.trim() || Number.isNaN(minCode) || minCode <= 0)) {
        minCode = 15;
      }
      const res = await apiRequest("PUT", "/api/admin/app-update", {
        enabled: uEnabled,
        force: uForce,
        minVersionCode: minCode,
        title: uTitle.trim(),
        message: uMessage.trim(),
        url: uUrl.trim() || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      invalidate();
      Alert.alert("Saved", uEnabled ? "Update notice is now live." : "Update notice disabled.");
    },
    onError: (e: Error) => Alert.alert("Error", e.message),
  });

  const announcementMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", "/api/admin/announcement", {
        enabled: aEnabled,
        title: aTitle.trim(),
        message: aMessage.trim(),
        level: aLevel,
      });
      return res.json();
    },
    onSuccess: () => {
      invalidate();
      Alert.alert("Saved", aEnabled ? "Announcement is now live." : "Announcement disabled.");
    },
    onError: (e: Error) => Alert.alert("Error", e.message),
  });

  if (authLoading || isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  const inputStyle = {
    backgroundColor: colors.inputBg,
    color: colors.text,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  } as const;

  const label = (t: string) => (
    <Text style={{ color: colors.textSecondary, marginBottom: 8, fontSize: 13 }}>{t}</Text>
  );

  const sectionCard = (children: React.ReactNode) => (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 14,
      }}
    >
      {children}
    </View>
  );

  const rowSwitch = (title: string, desc: string, value: boolean, onChange: (v: boolean) => void) => (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <View style={{ flex: 1, marginRight: 12 }}>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>{title}</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4 }}>{desc}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: colors.border, true: colors.tint }} thumbColor="#fff" />
    </View>
  );

  const saveButton = (text: string, onPress: () => void, pending: boolean, active: boolean) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={pending}
      style={{
        backgroundColor: active ? "#E3A24B" : colors.tint,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: "center",
        opacity: pending ? 0.7 : 1,
      }}
    >
      {pending ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>{text}</Text>}
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8, marginRight: 8 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: "700", color: colors.text, flex: 1 }}>Live Controls</Text>
        <TouchableOpacity onPress={() => refetch()} disabled={isFetching}>
          <Ionicons name="refresh" size={22} color={colors.tint} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 18, paddingBottom: insets.bottom + 40 }}>
        {/* ── Maintenance ── */}
        <Text style={{ color: colors.gold, fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 }}>
          Maintenance
        </Text>
        {sectionCard(
          <>
            {rowSwitch("Pause all user activity", "Blocks login & app use. Admins keep access.", mEnabled, setMEnabled)}
            <View>
              {label("Message shown to users")}
              <TextInput
                value={mMessage}
                onChangeText={setMMessage}
                multiline
                placeholder="We are performing scheduled maintenance..."
                placeholderTextColor={colors.textSecondary}
                style={{ ...inputStyle, minHeight: 90, textAlignVertical: "top" }}
              />
            </View>
            <View>
              {label("Expected end time (optional)")}
              <TextInput
                value={mEndAt}
                onChangeText={setMEndAt}
                placeholder="YYYY-MM-DD HH:MM"
                placeholderTextColor={colors.textSecondary}
                style={inputStyle}
              />
              <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                {[1, 2, 4].map((h) => (
                  <Pressable
                    key={h}
                    onPress={() => setMEndAt(toLocalInputValue(addHours(h)))}
                    style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border }}
                  >
                    <Text style={{ color: colors.text, fontSize: 13 }}>+{h}h</Text>
                  </Pressable>
                ))}
                <Pressable
                  onPress={() => setMEndAt("")}
                  style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border }}
                >
                  <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Clear</Text>
                </Pressable>
              </View>
            </View>
            {saveButton(mEnabled ? "Enable maintenance" : "Save maintenance", () => maintenanceMutation.mutate(), maintenanceMutation.isPending, mEnabled)}
          </>
        )}

        {/* ── App Update Notice ── */}
        <Text style={{ color: colors.gold, fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 }}>
          Update Notice
        </Text>
        {sectionCard(
          <>
            {rowSwitch("Show update notice", "Tell users on older versions to update.", uEnabled, setUEnabled)}
            {rowSwitch("Force update (block app)", "Users must update before using the app.", uForce, setUForce)}
            <View>
              {label("Apply to versions below this versionCode")}
              <TextInput
                value={uMinCode}
                onChangeText={(t) => setUMinCode(t.replace(/\D/g, ""))}
                keyboardType="number-pad"
                placeholder="e.g. 13"
                placeholderTextColor={colors.textSecondary}
                style={inputStyle}
              />
              <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 6 }}>
                Set this to the versionCode of the build you just published. Anyone below it sees the notice.
              </Text>
            </View>
            <View>
              {label("Title")}
              <TextInput value={uTitle} onChangeText={setUTitle} placeholder="Update available" placeholderTextColor={colors.textSecondary} style={inputStyle} />
            </View>
            <View>
              {label("Message")}
              <TextInput
                value={uMessage}
                onChangeText={setUMessage}
                multiline
                placeholder="A new version is available with improvements..."
                placeholderTextColor={colors.textSecondary}
                style={{ ...inputStyle, minHeight: 80, textAlignVertical: "top" }}
              />
            </View>
            <View>
              {label("Store URL")}
              <TextInput value={uUrl} onChangeText={setUUrl} autoCapitalize="none" placeholder="https://play.google.com/store/apps/details?id=..." placeholderTextColor={colors.textSecondary} style={inputStyle} />
            </View>
            {saveButton("Save update notice", () => updateMutation.mutate(), updateMutation.isPending, uEnabled)}
          </>
        )}

        {/* ── Announcement Banner ── */}
        <Text style={{ color: colors.gold, fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 }}>
          Announcement Banner
        </Text>
        {sectionCard(
          <>
            {rowSwitch("Show announcement", "A dismissible banner at the top of the app.", aEnabled, setAEnabled)}
            <View>
              {label("Title (optional)")}
              <TextInput value={aTitle} onChangeText={setATitle} placeholder="New feature!" placeholderTextColor={colors.textSecondary} style={inputStyle} />
            </View>
            <View>
              {label("Message")}
              <TextInput
                value={aMessage}
                onChangeText={setAMessage}
                multiline
                placeholder="Tell your users something..."
                placeholderTextColor={colors.textSecondary}
                style={{ ...inputStyle, minHeight: 80, textAlignVertical: "top" }}
              />
            </View>
            <View>
              {label("Style")}
              <View style={{ flexDirection: "row", gap: 8 }}>
                {[
                  { v: "info", c: "#2196F3", l: "Info" },
                  { v: "success", c: "#4CAF50", l: "Success" },
                  { v: "warning", c: "#E3A24B", l: "Warning" },
                ].map((opt) => (
                  <Pressable
                    key={opt.v}
                    onPress={() => setALevel(opt.v)}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 8,
                      alignItems: "center",
                      backgroundColor: aLevel === opt.v ? opt.c + "33" : colors.surfaceSecondary,
                      borderWidth: 1,
                      borderColor: aLevel === opt.v ? opt.c : colors.border,
                    }}
                  >
                    <Text style={{ color: aLevel === opt.v ? opt.c : colors.textSecondary, fontSize: 13, fontWeight: "600" }}>{opt.l}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            {saveButton("Save announcement", () => announcementMutation.mutate(), announcementMutation.isPending, aEnabled)}
          </>
        )}
      </ScrollView>
    </View>
  );
}
