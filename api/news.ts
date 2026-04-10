import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCors, errorHandler } from "./middleware";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (handleCors(req, res)) return;

    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const newsItems = [
      {
        id: 1,
        title: "April 2026 Booklet Added",
        message: "The April 2026 affirmations booklet is now live in the library.",
        category: "release",
        createdAt: "2026-04-01T08:00:00.000Z",
      },
      {
        id: 2,
        title: "Backend API Live",
        message: "The new Vercel backend API is now fully operational with database integration.",
        category: "update",
        createdAt: "2026-04-10T12:00:00.000Z",
      },
      {
        id: 3,
        title: "Database Synced",
        message: "All historical affirmations have been synced to the production database.",
        category: "update",
        createdAt: "2026-04-09T08:00:00.000Z",
      },
    ];

    const sorted = [...newsItems].sort(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
    );

    res.status(200).json({
      success: true,
      news: sorted,
      count: sorted.length,
    });
  } catch (error) {
    errorHandler(error, res);
  }
}
