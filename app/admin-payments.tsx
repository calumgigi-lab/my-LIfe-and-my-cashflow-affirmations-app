import React, { useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Text,
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

interface Payment {
  id: number;
  userId: number;
  bookletId: number;
  userName: string;
  userEmail: string;
  bookletTitle: string;
  bookletMonth: string;
  bookletYear: number;
  platform: string;
  productId: string;
  transactionId: string;
  amountNaira: number;
  status: "pending" | "approved" | "rejected";
  approvedBy: number | null;
  approvedAt: string | null;
  createdAt: string;
}

interface PaymentStats {
  totalPayments: number;
  pending: number;
  approved: number;
  rejected: number;
  totalAmountNaira: number;
  approvedAmountNaira: number;
  uniqueUsers: number;
  paymentsByStatus: {
    pending: number;
    approved: number;
    rejected: number;
  };
}

export default function AdminPaymentsPanel() {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  const insets = useSafeAreaInsets();

  // Redirect non-admin users on auth state change
  React.useEffect(() => {
    if (!authLoading && (!user || !user.isAdmin)) {
      router.replace("/");
    }
  }, [user, authLoading]);

  const [filterStatus, setFilterStatus] = useState<"pending" | "approved" | "rejected" | "all">(
    "pending",
  );
  const [refreshing, setRefreshing] = useState(false);
  const [expandedPaymentId, setExpandedPaymentId] = useState<number | null>(null);
  const [approvalReason, setApprovalReason] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  // Fetch payment statistics
  const { data: stats } = useQuery({
    queryKey: ["payment-stats"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/analytics/payments");
      return (await res.json()) as PaymentStats;
    },
  });

  // Fetch payments with filters
  const { data: paymentsData, isLoading } = useQuery({
    queryKey: ["payments", filterStatus],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterStatus !== "all") {
        params.append("status", filterStatus);
      }
      const res = await apiRequest("GET", `/api/admin/payments?${params.toString()}`);
      return (await res.json()) as { payments: Payment[]; summary: any };
    },
  });

  // Approve payment mutation
  const approveMutation = useMutation({
    mutationFn: async (paymentId: number) => {
      const res = await apiRequest("POST", `/api/admin/payments/${paymentId}/approve`, {
        reason: approvalReason || "Approved by admin",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["payment-stats"] });
      Alert.alert("Success", "Payment approved!");
      setApprovalReason("");
      setExpandedPaymentId(null);
    },
    onError: () => {
      Alert.alert("Error", "Failed to approve payment");
    },
  });

  // Reject payment mutation
  const rejectMutation = useMutation({
    mutationFn: async (paymentId: number) => {
      const res = await apiRequest("POST", `/api/admin/payments/${paymentId}/reject`, {
        reason: rejectionReason || "Rejected by admin",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["payment-stats"] });
      Alert.alert("Success", "Payment rejected!");
      setRejectionReason("");
      setExpandedPaymentId(null);
    },
    onError: () => {
      Alert.alert("Error", "Failed to reject payment");
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.refetchQueries({ queryKey: ["payments", filterStatus] });
    await queryClient.refetchQueries({ queryKey: ["payment-stats"] });
    setRefreshing(false);
  };

  const payments = paymentsData?.payments || [];

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "#FF9800";
      case "approved":
        return "#4CAF50";
      case "rejected":
        return "#F44336";
      default:
        return colors.text;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {/* Header */}
        <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 16, marginBottom: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Ionicons name="card" size={28} color={colors.text} />
            <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.text }}>
              Payment Management
            </Text>
          </View>
        </View>

        {/* Statistics Cards */}
        {stats && (
          <View style={{ marginBottom: 20 }}>
            <View
              style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 12 }}
            >
              <View
                style={{
                  flex: 1,
                  minWidth: 160,
                  backgroundColor: "#FF9800",
                  padding: 12,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: "white", fontSize: 12, opacity: 0.9 }}>Pending</Text>
                <Text style={{ color: "white", fontSize: 20, fontWeight: "bold" }}>
                  {stats.pending}
                </Text>
              </View>

              <View
                style={{
                  flex: 1,
                  minWidth: 160,
                  backgroundColor: "#4CAF50",
                  padding: 12,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: "white", fontSize: 12, opacity: 0.9 }}>Approved</Text>
                <Text style={{ color: "white", fontSize: 20, fontWeight: "bold" }}>
                  {stats.approved}
                </Text>
              </View>

              <View
                style={{
                  flex: 1,
                  minWidth: 160,
                  backgroundColor: "#2196F3",
                  padding: 12,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: "white", fontSize: 12, opacity: 0.9 }}>Total Users</Text>
                <Text style={{ color: "white", fontSize: 20, fontWeight: "bold" }}>
                  {stats.uniqueUsers}
                </Text>
              </View>
            </View>

            <View
              style={{
                backgroundColor: colors.surface || "#1A436F",
                padding: 12,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: colors.text, fontSize: 12, opacity: 0.8, marginBottom: 4 }}>
                Total Approved Amount
              </Text>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: "bold" }}>
                ₦{(stats.approvedAmountNaira || 0).toLocaleString()}
              </Text>
            </View>
          </View>
        )}

        {/* Filter Tabs */}
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
          {(["all", "pending", "approved", "rejected"] as const).map((status) => (
            <TouchableOpacity
              key={status}
              onPress={() => setFilterStatus(status)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor:
                  filterStatus === status
                    ? colors.tint || "#9EC9FF"
                    : colors.surface || "#1A436F",
              }}
            >
              <Text
                style={{
                  color: filterStatus === status ? "white" : colors.text,
                  fontSize: 12,
                  fontWeight: "500",
                  textTransform: "capitalize",
                }}
              >
                {status}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Loading State */}
        {isLoading && (
          <View style={{ alignItems: "center", paddingVertical: 40 }}>
            <ActivityIndicator size="large" color={colors.tint || "#9EC9FF"} />
          </View>
        )}

        {/* Payments List */}
        {!isLoading && payments.length === 0 && (
          <View style={{ alignItems: "center", paddingVertical: 40 }}>
            <Text style={{ color: colors.text, opacity: 0.6, fontSize: 14 }}>
              No {filterStatus === "all" ? "payments" : `${filterStatus} payments`} found
            </Text>
          </View>
        )}

        {!isLoading &&
          payments.map((payment) => (
            <View
              key={payment.id}
              style={{
                backgroundColor: colors.surface || "#1A436F",
                borderRadius: 8,
                marginBottom: 12,
                overflow: "hidden",
                borderLeftWidth: 4,
                borderLeftColor: getStatusColor(payment.status),
              }}
            >
              <TouchableOpacity
                onPress={() =>
                  setExpandedPaymentId(expandedPaymentId === payment.id ? null : payment.id)
                }
                style={{ padding: 12 }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: "600", marginBottom: 4 }}>
                      {payment.userName}
                    </Text>
                    <Text style={{ color: colors.text, opacity: 0.7, fontSize: 12, marginBottom: 4 }}>
                      {payment.userEmail}
                    </Text>
                    <Text style={{ color: colors.text, opacity: 0.6, fontSize: 12 }}>
                      {payment.bookletTitle} • ₦{payment.amountNaira.toLocaleString()}
                    </Text>
                  </View>

                  <View>
                    <Text
                      style={{
                        color: "white",
                        backgroundColor: getStatusColor(payment.status),
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 12,
                        fontSize: 11,
                        fontWeight: "600",
                        textAlign: "center",
                        textTransform: "uppercase",
                      }}
                    >
                      {payment.status}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Expanded Details */}
              {expandedPaymentId === payment.id && (
                <View style={{ backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.text + "20", padding: 12 }}>
                  {/* Payment Details */}
                  <View style={{ marginBottom: 12 }}>
                    <DetailRow label="Transaction ID" value={payment.transactionId} />
                    <DetailRow label="Platform" value={payment.platform.toUpperCase()} />
                    <DetailRow label="Product ID" value={payment.productId} />
                    <DetailRow label="Recorded" value={formatDate(payment.createdAt)} />
                    {payment.approvedAt && (
                      <DetailRow label="Approved" value={formatDate(payment.approvedAt)} />
                    )}
                  </View>

                  {/* Action Buttons for Pending Payments */}
                  {payment.status === "pending" && (
                    <View>
                      {/* Approve Section */}
                      <View style={{ marginBottom: 12 }}>
                        <Text
                          style={{
                            color: colors.text,
                            fontSize: 12,
                            fontWeight: "600",
                            marginBottom: 6,
                          }}
                        >
                          Approval Reason (optional):
                        </Text>
                        <TextInput
                          style={{
                            backgroundColor: colors.inputBg || "#235487",
                            borderRadius: 6,
                            padding: 10,
                            color: colors.text,
                            fontSize: 12,
                            marginBottom: 8,
                            borderWidth: 1,
                            borderColor: colors.border || "#4876A8",
                          }}
                          placeholder="Enter reason..."
                          placeholderTextColor={colors.textSecondary + "80"}
                          value={approvalReason}
                          onChangeText={setApprovalReason}
                          editable={!approveMutation.isPending}
                        />
                        <TouchableOpacity
                          onPress={() => approveMutation.mutate(payment.id)}
                          disabled={approveMutation.isPending}
                          style={{
                            backgroundColor: "#4CAF50",
                            padding: 10,
                            borderRadius: 6,
                            alignItems: "center",
                          }}
                        >
                          {approveMutation.isPending ? (
                            <ActivityIndicator size="small" color="white" />
                          ) : (
                            <Text style={{ color: "white", fontWeight: "600", fontSize: 12 }}>
                              ✓ Approve Payment
                            </Text>
                          )}
                        </TouchableOpacity>
                      </View>

                      {/* Reject Section */}
                      <View>
                        <Text
                          style={{
                            color: colors.text,
                            fontSize: 12,
                            fontWeight: "600",
                            marginBottom: 6,
                          }}
                        >
                          Rejection Reason (optional):
                        </Text>
                        <TextInput
                          style={{
                            backgroundColor: colors.inputBg || "#235487",
                            borderRadius: 6,
                            padding: 10,
                            color: colors.text,
                            fontSize: 12,
                            marginBottom: 8,
                            borderWidth: 1,
                            borderColor: colors.border || "#4876A8",
                          }}
                          placeholder="Enter reason..."
                          placeholderTextColor={colors.textSecondary + "80"}
                          value={rejectionReason}
                          onChangeText={setRejectionReason}
                          editable={!rejectMutation.isPending}
                        />
                        <TouchableOpacity
                          onPress={() => rejectMutation.mutate(payment.id)}
                          disabled={rejectMutation.isPending}
                          style={{
                            backgroundColor: "#F44336",
                            padding: 10,
                            borderRadius: 6,
                            alignItems: "center",
                          }}
                        >
                          {rejectMutation.isPending ? (
                            <ActivityIndicator size="small" color="white" />
                          ) : (
                            <Text style={{ color: "white", fontWeight: "600", fontSize: 12 }}>
                              ✕ Reject Payment
                            </Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* Status Badge for Processed Payments */}
                  {payment.status !== "pending" && (
                    <View
                      style={{
                        backgroundColor: getStatusColor(payment.status) + "20",
                        padding: 10,
                        borderRadius: 6,
                        borderLeftWidth: 3,
                        borderLeftColor: getStatusColor(payment.status),
                      }}
                    >
                      <Text
                        style={{
                          color: getStatusColor(payment.status),
                          fontSize: 12,
                          fontWeight: "600",
                          textTransform: "uppercase",
                        }}
                      >
                        {payment.status === "approved" ? "✓ Approved" : "✕ Rejected"}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          ))}

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

// Helper component for detail rows
function DetailRow({ label, value }: { label: string; value: string }) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={{ color: colors.text, opacity: 0.7, fontSize: 11, marginBottom: 2 }}>
        {label}
      </Text>
      <Text
        style={{
          color: colors.text,
          fontSize: 12,
          fontFamily: "monospace",
          backgroundColor: colors.surface || "#1A436F",
          padding: 8,
          borderRadius: 4,
          borderLeftWidth: 2,
          borderLeftColor: colors.tint,
        }}
      >
        {value}
      </Text>
    </View>
  );
}
