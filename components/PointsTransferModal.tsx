import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  useColorScheme,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors } from "@/constants/colors";
import { apiRequest, queryClient } from "@/lib/query-client";

interface Props {
  visible: boolean;
  currentBalance: number;
  onClose: () => void;
}

export default function PointsTransferModal({ visible, currentBalance, onClose }: Props) {
  const scheme = useColorScheme();
  const colors = useThemeColors(scheme);
  const insets = useSafeAreaInsets();

  const [recipient, setRecipient] = useState("");
  const [points, setPoints] = useState("");
  const [note, setNote] = useState("");

  const transferMutation = useMutation({
    mutationFn: async () => {
      const pts = parseInt(points);
      if (!recipient.trim()) throw new Error("Enter a username or email");
      if (!pts || pts < 1) throw new Error("Enter a valid point amount");
      if (pts > currentBalance) throw new Error(`You only have ${currentBalance} pts`);
      const res = await apiRequest("POST", "/api/rewards/transfer", {
        recipient: recipient.trim(),
        points: pts,
        note: note.trim() || undefined,
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/rewards/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rewards/history"] });
      setRecipient("");
      setPoints("");
      setNote("");
      onClose();
      Alert.alert(
        "Transfer Successful! 🎉",
        `${data.transferred} pts sent to @${data.recipient.username}.\nYour new balance: ${data.newBalance} pts`,
      );
    },
    onError: (err: any) => {
      Alert.alert("Transfer Failed", err?.message || "Something went wrong");
    },
  });

  function handleClose() {
    setRecipient("");
    setPoints("");
    setNote("");
    transferMutation.reset();
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.overlay}>
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.background,
                paddingBottom: insets.bottom + 16,
                borderColor: colors.border,
              },
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={[styles.iconBg, { backgroundColor: colors.gold + "20" }]}>
                <Ionicons name="swap-horizontal" size={22} color={colors.gold} />
              </View>
              <Text style={[styles.title, { color: colors.text, fontFamily: "PlayfairDisplay_700Bold" }]}>
                Transfer Points
              </Text>
              <Pressable onPress={handleClose} hitSlop={12}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>

            {/* Balance pill */}
            <View style={[styles.balancePill, { backgroundColor: colors.gold + "15", borderColor: colors.gold + "30" }]}>
              <Ionicons name="star" size={14} color={colors.gold} />
              <Text style={[styles.balanceText, { color: colors.gold, fontFamily: "DMSans_600SemiBold" }]}>
                Available: {currentBalance} pts
              </Text>
            </View>

            {/* Recipient */}
            <Text style={[styles.label, { color: colors.textSecondary, fontFamily: "DMSans_500Medium" }]}>
              Recipient (username or email)
            </Text>
            <View style={[styles.inputRow, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
              <TextInput
                style={[styles.input, { color: colors.text, fontFamily: "DMSans_400Regular" }]}
                placeholder="@username or email"
                placeholderTextColor={colors.textSecondary}
                value={recipient}
                onChangeText={setRecipient}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Points */}
            <Text style={[styles.label, { color: colors.textSecondary, fontFamily: "DMSans_500Medium" }]}>
              Points to send
            </Text>
            <View style={[styles.inputRow, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <Ionicons name="star-outline" size={18} color={colors.textSecondary} />
              <TextInput
                style={[styles.input, { color: colors.text, fontFamily: "DMSans_400Regular" }]}
                placeholder="e.g. 100"
                placeholderTextColor={colors.textSecondary}
                value={points}
                onChangeText={setPoints}
                keyboardType="number-pad"
              />
            </View>

            {/* Note (optional) */}
            <Text style={[styles.label, { color: colors.textSecondary, fontFamily: "DMSans_500Medium" }]}>
              Note (optional)
            </Text>
            <View style={[styles.inputRow, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <Ionicons name="chatbubble-outline" size={18} color={colors.textSecondary} />
              <TextInput
                style={[styles.input, { color: colors.text, fontFamily: "DMSans_400Regular" }]}
                placeholder="Add a message..."
                placeholderTextColor={colors.textSecondary}
                value={note}
                onChangeText={setNote}
              />
            </View>

            {/* Send button */}
            <Pressable
              onPress={() => transferMutation.mutate()}
              disabled={transferMutation.isPending}
              style={({ pressed }) => [
                styles.sendBtn,
                { backgroundColor: colors.gold, opacity: pressed || transferMutation.isPending ? 0.8 : 1 },
              ]}
            >
              {transferMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="send" size={18} color="#fff" />
                  <Text style={[styles.sendBtnText, { fontFamily: "DMSans_700Bold" }]}>Send Points</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    padding: 24,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
  },
  iconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { flex: 1, fontSize: 20 },
  balancePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 4,
  },
  balanceText: { fontSize: 13 },
  label: { fontSize: 12, marginBottom: -4 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 50,
  },
  input: { flex: 1, fontSize: 15 },
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 54,
    borderRadius: 16,
    marginTop: 8,
  },
  sendBtnText: { color: "#fff", fontSize: 16 },
});
