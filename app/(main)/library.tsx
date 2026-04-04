import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useColorScheme,
  ScrollView,
  Platform,
  ActivityIndicator,
  Image,
  ImageSourcePropType,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useThemeColors } from "@/constants/colors";
import { queryClient, apiRequest } from "@/lib/query-client";
import { purchaseBooklet } from "@/lib/booklet-purchases";
import { PaymentDetailsModal } from "@/components/PaymentDetailsModal";

const monthNames = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const monthIcons: Record<number, string> = {
  1: "snow", 2: "heart", 3: "leaf", 4: "rainy",
  5: "flower", 6: "sunny", 7: "star", 8: "flame",
  9: "earth", 10: "moon", 11: "gift", 12: "sparkles",
};

const bookletCovers: Partial<Record<number, ImageSourcePropType>> = {
  1: require("../../book thumbnail/january.png"),
  2: require("../../book thumbnail/february.png"),
  3: require("../../book thumbnail/march.png"),
  4: require("../../book thumbnail/april.png"),
  5: require("../../book thumbnail/may.png"),
  6: require("../../book thumbnail/june.png"),
  7: require("../../book thumbnail/july.png"),
  8: require("../../book thumbnail/august.png"),
  9: require("../../book thumbnail/september.png"),
  10: require("../../book thumbnail/october.png"),
  11: require("../../book thumbnail/november.png"),
  12: require("../../book thumbnail/december.png"),
};

function BookletCard({ booklet, index, colors, isUnlocked, priceNaira, onUnlock, unlockingBookletId }: any) {
  const coverSource = bookletCovers[booklet.month];
  const isUnlocking = unlockingBookletId === booklet.id;

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(index * 80)}>
      <Pressable
        onPress={() => router.push({ pathname: "/booklet/[id]", params: { id: booklet.id.toString() } })}
        style={({ pressed }) => [
          styles.bookletCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: pressed ? 0.92 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
        ]}
      >
        {!isUnlocked && <View style={styles.lockedOverlay} />}
        {coverSource ? (
          <Image source={coverSource} style={styles.bookletCoverImage} resizeMode="cover" />
        ) : (
          <View style={[styles.bookletIcon, { backgroundColor: booklet.coverColor + "20" }]}>
            <Ionicons
              name={(monthIcons[booklet.month] || "book") as any}
              size={28}
              color={booklet.coverColor}
            />
          </View>
        )}
        <View style={styles.bookletInfo}>
          <Text style={[styles.bookletMonth, { color: colors.textSecondary, fontFamily: "DMSans_500Medium" }]}>
            {monthNames[booklet.month]} {booklet.year}
          </Text>
          <Text style={[styles.bookletTitle, { color: colors.text, fontFamily: "DMSans_600SemiBold" }]}>
            {booklet.title}
          </Text>
          {booklet.description && (
            <Text
              style={[styles.bookletDesc, { color: colors.textSecondary, fontFamily: "DMSans_400Regular" }]}
              numberOfLines={2}
            >
              {booklet.description}
            </Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      </Pressable>

      {!isUnlocked && (
        <Pressable
          onPress={() => onUnlock(booklet)}
          disabled={isUnlocking}
          style={({ pressed }) => [
            styles.unlockButton,
            {
              backgroundColor: colors.tint,
              opacity: pressed || isUnlocking ? 0.85 : 1,
            },
          ]}
        >
          {isUnlocking ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="lock-closed" size={16} color="#fff" />
              <Text style={styles.unlockButtonText}>Unlock for ₦{priceNaira}</Text>
            </>
          )}
        </Pressable>
      )}
    </Animated.View>
  );
}

export default function LibraryScreen() {
  const scheme = useColorScheme();
  const colors = useThemeColors(scheme);
  const insets = useSafeAreaInsets();
  const [selectedBooklet, setSelectedBooklet] = useState<{ id: number; month: number; year: number } | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const { data: bookletList, isLoading } = useQuery<any[]>({
    queryKey: ["/api/booklets"],
  });

  const { data: accessData } = useQuery<{
    unlockedBookletIds: number[];
    previewDays: number;
    monthlyPriceNaira: number;
  }>({
    queryKey: ["/api/booklets/access"],
  });

  const verifyPurchaseMutation = useMutation({
    mutationFn: async (booklet: { id: number; month: number; year: number }) => {
      await purchaseBooklet(booklet);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/booklets/access"] });
    },
  });

  const currentMonth = new Date().getMonth() + 1;
  const unlockedSet = new Set(accessData?.unlockedBookletIds ?? []);
  const monthlyPriceNaira = accessData?.monthlyPriceNaira ?? 1500;

  const handleUnlockBooklet = (booklet: { id: number; month: number; year: number }) => {
    setSelectedBooklet(booklet);
    setShowPaymentModal(true);
  };

  const handleConfirmPayment = async () => {
    if (!selectedBooklet) {
      throw new Error("No booklet selected");
    }
    
    return new Promise<void>((resolve, reject) => {
      verifyPurchaseMutation.mutate(selectedBooklet, {
        onSuccess: () => {
          setShowPaymentModal(false);
          setSelectedBooklet(null);
          resolve();
        },
        onError: (error: any) => {
          reject(new Error(error?.message || "Could not unlock this booklet"));
        },
      });
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 16,
            paddingBottom: 120,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerSection}>
          <Image
            source={require("@/assets/images/app-logo.png")}
            style={styles.libraryHeaderLogo}
            resizeMode="contain"
          />
          <Text style={[styles.title, { color: colors.text, fontFamily: "PlayfairDisplay_700Bold" }]}>
            Library
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary, fontFamily: "DMSans_400Regular" }]}>
            Explore all monthly affirmation booklets
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.gold} />
          </View>
        ) : !bookletList || bookletList.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="book-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.text, fontFamily: "DMSans_600SemiBold" }]}>
              No booklets available yet
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary, fontFamily: "DMSans_400Regular" }]}>
              Check back soon for new content
            </Text>
          </View>
        ) : (
          <View style={styles.bookletList}>
            {bookletList
              .sort((a: any, b: any) => {
                if (a.month === currentMonth) return -1;
                if (b.month === currentMonth) return 1;
                return a.month - b.month;
              })
              .map((booklet: any, index: number) => (
                <BookletCard
                  key={booklet.id}
                  booklet={booklet}
                  index={index}
                  colors={colors}
                  isUnlocked={unlockedSet.has(booklet.id)}
                  priceNaira={monthlyPriceNaira}
                  onUnlock={handleUnlockBooklet}
                  unlockingBookletId={verifyPurchaseMutation.variables?.id}
                />
              ))}
          </View>
        )}
      </ScrollView>

      <PaymentDetailsModal
        visible={showPaymentModal}
        bookletTitle={selectedBooklet ? `${monthNames[selectedBooklet.month]} ${selectedBooklet.year}` : ""}
        amount={monthlyPriceNaira}
        onConfirmPayment={handleConfirmPayment}
        onCancel={() => {
          setShowPaymentModal(false);
          setSelectedBooklet(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  headerSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  libraryHeaderLogo: {
    width: 264,
    height: 264,
    borderRadius: 24,
    marginBottom: 12,
  },
  title: { fontSize: 32, lineHeight: 38, marginBottom: 4 },
  subtitle: { fontSize: 15, marginBottom: 28 },
  loadingContainer: { paddingVertical: 60, alignItems: "center" },
  emptyState: {
    borderRadius: 20,
    padding: 40,
    alignItems: "center",
    borderWidth: 1,
    gap: 12,
  },
  emptyText: { fontSize: 18 },
  emptySubtext: { fontSize: 14, textAlign: "center" },
  bookletList: { gap: 12 },
  bookletCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
    position: "relative",
  },
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(9, 22, 43, 0.42)",
    borderRadius: 16,
  },
  unlockButton: {
    marginTop: 8,
    height: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  unlockButtonText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "DMSans_700Bold",
  },
  bookletIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  bookletCoverImage: {
    width: 56,
    height: 56,
    borderRadius: 14,
  },
  bookletInfo: { flex: 1 },
  bookletMonth: { fontSize: 12, textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 2 },
  bookletTitle: { fontSize: 16, marginBottom: 4 },
  bookletDesc: { fontSize: 13, lineHeight: 18 },
});
