import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  useColorScheme,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

interface PaymentDetailsModalProps {
  visible: boolean;
  bookletTitle: string;
  amount: number;
  onConfirmPayment: () => Promise<void>;
  onCancel: () => void;
}

// Organization payment account
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
  onConfirmPayment,
  onCancel,
}: PaymentDetailsModalProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirmPayment();
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to process payment",
      );
    } finally {
      setIsLoading(false);
    }
  };

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
          {/* Header */}
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
            {/* Amount Section */}
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

            {/* Bank Details Section */}
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

            {/* Bank Name & Code */}
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

            {/* Account Number */}
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

            {/* Account Name */}
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

            {/* Instructions */}
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
                4. Tap "Confirm Payment" below
              </Text>
            </View>

            {/* Info */}
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
                  After you send the money, tap "Confirm Payment" and admin will verify within 24 hours.
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
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
  // Use React Native's Share API or Clipboard API if available
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
