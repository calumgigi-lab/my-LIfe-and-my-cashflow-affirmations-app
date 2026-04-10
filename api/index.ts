import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCors, errorHandler } from "./middleware";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (handleCors(req, res)) return;

    res.status(200).json({
      status: "ok",
      version: "2.0.0",
      message: "Global Affirmation Hub API - Database Backed",
      endpoints: {
        health: "/api/health",
        booklets: "/api/booklets",
        affirmations: "/api/affirmations?bookletId={id}",
        news: "/api/news",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    errorHandler(error, res);
  }
}
