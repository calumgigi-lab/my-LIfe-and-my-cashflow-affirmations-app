import type { VercelRequest, VercelResponse } from "@vercel/node";
import express from "express";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// Load environment
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const app = express();
app.use(express.json());

// CORS middleware
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }
  
  next();
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// News endpoint
app.get("/api/news", (req, res) => {
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
  res.json(sorted);
});

// Booklets endpoint (mock)
app.get("/api/booklets", (req, res) => {
  res.json([
    {
      id: 1,
      month: "April",
      year: 2026,
      title: "April 2026 Affirmations",
      description: "Daily affirmations for April 2026",
      numberOfPages: 30,
    },
  ]);
});

// Auth register (mock)
app.post("/api/auth/register", (req, res) => {
  const { username, email, password, displayName } = req.body;
  
  if (!username || !email || !password) {
    return res.status(400).json({ message: "Missing required fields" });
  }
  
  res.json({
    id: 1,
    username,
    email,
    displayName: displayName || username,
    isAdmin: false,
  });
});

// Auth login (mock)
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ message: "Missing email or password" });
  }
  
  res.json({
    id: 1,
    username: "testuser",
    email,
    displayName: "Test User",
    isAdmin: false,
  });
});

// Auth me (mock)
app.get("/api/auth/me", (req, res) => {
  res.json({
    id: 1,
    username: "testuser",
    email: "test@example.com",
    displayName: "Test User",
    isAdmin: false,
  });
});

// Logout
app.post("/api/auth/logout", (req, res) => {
  res.json({ message: "Logged out successfully" });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Not found", path: req.path });
});

// Error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error("Error:", err);
  res.status(500).json({ message: "Internal server error", error: err.message });
});

// Export as Vercel handler
export default function handler(req: VercelRequest, res: VercelResponse) {
  return new Promise<void>((resolve, reject) => {
    app(req as any, res as any, (err: any) => {
      if (err) reject(err);
      else resolve();
    });
  });
}
