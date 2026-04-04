import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useThemeColors } from "@/constants/colors";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";

const NEWS_LAST_SEEN_KEY = "news_last_seen_at";

type NewsItem = {
  id: number;
  title: string;
  message: string;
  category: "update" | "event" | "release";
  createdAt: string;
};

const menuItems = [
  { key: "review", label: "Review", icon: "star-outline" },
  { key: "testimonies", label: "Testimonies", icon: "chatbubbles-outline" },
  { key: "about", label: "About Church", icon: "business-outline" },
  { key: "support", label: "Contact & Support", icon: "help-circle-outline" },
  { key: "faq", label: "FAQ", icon: "information-circle-outline" },
  { key: "notifications", label: "Notifications & News", icon: "notifications-outline" },
] as const;

export default function HamburgerMenu() {
  const [open, setOpen] = useState(false);
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null);
  const scheme = useColorScheme();
  const colors = useThemeColors(scheme);
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const topOffset = insets.top + (Platform.OS === "web" ? 67 : 0) + 10;

  const { data: newsItems = [] } = useQuery<NewsItem[]>({
    queryKey: ["/api/news"],
  });

  const unreadCount = useMemo(() => {
    if (!lastSeenAt) return newsItems.length;
    const seenTime = Date.parse(lastSeenAt);
    if (Number.isNaN(seenTime)) return newsItems.length;
    return newsItems.filter((item) => Date.parse(item.createdAt) > seenTime).length;
  }, [lastSeenAt, newsItems]);

  useEffect(() => {
    let active = true;

    AsyncStorage.getItem(NEWS_LAST_SEEN_KEY)
      .then((value) => {
        if (active) setLastSeenAt(value);
      })
      .catch(() => {
        if (active) setLastSeenAt(null);
      });

    return () => {
      active = false;
    };
  }, []);

  async function markNewsAsSeen() {
    const now = new Date().toISOString();
    setLastSeenAt(now);
    await AsyncStorage.setItem(NEWS_LAST_SEEN_KEY, now);
  }

  async function goTo(page: string) {
    setOpen(false);
    if (page === "notifications") {
      await markNewsAsSeen();
    }
    router.push(`/menu/${page}` as any);
  }

  return (
    <>
      <View style={[styles.fabRow, { top: topOffset }]}> 
        <Pressable
          onPress={() => {
            void goTo("notifications");
          }}
          style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          hitSlop={8}
        >
          <Ionicons name="notifications-outline" size={20} color={colors.text} />
          {unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.error }]}> 
              <Text style={styles.badgeText}>{unreadCount > 9 ? "9+" : String(unreadCount)}</Text>
            </View>
          )}
        </Pressable>

        <Pressable
          onPress={() => setOpen(true)}
          style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          hitSlop={8}
        >
          <Ionicons name="menu" size={22} color={colors.text} />
        </Pressable>
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[
              styles.drawer,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                paddingTop: topOffset + 8,
              },
            ]}
            onPress={() => {}}
          >
            <Text style={[styles.drawerTitle, { color: colors.text }]}>Menu</Text>

            {menuItems.map((item) => (
              <Pressable
                key={item.key}
                onPress={() => {
                  void goTo(item.key);
                }}
                style={({ pressed }) => [
                  styles.menuItem,
                  {
                    borderColor: colors.border,
                    backgroundColor: pressed ? colors.surfaceSecondary : colors.surface,
                  },
                ]}
              >
                <Ionicons name={item.icon as any} size={19} color={colors.text} />
                <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={17} color={colors.textSecondary} />
              </Pressable>
            ))}

            {user?.isAdmin && (
              <>
                <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 12 }} />
                <Text style={[styles.drawerTitle, { color: colors.gold, fontSize: 14, marginBottom: 8 }]}>Admin</Text>
                <Pressable
                  onPress={() => {
                    setOpen(false);
                    router.push("/admin-payments" as any);
                  }}
                  style={({ pressed }) => [
                    styles.menuItem,
                    {
                      borderColor: colors.gold,
                      backgroundColor: pressed ? colors.surfaceSecondary : colors.surface,
                    },
                  ]}
                >
                  <Ionicons name="card-outline" size={19} color={colors.gold} />
                  <Text style={[styles.menuLabel, { color: colors.gold }]}>Payments</Text>
                  <Ionicons name="chevron-forward" size={17} color={colors.gold} />
                </Pressable>
                <Pressable
                  onPress={() => {
                    setOpen(false);
                    router.push("/admin-affirmations" as any);
                  }}
                  style={({ pressed }) => [
                    styles.menuItem,
                    {
                      borderColor: colors.gold,
                      backgroundColor: pressed ? colors.surfaceSecondary : colors.surface,
                    },
                  ]}
                >
                  <Ionicons name="create-outline" size={19} color={colors.gold} />
                  <Text style={[styles.menuLabel, { color: colors.gold }]}>Affirmations</Text>
                  <Ionicons name="chevron-forward" size={17} color={colors.gold} />
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fabRow: {
    position: "absolute",
    right: 16,
    flexDirection: "row",
    gap: 10,
    zIndex: 20,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  badge: {
    position: "absolute",
    right: -4,
    top: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontFamily: "DMSans_700Bold",
    lineHeight: 12,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "flex-end",
  },
  drawer: {
    width: "82%",
    maxWidth: 360,
    height: "100%",
    borderLeftWidth: 1,
    paddingHorizontal: 16,
  },
  drawerTitle: {
    fontSize: 28,
    marginBottom: 14,
    fontFamily: "PlayfairDisplay_700Bold",
  },
  menuItem: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: "DMSans_500Medium",
  },
});
