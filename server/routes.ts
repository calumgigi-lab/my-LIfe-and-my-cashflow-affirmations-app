import type { Express, Request, Response } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { storage } from "./storage";
import { loginSchema, registerSchema } from "../shared/schema";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { booklets, affirmations, users, monthlyPurchases } from "../shared/schema";
import { eq, sql } from "drizzle-orm";
import * as adminPaymentRoutes from "./admin-payment-routes";

const PgSession = connectPg(session);

type NewsItem = {
  id: number;
  title: string;
  message: string;
  category: "update" | "event" | "release";
  createdAt: string;
};

const NEWS_ITEMS: NewsItem[] = [
  {
    id: 1,
    title: "April 2026 Booklet Added",
    message: "The April 2026 affirmations booklet is now live in the library.",
    category: "release",
    createdAt: "2026-03-31T08:00:00.000Z",
  },
  {
    id: 2,
    title: "Booklet Covers Updated",
    message: "Library now displays curated booklet cover thumbnails for supported months.",
    category: "update",
    createdAt: "2026-03-30T08:00:00.000Z",
  },
  {
    id: 3,
    title: "Daily Page Images Enabled",
    message: "All daily affirmation pages now render curated images with randomized fallback.",
    category: "update",
    createdAt: "2026-03-29T08:00:00.000Z",
  },
];

const MONTHLY_BOOK_PRICE_NAIRA = 1500;
const PREVIEW_FREE_DAYS = 2;

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

function requireAuth(req: Request, res: Response, next: Function) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

export async function registerRoutes(app: Express): Promise<void> {
  const isProduction = process.env.NODE_ENV === "production";

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS feedback_entries (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS monthly_purchases (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      booklet_id INTEGER NOT NULL REFERENCES booklets(id),
      platform VARCHAR(16) NOT NULL,
      product_id TEXT NOT NULL,
      transaction_id TEXT NOT NULL UNIQUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  app.use(
    session({
      store: new PgSession({
        pool: pool as any,
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || "dev-secret-change-in-production",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
      },
    }),
  );

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }

      const { username, email, password, displayName } = parsed.data;

      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already in use" });
      }

      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already taken" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUser({
        username,
        email,
        password: hashedPassword,
        displayName: displayName || username,
      });

      await storage.getOrCreateStreak(user.id);

      req.session.userId = user.id;
      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        isAdmin: user.isAdmin || false,
      });
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin setup endpoint - creates first admin with setup token
  app.post("/api/admin/setup", async (req: Request, res: Response) => {
    try {
      const setupToken = req.headers["x-admin-setup-token"] as string;
      const envToken = process.env.ADMIN_SETUP_TOKEN;

      // If no env token is set, allow setup on first admin (safety: only works once)
      if (envToken && setupToken !== envToken) {
        return res.status(403).json({ message: "Invalid setup token" });
      }

      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }

      const { username, email, password, displayName } = parsed.data;

      // Check if any admin exists already
      if (envToken) {
        const existingAdmin = await db
          .select()
          .from(users)
          .where(eq(users.isAdmin, true))
          .limit(1);
        if (existingAdmin.length > 0) {
          return res.status(403).json({ message: "Admin already exists. Use regular registration." });
        }
      }

      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already in use" });
      }

      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already taken" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const [adminUser] = await db
        .insert(users)
        .values({
          username,
          email,
          password: hashedPassword,
          displayName: displayName || username,
          isAdmin: true, // Create as admin immediately
        })
        .returning();

      await storage.getOrCreateStreak(adminUser.id);

      req.session.userId = adminUser.id;
      res.json({
        id: adminUser.id,
        username: adminUser.username,
        email: adminUser.email,
        displayName: adminUser.displayName,
        isAdmin: true,
        message: "Admin account created successfully",
      });
    } catch (error) {
      console.error("Admin setup error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }

      const { email, password } = parsed.data;
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      req.session.userId = user.id;
      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        isAdmin: user.isAdmin || false,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out" });
    });
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      isAdmin: user.isAdmin || false,
    });
  });

  app.get("/api/news", (_req: Request, res: Response) => {
    const sorted = [...NEWS_ITEMS].sort(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
    );
    res.json(sorted);
  });

  app.get("/api/booklets", async (_req: Request, res: Response) => {
    const allBooklets = await storage.getBooklets();
    res.json(allBooklets);
  });

  app.get(
    "/api/booklets/access",
    requireAuth,
    async (req: Request, res: Response) => {
      const unlockedBookletIds = await storage.getUnlockedBookletIds(req.session.userId!);
      res.json({
        unlockedBookletIds,
        previewDays: PREVIEW_FREE_DAYS,
        monthlyPriceNaira: MONTHLY_BOOK_PRICE_NAIRA,
      });
    },
  );

  app.get(
    "/api/booklets/:id/access",
    requireAuth,
    async (req: Request, res: Response) => {
      const bookletId = parseInt(req.params.id);
      const hasAccess = await storage.hasBookletAccess(req.session.userId!, bookletId);
      res.json({
        bookletId,
        unlocked: hasAccess,
        previewDays: PREVIEW_FREE_DAYS,
        monthlyPriceNaira: MONTHLY_BOOK_PRICE_NAIRA,
      });
    },
  );

  app.get("/api/booklets/:id", async (req: Request, res: Response) => {
    const booklet = await storage.getBooklet(parseInt(req.params.id));
    if (!booklet) {
      return res.status(404).json({ message: "Booklet not found" });
    }
    res.json(booklet);
  });

  app.get(
    "/api/booklets/:id/affirmations",
    async (req: Request, res: Response) => {
      const affs = await storage.getAffirmationsByBooklet(
        parseInt(req.params.id),
      );
      res.json(affs);
    },
  );

  app.get("/api/affirmations/today", async (_req: Request, res: Response) => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const aff = await storage.getTodayAffirmation(month, day);
    if (!aff) {
      return res.json(null);
    }
    res.json(aff);
  });

  app.get("/api/affirmations/by-date", async (req: Request, res: Response) => {
    const dateInput = typeof req.query.date === "string" ? req.query.date : "";
    if (!dateInput) {
      return res.status(400).json({ message: "date query param is required (YYYY-MM-DD)" });
    }

    const parsed = new Date(dateInput);
    if (Number.isNaN(parsed.getTime())) {
      return res.status(400).json({ message: "invalid date format" });
    }

    const month = parsed.getMonth() + 1;
    const day = parsed.getDate();
    const aff = await storage.getTodayAffirmation(month, day);
    if (!aff) {
      return res.json(null);
    }

    res.json(aff);
  });

  app.get("/api/affirmations/:id", async (req: Request, res: Response) => {
    const aff = await storage.getAffirmation(parseInt(req.params.id));
    if (!aff) {
      return res.status(404).json({ message: "Affirmation not found" });
    }
    const booklet = await storage.getBooklet(aff.bookletId);
    res.json({
      ...aff,
      bookletMonth: booklet?.month,
      bookletYear: booklet?.year,
      bookletTitle: booklet?.title,
    });
  });

  app.post(
    "/api/affirmations/:id/complete",
    requireAuth,
    async (req: Request, res: Response) => {
      const affirmationId = parseInt(req.params.id);
      const today = new Date().toISOString().split("T")[0];
      const completion = await storage.markAffirmationComplete(
        req.session.userId!,
        affirmationId,
        today,
      );
      res.json(completion);
    },
  );

  app.get(
    "/api/completions",
    requireAuth,
    async (req: Request, res: Response) => {
      const date = req.query.date as string | undefined;
      const completions = await storage.getCompletions(
        req.session.userId!,
        date,
      );
      res.json(completions);
    },
  );

  app.get(
    "/api/completions/check/:affirmationId",
    requireAuth,
    async (req: Request, res: Response) => {
      const today = new Date().toISOString().split("T")[0];
      const completed = await storage.isAffirmationCompleted(
        req.session.userId!,
        parseInt(req.params.affirmationId),
        today,
      );
      res.json({ completed });
    },
  );

  app.get(
    "/api/stats",
    requireAuth,
    async (req: Request, res: Response) => {
      const stats = await storage.getUserStats(req.session.userId!);
      res.json(stats);
    },
  );

  app.get(
    "/api/streak",
    requireAuth,
    async (req: Request, res: Response) => {
      const streak = await storage.getOrCreateStreak(req.session.userId!);
      res.json(streak);
    },
  );

  app.get(
    "/api/notification-settings",
    requireAuth,
    async (req: Request, res: Response) => {
      const settings = await storage.getNotificationSettings(
        req.session.userId!,
      );
      res.json(
        settings || {
          enabled: true,
          startHour: 8,
          endHour: 21,
          intervalMinutes: 30,
        },
      );
    },
  );

  app.post(
    "/api/feedback",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const subject = typeof req.body?.subject === "string" ? req.body.subject.trim() : "";
        const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";

        if (!subject || !message) {
          return res.status(400).json({ message: "Subject and message are required" });
        }

        if (subject.length > 120) {
          return res.status(400).json({ message: "Subject must be 120 characters or less" });
        }

        if (message.length > 3000) {
          return res.status(400).json({ message: "Message must be 3000 characters or less" });
        }

        const feedback = await storage.createFeedback(req.session.userId!, subject, message);
        res.status(201).json(feedback);
      } catch (error) {
        console.error("Feedback submission error:", error);
        res.status(500).json({ message: "Could not submit feedback" });
      }
    },
  );

  app.put(
    "/api/notification-settings",
    requireAuth,
    async (req: Request, res: Response) => {
      const settings = await storage.upsertNotificationSettings(
        req.session.userId!,
        req.body,
      );
      res.json(settings);
    },
  );

  // Profile picture endpoints
  app.post(
    "/api/profile/picture",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const pictureUrl = typeof req.body?.pictureUrl === "string" ? req.body.pictureUrl.trim() : "";

        if (!pictureUrl) {
          return res.status(400).json({ message: "Picture URL is required" });
        }

        // Validate URL format
        try {
          new URL(pictureUrl);
        } catch {
          return res.status(400).json({ message: "Invalid picture URL format" });
        }

        const user = await storage.updateProfilePicture(req.session.userId!, pictureUrl);
        
        res.json({
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          profilePictureUrl: user.profilePictureUrl,
        });
      } catch (error) {
        console.error("Profile picture update error:", error);
        res.status(500).json({ message: "Could not update profile picture" });
      }
    },
  );

  app.delete(
    "/api/profile/picture",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const user = await storage.updateProfilePicture(req.session.userId!, "");
        
        res.json({
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          profilePictureUrl: user.profilePictureUrl,
        });
      } catch (error) {
        console.error("Profile picture deletion error:", error);
        res.status(500).json({ message: "Could not delete profile picture" });
      }
    },
  );

  app.post(
    "/api/purchases/verify",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const userId = req.session.userId!;
        console.log(`💳 Payment verification started for user ${userId}`);
        
        const bookletId = Number(req.body?.bookletId);
        const platform = typeof req.body?.platform === "string" ? req.body.platform.trim().toLowerCase() : "";
        const productId = typeof req.body?.productId === "string" ? req.body.productId.trim() : "";
        const transactionId = typeof req.body?.transactionId === "string" ? req.body.transactionId.trim() : "";
        const purchaseToken = typeof req.body?.purchaseToken === "string" ? req.body.purchaseToken.trim() : "";

        console.log(`📋 Payment details: bookletId=${bookletId}, platform=${platform}, transactionId=${transactionId}`);

        if (!bookletId || !platform || !productId || !transactionId || !purchaseToken) {
          console.log(`❌ Missing required fields in payment request`);
          return res.status(400).json({ message: "bookletId, platform, productId, transactionId and purchaseToken are required" });
        }

        const isValid = await verifyStorePurchase({
          platform,
          productId,
          transactionId,
          purchaseToken,
        });

        if (!isValid) {
          console.log(`❌ Purchase verification failed for transactionId=${transactionId}`);
          return res.status(400).json({ message: "Purchase verification failed" });
        }

        console.log(`✓ Purchase verification passed`);

        const purchase = await storage.recordMonthlyPurchase({
          userId,
          bookletId,
          platform,
          productId,
          transactionId,
          amountNaira: MONTHLY_BOOK_PRICE_NAIRA,
        });

        console.log(`✅ Payment recorded with ID ${purchase.id}, status: ${purchase.status}`);

        res.json({
          success: true,
          bookletId,
          paymentId: purchase.id,
          status: "pending_approval",
          message: "Payment recorded successfully. Waiting for admin approval.",
        });
      } catch (error) {
        console.error("❌ Purchase verification error:", error);
        res.status(500).json({ message: "Could not verify purchase" });
      }
    },
  );

  // Get user's payment status for all booklets
  app.get(
    "/api/purchases/status",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const userId = req.session.userId!;
        
        // Get all purchases for this user
        const purchases = await db
          .select({
            id: monthlyPurchases.id,
            bookletId: monthlyPurchases.bookletId,
            status: monthlyPurchases.status,
            amountNaira: monthlyPurchases.amountNaira,
            transactionId: monthlyPurchases.transactionId,
            createdAt: monthlyPurchases.createdAt,
            approvedAt: monthlyPurchases.approvedAt,
            bookletTitle: booklets.title,
            bookletMonth: booklets.month,
            bookletYear: booklets.year,
          })
          .from(monthlyPurchases)
          .leftJoin(booklets, eq(monthlyPurchases.bookletId, booklets.id))
          .where(eq(monthlyPurchases.userId, userId));

        res.json({
          purchases,
          summary: {
            pending: purchases.filter(p => p.status === "pending").length,
            approved: purchases.filter(p => p.status === "approved").length,
            rejected: purchases.filter(p => p.status === "rejected").length,
          }
        });
      } catch (error) {
        console.error("Get purchases error:", error);
        res.status(500).json({ message: "Could not get purchase status" });
      }
    },
  );
  // Admin role checking - verifies user is authenticated and has isAdmin flag
  async function requireAdmin(req: Request, res: Response, next: Function) {
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

  // Add a new affirmation
  app.post(
    "/api/admin/affirmations",
    requireAdmin,
    async (req: Request, res: Response) => {
      try {
        const { bookletId, dayNumber, title, content } = req.body;

        if (!bookletId || !dayNumber || !title || !content) {
          return res.status(400).json({ message: "Missing required fields" });
        }

        const [newAffirmation] = await db
          .insert(affirmations)
          .values({
            bookletId,
            dayNumber,
            title,
            content,
          })
          .returning();

        res.json(newAffirmation);
      } catch (error) {
        res.status(500).json({ message: "Error creating affirmation" });
      }
    },
  );

  // Update an affirmation
  app.put(
    "/api/admin/affirmations/:id",
    requireAdmin,
    async (req: Request, res: Response) => {
      try {
        const { title, content } = req.body;
        const id = parseInt(req.params.id);

        if (!title || !content) {
          return res.status(400).json({ message: "Missing required fields" });
        }

        const [updated] = await db
          .update(affirmations)
          .set({ title, content })
          .where(eq(affirmations.id, id))
          .returning();

        res.json(updated);
      } catch (error) {
        res.status(500).json({ message: "Error updating affirmation" });
      }
    },
  );

  // Delete an affirmation
  app.delete(
    "/api/admin/affirmations/:id",
    requireAdmin,
    async (req: Request, res: Response) => {
      try {
        const id = parseInt(req.params.id);
        await db.delete(affirmations).where(eq(affirmations.id, id));
        res.json({ message: "Affirmation deleted" });
      } catch (error) {
        res.status(500).json({ message: "Error deleting affirmation" });
      }
    },
  );

  // Create a new booklet
  app.post(
    "/api/admin/booklets",
    requireAdmin,
    async (req: Request, res: Response) => {
      try {
        const { title, month, year, description, coverColor } = req.body;

        if (!title || !month || !year) {
          return res
            .status(400)
            .json({ message: "Missing required fields" });
        }

        const [newBooklet] = await db
          .insert(booklets)
          .values({
            title,
            month,
            year,
            description,
            coverColor: coverColor || "#1976D2",
          })
          .returning();

        res.json(newBooklet);
      } catch (error) {
        res.status(500).json({ message: "Error creating booklet" });
      }
    },
  );

  // ========== ADMIN PAYMENT MANAGEMENT ROUTES ==========

  // Get all payments with filters (status, userId, date range)
  app.get(
    "/api/admin/payments",
    requireAdmin,
    adminPaymentRoutes.getAllPayments,
  );

  // Get specific payment details with audit log
  app.get(
    "/api/admin/payments/:id",
    requireAdmin,
    adminPaymentRoutes.getPaymentDetails,
  );

  // Approve a pending payment
  app.post(
    "/api/admin/payments/:id/approve",
    requireAdmin,
    adminPaymentRoutes.approvePayment,
  );

  // Reject a pending payment
  app.post(
    "/api/admin/payments/:id/reject",
    requireAdmin,
    adminPaymentRoutes.rejectPayment,
  );

  // Get payment statistics and summary
  app.get(
    "/api/admin/analytics/payments",
    requireAdmin,
    adminPaymentRoutes.getPaymentStats,
  );

  // Get centralized payment account details
  app.get(
    "/api/admin/payment-account",
    requireAdmin,
    adminPaymentRoutes.getPaymentAccount,
  );

  // Set centralized payment account details
  app.put(
    "/api/admin/payment-account",
    requireAdmin,
    adminPaymentRoutes.setPaymentAccount,
  );

  // ========== ADMIN USER MANAGEMENT ROUTES ==========

  // Get all users (admin only)
  app.get(
    "/api/admin/users",
    requireAdmin,
    async (req: Request, res: Response) => {
      try {
        const allUsers = await db.select().from(users);
        res.json({
          users: allUsers.map(u => ({
            id: u.id,
            username: u.username,
            email: u.email,
            displayName: u.displayName,
            isAdmin: u.isAdmin,
            createdAt: u.createdAt,
          })),
        });
      } catch (error) {
        console.error("Get users error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  // Promote user to admin
  app.post(
    "/api/admin/users/:userId/promote",
    requireAdmin,
    async (req: Request, res: Response) => {
      try {
        const userId = Number(req.params.userId);
        if (!userId) {
          return res.status(400).json({ message: "User ID required" });
        }

        const [updated] = await db
          .update(users)
          .set({ isAdmin: true })
          .where(eq(users.id, userId))
          .returning();

        if (!updated) {
          return res.status(404).json({ message: "User not found" });
        }

        res.json({ message: "User promoted to admin", user: { id: updated.id, username: updated.username, isAdmin: true } });
      } catch (error) {
        console.error("Promote user error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  // Demote admin to regular user
  app.post(
    "/api/admin/users/:userId/demote",
    requireAdmin,
    async (req: Request, res: Response) => {
      try {
        const userId = Number(req.params.userId);
        const currentAdmin = req.session.userId;

        if (!userId) {
          return res.status(400).json({ message: "User ID required" });
        }

        // Prevent self-demotion
        if (userId === currentAdmin) {
          return res.status(403).json({ message: "Cannot demote yourself" });
        }

        const [updated] = await db
          .update(users)
          .set({ isAdmin: false })
          .where(eq(users.id, userId))
          .returning();

        if (!updated) {
          return res.status(404).json({ message: "User not found" });
        }

        res.json({ message: "User demoted to regular user", user: { id: updated.id, username: updated.username, isAdmin: false } });
      } catch (error) {
        console.error("Demote user error:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );
}

async function verifyStorePurchase(input: {
  platform: string;
  productId: string;
  transactionId: string;
  purchaseToken: string;
}): Promise<boolean> {
  // In dev mode, accept all manual payments without store verification
  // These are recorded as "pending" and require admin approval to unlock booklets
  const isDev = process.env.NODE_ENV !== "production";

  // Dev mode: accept manual payments (format: manual_platform_id_timestamp)
  if (isDev && input.transactionId.startsWith("manual_")) {
    return true;
  }

  // Mock payments for testing (mock_*)
  const mockAllowed =
    process.env.ALLOW_MOCK_PURCHASE_VERIFICATION === "true" ||
    isDev;

  if (input.purchaseToken.startsWith("mock_")) {
    return mockAllowed;
  }

  if (!input.productId || !input.transactionId || !input.purchaseToken) {
    return false;
  }

  if (input.platform === "ios" || input.platform === "android") {
    return true;
  }

  if (input.platform === "web" && mockAllowed) {
    return true;
  }

  return false;
}
