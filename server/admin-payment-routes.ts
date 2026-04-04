import { Request, Response } from "express";
import { db } from "./db";
import {
  monthlyPurchases,
  paymentAuditLog,
  adminSettings,
  users,
  booklets,
} from "@shared/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";

// Middleware to check admin role
export async function requireAdmin(
  req: Request,
  res: Response,
  next: Function,
) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, req.session.userId),
  });

  if (!user || !user.isAdmin) {
    return res.status(403).json({ message: "Admin access required" });
  }

  next();
}

// Log payment action for audit trail
async function logPaymentAction(
  paymentId: number,
  userId: number,
  action: string,
  details?: string,
) {
  await db.insert(paymentAuditLog).values({
    paymentId,
    userId,
    action,
    details,
  });
}

// Get all payments with filters
export async function getAllPayments(req: Request, res: Response) {
  try {
    const status = req.query.status as string | undefined;
    const userId = req.query.userId as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    let query = db
      .select({
        id: monthlyPurchases.id,
        userId: monthlyPurchases.userId,
        bookletId: monthlyPurchases.bookletId,
        userName: users.displayName,
        userEmail: users.email,
        bookletTitle: booklets.title,
        bookletMonth: booklets.month,
        bookletYear: booklets.year,
        platform: monthlyPurchases.platform,
        productId: monthlyPurchases.productId,
        transactionId: monthlyPurchases.transactionId,
        amountNaira: monthlyPurchases.amountNaira,
        status: monthlyPurchases.status,
        approvedBy: monthlyPurchases.approvedBy,
        approvedAt: monthlyPurchases.approvedAt,
        createdAt: monthlyPurchases.createdAt,
      })
      .from(monthlyPurchases)
      .leftJoin(users, eq(monthlyPurchases.userId, users.id))
      .leftJoin(booklets, eq(monthlyPurchases.bookletId, booklets.id))
      .orderBy(desc(monthlyPurchases.createdAt));

    // Apply filters
    const filters: any[] = [];
    if (status) filters.push(eq(monthlyPurchases.status, status));
    if (userId) filters.push(eq(monthlyPurchases.userId, parseInt(userId)));
    if (startDate) {
      filters.push(
        gte(monthlyPurchases.createdAt, new Date(startDate)),
      );
    }
    if (endDate) {
      filters.push(
        lte(monthlyPurchases.createdAt, new Date(endDate)),
      );
    }

    let results = await query;
    
    // Apply client-side filtering after query if needed
    if (filters.length > 0) {
      results = await db
        .select({
          id: monthlyPurchases.id,
          userId: monthlyPurchases.userId,
          bookletId: monthlyPurchases.bookletId,
          userName: users.displayName,
          userEmail: users.email,
          bookletTitle: booklets.title,
          bookletMonth: booklets.month,
          bookletYear: booklets.year,
          platform: monthlyPurchases.platform,
          productId: monthlyPurchases.productId,
          transactionId: monthlyPurchases.transactionId,
          amountNaira: monthlyPurchases.amountNaira,
          status: monthlyPurchases.status,
          approvedBy: monthlyPurchases.approvedBy,
          approvedAt: monthlyPurchases.approvedAt,
          createdAt: monthlyPurchases.createdAt,
        })
        .from(monthlyPurchases)
        .leftJoin(users, eq(monthlyPurchases.userId, users.id))
        .leftJoin(booklets, eq(monthlyPurchases.bookletId, booklets.id))
        .where(and(...filters))
        .orderBy(desc(monthlyPurchases.createdAt));
    }

    // Calculate summary stats
    const summary = {
      totalCount: results.length,
      pendingCount: results.filter((r: any) => r.status === "pending").length,
      approvedCount: results.filter((r: any) => r.status === "approved").length,
      rejectedCount: results.filter((r: any) => r.status === "rejected").length,
      totalAmountNaira: results.reduce(
        (sum: number, r: any) => sum + (r.amountNaira || 0),
        0,
      ),
    };

    res.json({
      payments: results,
      summary,
    });
  } catch (error) {
    console.error("Get all payments error:", error);
    res.status(500).json({ message: "Failed to fetch payments" });
  }
}

// Get payment details with audit log
export async function getPaymentDetails(req: Request, res: Response) {
  try {
    const paymentId = parseInt(req.params.id as string);

    const payment = await db.query.monthlyPurchases.findFirst({
      where: eq(monthlyPurchases.id, paymentId),
      with: {
        user: true,
        booklet: true,
        auditLogs: {
          orderBy: [desc(paymentAuditLog.createdAt)],
          with: {
            user: {
              columns: {
                id: true,
                displayName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    res.json(payment);
  } catch (error) {
    console.error("Get payment details error:", error);
    res.status(500).json({ message: "Failed to fetch payment details" });
  }
}

// Approve a payment
export async function approvePayment(req: Request, res: Response) {
  try {
    const paymentId = parseInt(req.params.id as string);
    const adminUserId = req.session.userId!;
    const reason = req.body.reason || "Approved by admin";

    const payment = await db.query.monthlyPurchases.findFirst({
      where: eq(monthlyPurchases.id, paymentId),
    });

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    if (payment.status !== "pending") {
      return res
        .status(400)
        .json({ message: `Payment is already ${payment.status}` });
    }

    // Update payment status
    await db
      .update(monthlyPurchases)
      .set({
        status: "approved",
        approvedBy: adminUserId,
        approvedAt: new Date(),
      })
      .where(eq(monthlyPurchases.id, paymentId));

    // Log the action
    await logPaymentAction(
      paymentId,
      adminUserId,
      "approved",
      reason,
    );

    const updated = await db.query.monthlyPurchases.findFirst({
      where: eq(monthlyPurchases.id, paymentId),
      with: {
        user: true,
        booklet: true,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error("Approve payment error:", error);
    res.status(500).json({ message: "Failed to approve payment" });
  }
}

// Reject a payment
export async function rejectPayment(req: Request, res: Response) {
  try {
    const paymentId = parseInt(req.params.id as string);
    const adminUserId = req.session.userId!;
    const reason = req.body.reason || "Rejected by admin";

    const payment = await db.query.monthlyPurchases.findFirst({
      where: eq(monthlyPurchases.id, paymentId),
    });

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    if (payment.status !== "pending") {
      return res
        .status(400)
        .json({ message: `Payment is already ${payment.status}` });
    }

    // Update payment status
    await db
      .update(monthlyPurchases)
      .set({
        status: "rejected",
      })
      .where(eq(monthlyPurchases.id, paymentId));

    // Log the action
    await logPaymentAction(
      paymentId,
      adminUserId,
      "rejected",
      reason,
    );

    const updated = await db.query.monthlyPurchases.findFirst({
      where: eq(monthlyPurchases.id, paymentId),
      with: {
        user: true,
        booklet: true,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error("Reject payment error:", error);
    res.status(500).json({ message: "Failed to reject payment" });
  }
}

// Get payment statistics
export async function getPaymentStats(req: Request, res: Response) {
  try {
    const allPayments = await db.query.monthlyPurchases.findMany({
      with: {
        user: true,
        booklet: true,
      },
    });

    const stats = {
      totalPayments: allPayments.length,
      pending: allPayments.filter((p) => p.status === "pending").length,
      approved: allPayments.filter((p) => p.status === "approved").length,
      rejected: allPayments.filter((p) => p.status === "rejected").length,
      totalAmountNaira: allPayments.reduce((sum, p) => sum + (p.amountNaira || 0), 0),
      approvedAmountNaira: allPayments
        .filter((p) => p.status === "approved")
        .reduce((sum, p) => sum + (p.amountNaira || 0), 0),
      uniqueUsers: new Set(allPayments.map((p) => p.userId)).size,
      paymentsByStatus: {
        pending: allPayments.filter((p) => p.status === "pending").length,
        approved: allPayments.filter((p) => p.status === "approved").length,
        rejected: allPayments.filter((p) => p.status === "rejected").length,
      },
    };

    res.json(stats);
  } catch (error) {
    console.error("Get payment stats error:", error);
    res.status(500).json({ message: "Failed to fetch payment statistics" });
  }
}

// Set payment account details (admin settings)
export async function setPaymentAccount(req: Request, res: Response) {
  try {
    const { accountName, accountNumber, bankName, bankCode } = req.body;

    if (!accountName || !accountNumber || !bankName) {
      return res
        .status(400)
        .json({
          message: "Account name, number, and bank name are required",
        });
    }

    const adminUserId = req.session.userId!;

    // Update or create settings
    const existing = await db.query.adminSettings.findFirst({
      where: eq(adminSettings.key, "payment_account"),
    });

    const accountData = {
      accountName,
      accountNumber,
      bankName,
      bankCode: bankCode || "",
    };

    if (existing) {
      await db
        .update(adminSettings)
        .set({
          value: JSON.stringify(accountData),
          updatedAt: new Date(),
        })
        .where(eq(adminSettings.key, "payment_account"));
    } else {
      await db.insert(adminSettings).values({
        key: "payment_account",
        value: JSON.stringify(accountData),
      });
    }

    // Log the action
    const payment = await db.query.monthlyPurchases.findFirst();
    if (payment) {
      await logPaymentAction(
        payment.id,
        adminUserId,
        "payment_account_updated",
        `Account updated: ${accountName}`,
      );
    }

    res.json({
      message: "Payment account updated successfully",
      account: accountData,
    });
  } catch (error) {
    console.error("Set payment account error:", error);
    res.status(500).json({ message: "Failed to set payment account" });
  }
}

// Get payment account details
export async function getPaymentAccount(req: Request, res: Response) {
  try {
    const setting = await db.query.adminSettings.findFirst({
      where: eq(adminSettings.key, "payment_account"),
    });

    if (!setting) {
      return res.json({
        accountName: "",
        accountNumber: "",
        bankName: "",
        bankCode: "",
      });
    }

    res.json(JSON.parse(setting.value || "{}"));
  } catch (error) {
    console.error("Get payment account error:", error);
    res.status(500).json({ message: "Failed to fetch payment account" });
  }
}
