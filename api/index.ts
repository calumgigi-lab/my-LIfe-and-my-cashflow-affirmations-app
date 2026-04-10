import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  const path = req.url || "/";

  // Health check
  if (path === "/health") {
    return res.json({ status: "ok", timestamp: new Date().toISOString() });
  }

  // News endpoint
  if (path === "/api/news") {
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

  // Booklets endpoint
  if (path === "/api/booklets") {
    return res.json([
      {
        id: 1,
        month: "April",
        year: 2026,
        title: "April 2026 Affirmations",
        description: "Daily affirmations for April 2026",
        numberOfPages: 30,
      },
    ]);
  }

  // Auth register
  if (path === "/api/auth/register" && req.method === "POST") {
    const body = req.body as any;
    const { username, email, password, displayName } = body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    return res.json({
      id: 1,
      username,
      email,
      displayName: displayName || username,
      isAdmin: false,
    });
  }

  // Auth login
  if (path === "/api/auth/login" && req.method === "POST") {
    const body = req.body as any;
    const { email, password } = body;

    if (!email || !password) {
      return res.status(400).json({ message: "Missing email or password" });
    }

    return res.json({
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
