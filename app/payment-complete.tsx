import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, Text, useColorScheme, StyleSheet } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useThemeColors } from "@/constants/colors";
import { apiRequest, queryClient } from "@/lib/query-client";
import { invalidateQueryKeys } from "@/lib/screen-refresh";
import ConfettiCannon from "react-native-confetti-cannon";
import { useTranslation } from "react-i18next";

export default function PaymentCompleteScreen() {
  const { t } = useTranslation();
  const scheme = useColorScheme();
  const colors = useThemeColors(scheme);
  const params = useLocalSearchParams<{ reference?: string; tx_ref?: string; status?: string; bookletId?: string; userId?: string }>();
  const reference = params.reference || params.tx_ref;
  const [message, setMessage] = useState(t("payment.confirming_payment"));
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (params.status === "cancelled") {
        if (active) setMessage("Payment was cancelled. No charge was made.");
        setTimeout(() => {
          if (active) router.replace("/(main)/library");
        }, 1500);
        return;
      }

      try {
        if (reference) {
          for (let attempt = 0; attempt < 8; attempt += 1) {
            if (attempt > 0) {
              await new Promise((resolve) => setTimeout(resolve, 2000));
            }
            try {
              const syncRes = await apiRequest("POST", "/api/payments/flutterwave/sync", {
                reference: reference,
                bookletId: params.bookletId ? parseInt(String(params.bookletId), 10) : undefined,
              });
              const syncData = await syncRes.json();
              if (syncData?.verified === true || syncData?.status === "success") {
                break;
              }
            } catch {
              // network error — keep retrying until attempts exhausted
            }
          }
        }
        const perBookletAccessKey = params.bookletId
          ? ["/api/booklets", parseInt(String(params.bookletId), 10), "access"]
          : null;
        await invalidateQueryKeys(queryClient, [
          ["/api/booklets/access"],
          ["/api/booklets"],
          ["/api/rewards/balance"],
          ["/api/stats"],
          ...(perBookletAccessKey ? [perBookletAccessKey] : []),
        ]);
        if (!active) return;
        setMessage(
          params.status === "success"
            ? "Booklet unlocked!"
            : reference
              ? "Payment received — pull down on Library to refresh."
              : "Library updated.",
        );
        if (params.status === "success") {
          setShowConfetti(true);
        }
      } catch {
        if (active) setMessage("Return to Library and pull down to refresh.");
      } finally {
        setTimeout(() => {
          if (active) router.replace("/(main)/library");
        }, 800);
      }
    })();
    return () => {
      active = false;
    };
  }, [reference, params.status, params.bookletId]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {showConfetti && (
        <ConfettiCannon
          count={200}
          origin={{ x: 200, y: 0 }}
          colors={[colors.gold, "#FFD700", "#FFA500", "#FF6347", "#4CAF50", "#2196F3"]}
          fallSpeed={3000}
          duration={4000}
          animationDuration={3000}
          onAnimationEnd={() => setShowConfetti(false)}
        />
      )}
      <ActivityIndicator size="large" color={colors.gold} />
      <Text style={[styles.message, { color: colors.text, fontFamily: "DMSans_500Medium" }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  message: {
    marginTop: 16,
    fontSize: 16,
    textAlign: "center",
  },
});
