import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCors, errorHandler } from "./middleware";
import { getDb } from "./db";
import { booklets } from "../shared/schema";
import { desc } from "drizzle-orm";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (handleCors(req, res)) return;

    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const db = getDb();

    // Get all booklets ordered by year and month descending
    const allBooklets = await db
      .select()
      .from(booklets)
      .orderBy(desc(booklets.year), desc(booklets.month));

    res.status(200).json({
      success: true,
      booklets: allBooklets,
      count: allBooklets.length,
    });
  } catch (error) {
    errorHandler(error, res);
  }
}
