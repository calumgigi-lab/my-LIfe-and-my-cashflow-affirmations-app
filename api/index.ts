import type { VercelRequest, VercelResponse } from "@vercel/node";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { 
  booklets, 
  affirmations, 
  users, 
  affirmationCompletions,
  userStreaks,
  monthlyPurchases,
  paymentAuditLog
} from "../../shared/schema";
import { eq, desc, and } from "drizzle-orm";

// CORS middleware
function setCorsHeaders(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

// Database connection
let db: any = null;

function getDb() {
  if (!db) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL not set");
    }
    const client = postgres(process.env.DATABASE_URL);
    db = drizzle(client, {
      schema: {
        booklets,
        affirmations,
        users,
        affirmationCompletions,
        userStreaks,
        monthlyPurchases,
        paymentAuditLog
      }
    });
  }
  return db;
}

// Route handlers
export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  const path = req.url || "/";
  const method = req.method;

  try {
    // Health check
    if (path === "/health" || path === "/api/health") {
      return res.json({ 
        status: "ok", 
        timestamp: new Date().toISOString(),
        database: "connected"
      });
    }

    const database = getDb();

    // GET /api/booklets - Get all booklets
    if (path === "/api/booklets" && method === "GET") {
      const allBooklets = await database.query.booklets.findMany({
        orderBy: desc(booklets.year, booklets.month),
      });
      return res.json(allBooklets);
    }

    // GET /api/booklets/:id - Get booklet with affirmations
    if (path.startsWith("/api/booklets/") && method === "GET") {
      const bookletId = parseInt(path.split("/")[3]);
      if (isNaN(bookletId)) {
        return res.status(400).json({ error: "Invalid booklet ID" });
      }

      const booklet = await database.query.booklets.findFirst({
        where: eq(booklets.id, bookletId),
        with: {
          affirmations: {
            orderBy: asc(affirmations.dayNumber),
          }
        }
      });

      if (!booklet) {
        return res.status(404).json({ error: "Booklet not found" });
      }

      return res.json(booklet);
    }

    // GET /api/affirmations/today - Get today's affirmation
    if (path === "/api/affirmations/today" && method === "GET") {
      const today = new Date();
      const currentMonth = today.getMonth() + 1;
      const currentYear = today.getFullYear();
      const dayOfMonth = today.getDate();

      const todayBooklet = await database.query.booklets.findFirst({
        where: and(
          eq(booklets.month, currentMonth),
          eq(booklets.year, currentYear)
        ),
      });

      if (!todayBooklet) {
        return res.json({ 
          message: "No booklet for this month",
          affirmation: null
        });
      }

      const todayAff = await database.query.affirmations.findFirst({
        where: and(
          eq(affirmations.bookletId, todayBooklet.id),
          eq(affirmations.dayNumber, dayOfMonth)
        ),
      });

      if (!todayAff) {
        return res.json({ 
          message: "No affirmation for today",
          affirmation: null
        });
      }

      return res.json(todayAff);
    }

    // GET /api/stats - Get app statistics
    if (path === "/api/stats" && method === "GET") {
      const totalAffirmations = await database.query.affirmations.findMany();
      const totalUsers = await database.query.users.findMany();
      const totalCompletions = await database.query.affirmationCompletions.findMany();
      const totalBooklets = await database.query.booklets.findMany();

      return res.json({
        totalAffirmations: totalAffirmations.length,
        totalUsers: totalUsers.length,
        totalCompletions: totalCompletions.length,
        totalBooklets: totalBooklets.length,
        timestamp: new Date().toISOString()
      });
    }

    // GET /api/news - Get news items
    if (path === "/api/news" && method === "GET") {
      const NEWS_ITEMS = [
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
      ];
      const sorted = [...NEWS_ITEMS].sort(
        (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
      );
      return res.json(sorted);
    }

    // GET /api/payments - Get payment statistics
    if (path === "/api/payments" && method === "GET") {
      const allPayments = await database.query.monthlyPurchases.findMany();
      const stats = {
        total: allPayments.length,
        pending: allPayments.filter((p: any) => p.status === "pending").length,
        approved: allPayments.filter((p: any) => p.status === "approved").length,
        rejected: allPayments.filter((p: any) => p.status === "rejected").length,
      };
      return res.json(stats);
    }

    // 404 Not found
    return res.status(404).json({ 
      error: "Endpoint not found",
      path,
      method
    });

  } catch (error: any) {
    console.error("API Error:", error);
    return res.status(500).json({ 
      error: error.message || "Internal server error",
      timestamp: new Date().toISOString()
    });
  }
}
      id: 1,
      username: "testuser",
      email,
      displayName: "Test User",
      isAdmin: false,
    });
  }

  // Auth me
  if (path === "/api/auth/me") {
    return res.json({
      id: 1,
      username: "testuser",
      email: "test@example.com",
      displayName: "Test User",
      isAdmin: false,
    });
  }

  // Auth logout
  if (path === "/api/auth/logout" && req.method === "POST") {
    return res.json({ message: "Logged out successfully" });
  }

  // Root
  if (path === "/" || path === "") {
    return res.json({
      status: "API is running",
      version: "1.0.0",
      endpoints: ["/health", "/api/news", "/api/booklets", "/api/auth/register", "/api/auth/login", "/api/auth/me"],
    });
  }

  // 404
  res.status(404).json({ message: "Not found", path });
}
