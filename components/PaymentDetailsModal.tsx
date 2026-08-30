import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  useColorScheme,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiRequest, queryClient } from "@/lib/query-client";
import Colors from "@/constants/colors";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useTranslation } from "react-i18next";
import ConfettiCannon from "react-native-confetti-cannon";

type PaymentProvider = "flutterwave" | "bank_transfer";

interface PaymentDetailsModalProps {
  visible: boolean;
  bookletTitle: string;
  amount: number;
  paymentProvider?: PaymentProvider;
  onConfirmPayment: () => Promise<void>;
  onCancel: () => void;
  bookletId?: number;
}

const PAYMENT_ACCOUNT = {
  bankName: "United Bank for Africa",
  bankShort: "UBA",
  accountName: "zionlife world my life and my cash flow affirmation",
  accountNumber: "2335421208",
  bankCode: "033",
};

export function PaymentDetailsModal({
  visible,
  bookletTitle,
  amount,
  paymentProvider = "flutterwave",
  onConfirmPayment,
  onCancel,
  bookletId,
}: PaymentDetailsModalProps) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const [isLoading, setIsLoading] = useState(false);
  const [paymentPending, setPaymentPending] = useState(false);
  const [pendingTxRef, setPendingTxRef] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const confettiRef = useRef<any>(null);
  const router = useRouter();

  const checkPaymentStatus = useCallback(async (txRef: string) => {
    try {
      const syncRes = await apiRequest("POST", "/api/payments/flutterwave/sync", {
        reference: txRef,
        bookletId: bookletId,
      });
      if (syncRes.ok) {
        const syncData = await syncRes.json();
        return syncData;
      }
    } catch (e) {
      console.log("Sync check failed:", e);
    }
    return null;
  }, [bookletId]);

  const handlePaymentReturn = useCallback(async (txRef: string) => {
    setPaymentPending(false);
    setPendingTxRef(null);
    const result = await checkPaymentStatus(txRef);
    if (result?.status === "success") {
      queryClient.invalidateQueries({ queryKey: ["/api/booklets/access"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      if (bookletId) {
        queryClient.invalidateQueries({ queryKey: ["/api/booklets", bookletId, "access"] });
      }
      setPaymentSuccess(true);
      setTimeout(() => {
        setPaymentSuccess(false);
        onCancel();
        if (bookletId) {
          router.push(`/booklet/${bookletId}`);
        } else {
          router.push("/(main)/library");
        }
      }, 3500);
    } else {
      Alert.alert("Payment Status", "Return to Library and pull down to refresh.");
      onCancel();
    }
  }, [checkPaymentStatus, onCancel, router, bookletId]);

  useEffect(() => {
    if (!paymentPending || !pendingTxRef) return;

    const handleDeepLink = (event: { url: string }) => {
      if (event.url.includes("payment-complete")) {
        handlePaymentReturn(pendingTxRef);
      }
    };

    const linkingSubscription = Linking.addEventListener("url", handleDeepLink);

    return () => {
      linkingSubscription.remove();
    };
  }, [paymentPending, pendingTxRef, handlePaymentReturn]);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      if (paymentProvider === "flutterwave") {
        await handleFlutterwavePay();
      } else {
        await onConfirmPayment();
      }
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to process payment",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleFlutterwavePay = async () => {
    try {
      const res = await apiRequest("POST", "/api/payments/flutterwave/initialize", {
        bookletId: bookletId,
        amount: amount,
        email: "user@globalaffirmationhub.com",
        name: "User",
      });
      const data = await res.json();
      if (data.checkoutUrl && data.txRef) {
        setPendingTxRef(data.txRef);
        setPaymentPending(true);
        const result = await WebBrowser.openBrowserAsync(data.checkoutUrl);
        if (result.type === "cancel" || result.type === "dismiss") {
          handlePaymentReturn(data.txRef);
        }
      } else {
        throw new Error(data.error || "Failed to create payment link");
      }
    } catch (error) {
      throw error;
    }
  };

  if (paymentProvider === "flutterwave") {
    if (paymentSuccess) {
      return (
        <Modal visible={visible} transparent={true} animationType="fade">
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.6)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <ConfettiCannon
              ref={confettiRef}
              count={200}
              origin={{ x: Dimensions.get("window").width / 2, y: -20 }}
              colors={[colors.gold, "#FFD700", "#FFA500", "#FF6347", "#4CAF50", "#2196F3"]}
              fallSpeed={3000}
              duration={4000}
              animationDuration={3000}
              autoStart={true}
            />
            <View
              style={{
                backgroundColor: colors.background,
                borderRadius: 24,
                padding: 40,
                width: "80%",
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: colors.gold + "20",
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: 20,
                }}
              >
                <Ionicons name="checkmark-circle" size={50} color={colors.gold} />
              </View>
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "700",
                  color: colors.text,
                  textAlign: "center",
                  marginBottom: 8,
                }}
              >
                Payment Successful!
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: colors.text,
                  opacity: 0.6,
                  textAlign: "center",
                  lineHeight: 20,
                }}
              >
                Your booklet is now unlocked.{"\n"}Enjoy your affirmations!
              </Text>
            </View>
          </View>
        </Modal>
      );
    }

    if (paymentPending) {
      return (
        <Modal visible={visible} transparent={true} animationType="fade">
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.6)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <View
              style={{
                backgroundColor: colors.background,
                borderRadius: 24,
                padding: 32,
                width: "80%",
                alignItems: "center",
              }}
            >
              <ActivityIndicator size="large" color={colors.gold} />
              <Text
                style={{
                  marginTop: 20,
                  fontSize: 18,
                  fontWeight: "700",
                  color: colors.text,
                  textAlign: "center",
                }}
              >
                Payment in Progress
              </Text>
              <Text
                style={{
                  marginTop: 8,
                  fontSize: 14,
                  color: colors.text,
                  opacity: 0.6,
                  textAlign: "center",
                  lineHeight: 20,
                }}
              >
                Complete your payment in the browser.{"\n"}We'll detect it automatically.
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setPaymentPending(false);
                  setPendingTxRef(null);
                  onCancel();
                }}
                style={{
                  marginTop: 24,
                  paddingVertical: 12,
                  paddingHorizontal: 24,
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor: colors.text + "20",
                }}
              >
                <Text
                  style={{
                    color: colors.text,
                    fontWeight: "600",
                    fontSize: 14,
                  }}
                >
                  Cancel Payment
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      );
    }

    return (
      <Modal visible={visible} transparent={true} animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: colors.background,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              maxHeight: "90%",
              paddingBottom: 32,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 24,
              }}
            >
              <View>
                <Text style={{ fontSize: 24, fontWeight: "700", color: colors.text }}>
                  Complete Payment
                </Text>
                <Text style={{ color: colors.text, opacity: 0.6, fontSize: 13, marginTop: 2 }}>
                  {bookletTitle}
                </Text>
              </View>
              <TouchableOpacity onPress={onCancel} disabled={isLoading} hitSlop={8}>
                <Ionicons name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View
              style={{
                backgroundColor: colors.gold + "15",
                borderRadius: 16,
                padding: 20,
                marginBottom: 24,
                alignItems: "center",
                borderWidth: 1,
                borderColor: colors.gold + "30",
              }}
            >
              <Text style={{ color: colors.text, opacity: 0.7, fontSize: 13, marginBottom: 8 }}>
                Amount
              </Text>
              <Text
                style={{
                  color: colors.gold,
                  fontSize: 36,
                  fontWeight: "700",
                  fontFamily: "DMSans_700Bold",
                }}
              >
                ₦{amount.toLocaleString()}
              </Text>
            </View>

            <View
              style={{
                backgroundColor: colors.gold + "10",
                borderRadius: 12,
                padding: 16,
                marginBottom: 24,
                borderLeftWidth: 4,
                borderLeftColor: colors.gold,
              }}
            >
              <Text style={{ color: colors.text, fontSize: 13, lineHeight: 20, opacity: 0.8 }}>
                You will be redirected to secure checkout to complete your payment via card, bank transfer, or USSD.
              </Text>
            </View>

            <View
              style={{
                flexDirection: "row",
                gap: 12,
                marginTop: 20,
              }}
            >
              <TouchableOpacity
                onPress={onCancel}
                disabled={isLoading}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor: colors.text + "20",
                }}
              >
                <Text
                  style={{
                    color: colors.text,
                    fontWeight: "600",
                    fontSize: 14,
                    textAlign: "center",
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleConfirm}
                disabled={isLoading}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 12,
                  backgroundColor: colors.gold,
                  opacity: isLoading ? 0.7 : 1,
                }}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={colors.background} />
                ) : (
                  <Text
                    style={{
                      color: colors.background,
                      fontWeight: "700",
                      fontSize: 14,
                      textAlign: "center",
                    }}
                  >
                    Pay to Unlock
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent={true} animationType="fade">
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.6)",
          justifyContent: "flex-end",
        }}
      >
        <View
          style={{
            backgroundColor: colors.background,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 24,
            maxHeight: "90%",
            paddingBottom: 32,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 24,
            }}
          >
            <View>
              <Text style={{ fontSize: 24, fontWeight: "700", color: colors.text }}>
                Send Payment
              </Text>
              <Text style={{ color: colors.text, opacity: 0.6, fontSize: 13, marginTop: 2 }}>
                {bookletTitle}
              </Text>
            </View>
            <TouchableOpacity onPress={onCancel} disabled={isLoading} hitSlop={8}>
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View
              style={{
                backgroundColor: colors.gold + "15",
                borderRadius: 16,
                padding: 20,
                marginBottom: 24,
                alignItems: "center",
                borderWidth: 1,
                borderColor: colors.gold + "30",
              }}
            >
              <Text style={{ color: colors.text, opacity: 0.7, fontSize: 13, marginBottom: 8 }}>
                Amount to Transfer
              </Text>
              <Text
                style={{
                  color: colors.gold,
                  fontSize: 36,
                  fontWeight: "700",
                  fontFamily: "DMSans_700Bold",
                }}
              >
                ₦{amount.toLocaleString()}
              </Text>
            </View>

            <Text
              style={{
                color: colors.text,
                fontSize: 13,
                fontWeight: "600",
                marginBottom: 12,
                opacity: 0.8,
              }}
            >
              Bank Details
            </Text>

            <View style={{ marginBottom: 16, gap: 12 }}>
              <View
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ color: colors.text, opacity: 0.6, fontSize: 12, marginBottom: 6 }}>
                  Bank
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: 15,
                        fontWeight: "600",
                      }}
                    >
                      {PAYMENT_ACCOUNT.bankName}
                    </Text>
                    <Text style={{ color: colors.text, opacity: 0.5, fontSize: 12, marginTop: 2 }}>
                      {PAYMENT_ACCOUNT.bankShort} • Code: {PAYMENT_ACCOUNT.bankCode}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() =>
                      copyToClipboard(
                        `${PAYMENT_ACCOUNT.bankName} (${PAYMENT_ACCOUNT.bankCode})`,
                      )
                    }
                    style={{ padding: 8 }}
                  >
                    <Ionicons name="copy" size={18} color={colors.gold} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={{ marginBottom: 16 }}>
              <View
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ color: colors.text, opacity: 0.6, fontSize: 12, marginBottom: 6 }}>
                  Account Number
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 18,
                      fontWeight: "700",
                      fontFamily: "monospace",
                      letterSpacing: 1,
                      flex: 1,
                    }}
                  >
                    {PAYMENT_ACCOUNT.accountNumber}
                  </Text>
                  <TouchableOpacity
                    onPress={() => copyToClipboard(PAYMENT_ACCOUNT.accountNumber)}
                    style={{ padding: 8 }}
                  >
                    <Ionicons name="copy" size={18} color={colors.gold} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={{ marginBottom: 24 }}>
              <View
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ color: colors.text, opacity: 0.6, fontSize: 12, marginBottom: 6 }}>
                  Account Name
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 14,
                      fontWeight: "600",
                      flex: 1,
                    }}
                  >
                    {PAYMENT_ACCOUNT.accountName}
                  </Text>
                  <TouchableOpacity
                    onPress={() => copyToClipboard(PAYMENT_ACCOUNT.accountName)}
                    style={{ padding: 8 }}
                  >
                    <Ionicons name="copy" size={18} color={colors.gold} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View
              style={{
                backgroundColor: colors.gold + "10",
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
                borderLeftWidth: 4,
                borderLeftColor: colors.gold,
              }}
            >
              <Text
                style={{
                  color: colors.text,
                  fontSize: 13,
                  fontWeight: "600",
                  marginBottom: 10,
                }}
              >
                Steps to Complete Payment:
              </Text>
              <Text style={{ color: colors.text, fontSize: 12, lineHeight: 20, opacity: 0.8 }}>
                1. Copy account number above{"\n"}
                2. Open your bank app{"\n"}
                3. Transfer ₦{amount.toLocaleString()}{"\n"}
                4. Tap &quot;Confirm Payment&quot; below
              </Text>
            </View>

            <View
              style={{
                backgroundColor: "#2196F320",
                borderRadius: 12,
                padding: 12,
              }}
            >
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Ionicons name="information-circle" size={16} color="#2196F3" />
                <Text style={{ color: colors.text, fontSize: 12, lineHeight: 18, flex: 1, opacity: 0.7 }}>
                  After you send the money, tap &quot;Confirm Payment&quot; and admin will verify within 24 hours.
                </Text>
              </View>
            </View>
          </ScrollView>

          <View
            style={{
              flexDirection: "row",
              gap: 12,
              marginTop: 20,
            }}
          >
            <TouchableOpacity
              onPress={onCancel}
              disabled={isLoading}
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: colors.text + "20",
              }}
            >
              <Text
                style={{
                  color: colors.text,
                  fontWeight: "600",
                  fontSize: 14,
                  textAlign: "center",
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleConfirm}
              disabled={isLoading}
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 12,
                backgroundColor: colors.gold,
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.background} />
              ) : (
                <Text
                  style={{
                    color: colors.background,
                    fontWeight: "700",
                    fontSize: 14,
                    textAlign: "center",
                  }}
                >
                  ✓ Confirm Payment
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function copyToClipboard(text: string) {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {
        console.log("Copied: " + text);
      });
    }
  } catch {
    console.log("Copied: " + text);
  }
  Alert.alert("Copied", text);
}
