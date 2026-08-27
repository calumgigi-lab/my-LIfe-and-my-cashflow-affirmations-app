import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, Text, useColorScheme } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useThemeColors } from "@/constants/colors";
import { apiRequest, queryClient } from "@/lib/query-client";
import { invalidateQueryKeys } from "@/lib/screen-refresh";

export default function PaymentCompleteScreen() {
  const scheme = useColorScheme();
  const colors = useThemeColors(scheme);
  const params = useLocalSearchParams<{ reference?: string; status?: string; bookletId?: string; userId?: string }>();
  const [message, setMessage] = useState("Confirming your payment…");

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
        if (params.reference) {
          for (let attempt = 0; attempt < 8; attempt += 1) {
            if (attempt > 0) {
              await new Promise((resolve) => setTimeout(resolve, 2000));
            }
            const syncRes = await apiRequest("POST", "/api/payments/flutterwave/sync", {
              reference: params.reference,
              bookletId: params.bookletId ? parseInt(String(params.bookletId), 10) : undefined,
            });
            if (syncRes.ok) break;
          }
        }
        await invalidateQueryKeys(queryClient, [
          ["/api/booklets/access"],
          ["/api/booklets"],
          ["/api/rewards/balance"],
        ]);
        if (!active) return;
        setMessage(
          params.status === "success"
            ? "Booklet unlocked!"
            : params.reference
              ? "Payment received — pull down on Library to refresh."
              : "Library updated.",
        );
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
  }, [params.reference, params.status, params.bookletId]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background, padding: 24 }}>
      <ActivityIndicator size="large" color={colors.gold} />
      <Text style={{ marginTop: 16, color: colors.text, fontFamily: "DMSans_500Medium" }}>{message}</Text>
    </View>
  );
}
