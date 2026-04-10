import type { VercelRequest, VercelResponse } from "@vercel/node";

export function corsHeaders(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

export function handleCors(req: VercelRequest, res: VercelResponse) {
  corsHeaders(res);
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return true;
  }
  return false;
}

export function errorHandler(error: any, res: VercelResponse) {
  console.error("API Error:", error);

  if (error.message?.includes("Database connection")) {
    return res.status(503).json({
      error: "Database unavailable",
      message: error.message,
    });
  }

  return res.status(500).json({
    error: "Internal server error",
    message: process.env.NODE_ENV === "development" ? error.message : "An error occurred",
  });
}
