import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCors, errorHandler } from "./middleware";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (handleCors(req, res)) return;

    res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      message: "Backend is operational",
    });
  } catch (error) {
    errorHandler(error, res);
  }
}
