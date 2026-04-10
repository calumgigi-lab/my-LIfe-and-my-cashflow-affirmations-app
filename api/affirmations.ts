import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCors, errorHandler } from "./middleware";
import { getDb } from "./db";
import { affirmations as affirmationsTable, booklets } from "../shared/schema";
import { eq, and } from "drizzle-orm";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (handleCors(req, res)) return;

    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { bookletId, dayNumber } = req.query;

    const db = getDb();

    if (bookletId) {
      const bid = parseInt(bookletId as string);

      if (dayNumber) {
        const dnum = parseInt(dayNumber as string);
        // Get specific affirmation
        const affirmation = await db
          .select()
          .from(affirmationsTable)
          .where(
            and(
              eq(affirmationsTable.bookletId, bid),
              eq(affirmationsTable.dayNumber, dnum),
            ),
          )
          .limit(1);

        return res.status(200).json({
          success: true,
          affirmation: affirmation[0] || null,
        });
      }

      // Get all affirmations for a booklet
      const allAffirmations = await db
        .select()
        .from(affirmationsTable)
        .where(eq(affirmationsTable.bookletId, bid))
        .orderBy(affirmationsTable.dayNumber);

      return res.status(200).json({
        success: true,
        affirmations: allAffirmations,
        count: allAffirmations.length,
      });
    }

    // Get all affirmations
    const allAffirmations = await db
      .select()
      .from(affirmationsTable)
      .orderBy(affirmationsTable.id);

    res.status(200).json({
      success: true,
      affirmations: allAffirmations,
      count: allAffirmations.length,
    });
  } catch (error) {
    errorHandler(error, res);
  }
}
