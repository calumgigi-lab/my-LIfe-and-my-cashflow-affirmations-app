import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { FadeInDown } from "react-native-reanimated";
import { fetch as expoFetch } from "expo/fetch";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useThemeColors } from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { queryClient, getApiUrl } from "@/lib/query-client";
import {
  headerRefreshOffset,
  invalidateQueryKeys,
  runScreenRefresh,
} from "@/lib/screen-refresh";

type LeaderboardEntry = {
  rank: number;
  userId: number;
  username: string;
  displayName: string | null;
  profilePictureUrl: string | null;
  points: number;
  totalEarned: number;
  totalAffirmed: number;
  currentStreak: number;
};

const AVATAR_COLORS: [string, string][] = [
  ["#D4A853", "#C49A3D"],
  ["#C0C0C0", "#A0A0A0"],
  ["#CD7F32", "#A0622A"],
  ["#5B8DEF", "#3A6DD9"],
  ["#BF5AF2", "#9B3FD4"],
  ["#30D158", "#22A847"],
  ["#FF6B6B", "#E04848"],
  ["#64B5F6", "#4A9BE0"],
  ["#FF9F43", "#E08530"],
  ["#54A0FF", "#3A85E0"],
  ["#00D2D3", "#00A8A9"],
  ["#3A7BD5", "#D4A853"],
  ["#A29BFE", "#8075E0"],
  ["#FD79A8", "#E05588"],
  ["#6C5CE7", "#5545CC"],
];

const PERIODS = ["weekly", "monthly", "alltime"] as const;
type Period = (typeof PERIODS)[number];

function getAvatarColors(userId: number): [string, string] {
  return AVATAR_COLORS[Math.abs(userId) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function periodLabel(p: Period): string {
  if (p === "weekly") return "Weekly";
  if (p === "monthly") return "Monthly";
  return "All Time";
}

export default function LeaderboardScreen() {
  const scheme = useColorScheme();
  const colors = useThemeColors(scheme);
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [period, setPeriod] = useState<Period>("weekly");
  const [refreshing, setRefreshing] = useState(false);
  const refreshOffset = headerRefreshOffset(insets.top);

  const sliderX = useRef(new Animated.Value(0)).current;
  const sliderW = useRef(new Animated.Value(0)).current;
  const btnWidths = useRef(
    PERIODS.map(() => ({ x: 0, w: 0 }))
  ).current;

  const { data: leaderboard = [], isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/leaderboard", period],
    queryFn: async () => {
      const url = new URL(`/api/leaderboard?period=${period}`, getApiUrl());
      const res = await expoFetch(url.toString());
      if (!res.ok) throw new Error("Failed to load leaderboard");
      return res.json();
    },
    staleTime: 30_000,
  });

  const myEntry = leaderboard.find((e) => e.userId === user?.id);

  const moveSlider = useCallback(
    (index: number) => {
      const { x, w } = btnWidths[index];
      Animated.parallel([
        Animated.spring(sliderX, {
          toValue: x,
          useNativeDriver: false,
          damping: 18,
          stiffness: 200,
        }),
        Animated.spring(sliderW, {
          toValue: w,
          useNativeDriver: false,
          damping: 18,
          stiffness: 200,
        }),
      ]).start();
    },
    [btnWidths, sliderX, sliderW]
  );

  useEffect(() => {
    const idx = PERIODS.indexOf(period);
    if (idx >= 0) {
      setTimeout(() => moveSlider(idx), 60);
    }
  }, [period, moveSlider]);

  const onRefresh = useCallback(async () => {
    await runScreenRefresh(setRefreshing, async () => {
      await invalidateQueryKeys(queryClient, [["/api/leaderboard"]]);
    });
  }, []);

  const handlePeriodPress = useCallback((p: Period) => {
    setPeriod(p);
  }, []);

  const handleBtnLayout = useCallback(
    (index: number, e: any) => {
      const { x, width } = e.nativeEvent.layout;
      btnWidths[index] = { x, w: width };
      if (PERIODS[index] === period) {
        sliderX.setValue(x);
        sliderW.setValue(width);
      }
    },
    [period, btnWidths, sliderX, sliderW]
  );

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);
  const meInRest = myEntry && myEntry.rank > 3;
  const showGap = meInRest && rest.length > 0;

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.nav,
          {
            paddingTop: insets.top + 12,
            paddingBottom: 14,
            backgroundColor: "rgba(15,44,79,0.85)",
            borderBottomColor: "rgba(72,118,168,0.18)",
          },
        ]}
      >
        <Animated.Text
          entering={FadeInDown.delay(100).duration(400)}
          style={[styles.navTitle, { color: colors.text }]}
        >
          Leaderboard
        </Animated.Text>
        <View
          style={[
            styles.navIcon,
            { backgroundColor: colors.surface, borderColor: "rgba(72,118,168,0.18)" },
          ]}
        >
          <Ionicons name="help-circle-outline" size={20} color={colors.textSecondary} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.gold}
            colors={[colors.gold]}
            progressViewOffset={refreshOffset}
            progressBackgroundColor={colors.surface}
          />
        }
      >
        <Animated.View
          entering={FadeInDown.delay(200).duration(400)}
          style={styles.periodWrap}
        >
          <View
            style={[
              styles.periodBar,
              { backgroundColor: colors.surface, borderColor: "rgba(72,118,168,0.18)" },
            ]}
          >
            <Animated.View
              style={[
                styles.periodSlider,
                {
                  left: sliderX,
                  width: sliderW,
                  backgroundColor: colors.gold,
                },
              ]}
            />
            {PERIODS.map((p, i) => (
              <View
                key={p}
                onLayout={(e) => handleBtnLayout(i, e)}
                style={styles.periodBtnWrapper}
              >
                <Text
                  onPress={() => handlePeriodPress(p)}
                  style={[
                    styles.periodBtn,
                    {
                      color: period === p ? colors.text : "#5A7FA3",
                    },
                  ]}
                >
                  {periodLabel(p)}
                </Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {myEntry && (
          <Animated.View
            entering={FadeInDown.delay(300).duration(400)}
            style={styles.yourRankWrap}
          >
            <LinearGradient
              colors={["rgba(212,168,83,0.1)", "rgba(26,67,111,0.95)", "rgba(212,168,83,0.05)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.yourRankCard,
                { borderColor: "rgba(212,168,83,0.25)" },
              ]}
            >
              <Text style={[styles.yourRankLabel, { color: colors.gold }]}>
                Your Current Rank
              </Text>
              <View style={styles.yourRankRow}>
                <LinearGradient
                  colors={getAvatarColors(myEntry.userId)}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.yourRankAvatar,
                    { borderColor: colors.gold },
                  ]}
                >
                  <Text style={styles.yourRankAvatarText}>
                    {getInitials(
                      myEntry.displayName || myEntry.username || "?"
                    )}
                  </Text>
                </LinearGradient>
                <View style={styles.yourRankInfo}>
                  <Text
                    style={[styles.yourRankName, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {myEntry.displayName || myEntry.username}
                  </Text>
                  <View style={styles.yourRankChange}>
                    <Ionicons name="remove" size={14} color="#5A7FA3" />
                    <Text style={{ color: "#5A7FA3", fontSize: 12 }}>
                      +0 this week
                    </Text>
                  </View>
                </View>
                <Text
                  style={[styles.yourRankNum, { color: colors.text }]}
                >
                  #{myEntry.rank}
                </Text>
              </View>
              <View style={styles.yourRankBottom}>
                <Text style={[styles.yourRankPoints, { color: colors.textSecondary }]}>
                  <Text style={{ color: colors.gold, fontWeight: "700" }}>
                    {myEntry.points.toLocaleString()}
                  </Text>{" "}
                  pts
                </Text>
                {leaderboard.length > 0 && (
                  <View
                    style={[
                      styles.topPct,
                      {
                        backgroundColor: "rgba(212,168,83,0.12)",
                        borderColor: "rgba(212,168,83,0.25)",
                      },
                    ]}
                  >
                    <Text style={[styles.topPctText, { color: colors.gold }]}>
                      Top{" "}
                      {Math.max(
                        1,
                        Math.round((myEntry.rank / leaderboard.length) * 100)
                      )}
                      %
                    </Text>
                  </View>
                )}
              </View>
            </LinearGradient>
          </Animated.View>
        )}

        {top3.length > 0 && (
          <Animated.View
            entering={FadeInDown.delay(400).duration(400)}
            style={styles.podiumSection}
          >
            <Text
              style={[
                styles.podiumTitle,
                { color: colors.textSecondary },
              ]}
            >
              This Week's Champions
            </Text>
            <View style={styles.podium}>
              {top3.length >= 2 && (() => {
                const p = top3[1];
                const isMe = p.userId === user?.id;
                return (
                  <View style={[styles.podiumItem, styles.podiumItem2]}>
                    <View style={styles.podiumAvatarWrap}>
                      <LinearGradient
                        colors={
                          isMe
                            ? [colors.gold, colors.goldDark]
                            : getAvatarColors(p.userId)
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[
                          styles.podiumAvatar,
                          styles.podiumAvatar2,
                          { borderColor: "#C0C0C0" },
                        ]}
                      >
                        <Text style={styles.podiumAvatarText2}>
                          {getInitials(p.displayName || p.username || "?")}
                        </Text>
                      </LinearGradient>
                    </View>
                    <Text style={[styles.podiumLabel, { color: "#C0C0C0" }]}>
                      Runner Up
                    </Text>
                    <Text
                      style={[styles.podiumName, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {p.displayName || p.username}
                    </Text>
                    <Text style={[styles.podiumPts, { color: colors.textSecondary }]}>
                      {p.points.toLocaleString()} pts
                    </Text>
                    <View
                      style={[
                        styles.podiumBase,
                        styles.podiumBase2,
                        {
                          backgroundColor: "rgba(192,192,192,0.12)",
                        },
                      ]}
                    >
                      <Text style={styles.podiumBaseNum}>2</Text>
                    </View>
                  </View>
                );
              })()}

              {top3.length >= 1 && (() => {
                const p = top3[0];
                const isMe = p.userId === user?.id;
                return (
                  <View style={[styles.podiumItem, styles.podiumItem1]}>
                    <View style={styles.podiumAvatarWrap}>
                      <Text style={styles.crownEmoji}>👑</Text>
                      <LinearGradient
                        colors={
                          isMe
                            ? [colors.gold, colors.goldDark]
                            : getAvatarColors(p.userId)
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[
                          styles.podiumAvatar,
                          styles.podiumAvatar1,
                          { borderColor: colors.gold },
                        ]}
                      >
                        <Text style={styles.podiumAvatarText1}>
                          {getInitials(p.displayName || p.username || "?")}
                        </Text>
                      </LinearGradient>
                    </View>
                    <Text style={[styles.podiumLabel, { color: colors.gold }]}>
                      Champion
                    </Text>
                    <Text
                      style={[styles.podiumName, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {p.displayName || p.username}
                    </Text>
                    <Text style={[styles.podiumPts, { color: colors.textSecondary }]}>
                      {p.points.toLocaleString()} pts
                    </Text>
                    <View
                      style={[
                        styles.podiumBase,
                        styles.podiumBase1,
                        {
                          backgroundColor: "rgba(212,168,83,0.18)",
                        },
                      ]}
                    >
                      <Text style={styles.podiumBaseNum}>1</Text>
                    </View>
                  </View>
                );
              })()}

              {top3.length >= 3 && (() => {
                const p = top3[2];
                const isMe = p.userId === user?.id;
                return (
                  <View style={[styles.podiumItem, styles.podiumItem3]}>
                    <View style={styles.podiumAvatarWrap}>
                      <LinearGradient
                        colors={
                          isMe
                            ? [colors.gold, colors.goldDark]
                            : getAvatarColors(p.userId)
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[
                          styles.podiumAvatar,
                          styles.podiumAvatar3,
                          { borderColor: "#CD7F32" },
                        ]}
                      >
                        <Text style={styles.podiumAvatarText3}>
                          {getInitials(p.displayName || p.username || "?")}
                        </Text>
                      </LinearGradient>
                    </View>
                    <Text style={[styles.podiumLabel, { color: "#CD7F32" }]}>
                      Third Place
                    </Text>
                    <Text
                      style={[styles.podiumName, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {p.displayName || p.username}
                    </Text>
                    <Text style={[styles.podiumPts, { color: colors.textSecondary }]}>
                      {p.points.toLocaleString()} pts
                    </Text>
                    <View
                      style={[
                        styles.podiumBase,
                        styles.podiumBase3,
                        {
                          backgroundColor: "rgba(205,127,50,0.12)",
                        },
                      ]}
                    >
                      <Text style={styles.podiumBaseNum}>3</Text>
                    </View>
                  </View>
                );
              })()}
            </View>
          </Animated.View>
        )}

        <Animated.View
          entering={FadeInDown.delay(500).duration(400)}
          style={styles.listSection}
        >
          <View style={styles.listHeader}>
            <Text style={[styles.listTitle, { color: colors.text }]}>
              Full Rankings
            </Text>
            {rest.length > 0 && (
              <Text style={[styles.listCount, { color: "#5A7FA3" }]}>
                Showing 4–{rest.length + 3}
              </Text>
            )}
          </View>

          <View
            style={[
              styles.listContainer,
              {
                borderColor: "rgba(72,118,168,0.18)",
                backgroundColor: "rgba(26,67,111,0.25)",
              },
            ]}
          >
            {rest.map((entry) => {
              const isMe = entry.userId === user?.id;
              return (
                <View
                  key={entry.userId}
                  style={[
                    styles.listItem,
                    isMe && {
                      backgroundColor: "rgba(212,168,83,0.12)",
                      borderLeftWidth: 3,
                      borderLeftColor: colors.gold,
                      paddingLeft: 13,
                    },
                    !isMe &&
                      entry.rank % 2 === 0 && {
                        backgroundColor: "rgba(26,67,111,0.18)",
                      },
                  ]}
                >
                  <Text
                    style={[
                      styles.listRank,
                      {
                        color: isMe ? colors.gold : colors.textSecondary,
                        fontFamily: "PlayfairDisplay_700Bold",
                      },
                    ]}
                  >
                    {entry.rank}
                  </Text>
                  <LinearGradient
                    colors={getAvatarColors(entry.userId)}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.listAvatar}
                  >
                    <Text style={styles.listAvatarText}>
                      {getInitials(
                        entry.displayName || entry.username || "?"
                      )}
                    </Text>
                  </LinearGradient>
                  <Text
                    style={[
                      styles.listName,
                      {
                        color: isMe ? colors.gold : colors.text,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {entry.displayName || entry.username}
                  </Text>
                  <Text
                    style={[
                      styles.listPts,
                      {
                        color: isMe ? colors.gold : colors.textSecondary,
                      },
                    ]}
                  >
                    {entry.points.toLocaleString()} pts
                  </Text>
                  <View style={styles.listChange}>
                    <Ionicons
                      name="remove"
                      size={12}
                      color="#5A7FA3"
                    />
                    <Text style={{ color: "#5A7FA3", fontSize: 11 }}>0</Text>
                  </View>
                </View>
              );
            })}

            {showGap && (
              <View style={styles.listGap}>
                <View style={styles.listGapLine} />
                <Text style={[styles.listGapText, { color: "#5A7FA3" }]}>
                  · · ·
                </Text>
                <View style={styles.listGapLine} />
              </View>
            )}

            {meInRest && myEntry && (
              <View
                style={[
                  styles.listItem,
                  styles.listItemHighlight,
                  {
                    backgroundColor: "rgba(212,168,83,0.12)",
                    borderLeftWidth: 3,
                    borderLeftColor: colors.gold,
                    paddingLeft: 13,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.listRankHighlight,
                    { color: colors.gold },
                  ]}
                >
                  {myEntry.rank}
                </Text>
                <LinearGradient
                  colors={getAvatarColors(myEntry.userId)}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.listAvatar}
                >
                  <Text style={styles.listAvatarText}>
                    {getInitials(
                      myEntry.displayName || myEntry.username || "?"
                    )}
                  </Text>
                </LinearGradient>
                <Text
                  style={[styles.listName, { color: colors.gold }]}
                  numberOfLines={1}
                >
                  {myEntry.displayName || myEntry.username}
                </Text>
                <Text
                  style={[styles.listPts, { color: colors.gold }]}
                >
                  {myEntry.points.toLocaleString()} pts
                </Text>
                <View style={styles.listChange}>
                  <Ionicons name="remove" size={12} color="#5A7FA3" />
                  <Text style={{ color: "#5A7FA3", fontSize: 11 }}>0</Text>
                </View>
              </View>
            )}
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  navTitle: {
    fontSize: 22,
    fontFamily: "PlayfairDisplay_700Bold",
    letterSpacing: -0.02,
  },
  navIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  periodWrap: {
    paddingTop: 16,
  },
  periodBar: {
    flexDirection: "row",
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    position: "relative",
  },
  periodSlider: {
    position: "absolute",
    top: 4,
    bottom: 4,
    borderRadius: 11,
    shadowColor: "#D4A853",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  periodBtnWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    zIndex: 2,
  },
  periodBtn: {
    fontSize: 14,
    fontWeight: "600",
  },
  yourRankWrap: {
    paddingTop: 16,
  },
  yourRankCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
    overflow: "hidden",
  },
  yourRankLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.08,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  yourRankRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  yourRankAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    shadowColor: "#D4A853",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 6,
  },
  yourRankAvatarText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 18,
  },
  yourRankInfo: {
    flex: 1,
    marginLeft: 16,
  },
  yourRankName: {
    fontWeight: "700",
    fontSize: 16,
    marginBottom: 2,
  },
  yourRankChange: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  yourRankNum: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 42,
    fontWeight: "800",
    lineHeight: 44,
    letterSpacing: -0.03,
  },
  yourRankBottom: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  yourRankPoints: {
    fontSize: 14,
  },
  topPct: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  topPctText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.04,
  },
  podiumSection: {
    paddingTop: 24,
  },
  podiumTitle: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 17,
    textAlign: "center",
    marginBottom: 22,
  },
  podium: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
  },
  podiumItem: {
    alignItems: "center",
    flex: 1,
  },
  podiumItem1: {
    zIndex: 3,
  },
  podiumItem2: {
    zIndex: 2,
  },
  podiumItem3: {
    zIndex: 1,
  },
  podiumAvatarWrap: {
    position: "relative",
    marginBottom: 10,
  },
  crownEmoji: {
    position: "absolute",
    top: -22,
    left: "50%",
    marginLeft: -12,
    fontSize: 24,
    zIndex: 5,
  },
  podiumAvatar: {
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  podiumAvatar1: {
    width: 78,
    height: 78,
    borderWidth: 3.5,
  },
  podiumAvatar2: {
    width: 64,
    height: 64,
    borderWidth: 3,
  },
  podiumAvatar3: {
    width: 64,
    height: 64,
    borderWidth: 3,
  },
  podiumAvatarText1: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 22,
  },
  podiumAvatarText2: {
    color: "#1A1A1A",
    fontWeight: "700",
    fontSize: 18,
  },
  podiumAvatarText3: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 18,
  },
  podiumLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.06,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  podiumName: {
    fontWeight: "600",
    fontSize: 14,
    marginBottom: 3,
    textAlign: "center",
    paddingHorizontal: 4,
  },
  podiumPts: {
    fontSize: 12,
  },
  podiumBase: {
    width: "100%",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    alignItems: "center",
    paddingTop: 12,
    marginTop: 12,
  },
  podiumBase1: {
    height: 72,
  },
  podiumBase2: {
    height: 52,
  },
  podiumBase3: {
    height: 52,
  },
  podiumBaseNum: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 20,
    fontWeight: "800",
    color: "rgba(255,255,255,0.15)",
  },
  listSection: {
    paddingTop: 24,
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  listTitle: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 17,
    fontWeight: "700",
  },
  listCount: {
    fontSize: 12,
    fontWeight: "500",
  },
  listContainer: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  listItemHighlight: {},
  listRank: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontWeight: "700",
    fontSize: 15,
    width: 32,
    textAlign: "center",
  },
  listRankHighlight: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontWeight: "700",
    fontSize: 17,
    width: 32,
    textAlign: "center",
  },
  listAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 10,
  },
  listAvatarText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
  listName: {
    flex: 1,
    fontWeight: "600",
    fontSize: 14,
  },
  listPts: {
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 8,
  },
  listChange: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginLeft: 10,
    minWidth: 48,
    justifyContent: "flex-end",
  },
  listGap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 6,
  },
  listGapLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(72,118,168,0.18)",
  },
  listGapText: {
    fontSize: 12,
    fontWeight: "500",
  },
});
