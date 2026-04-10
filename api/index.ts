import { createApp } from "../server/app";

let appInstance: any = null;

export default async function handler(req: any, res: any) {
  try {
    // Initialize app once and reuse
    if (!appInstance) {
      console.log("[Vercel] Initializing Express app...");
      appInstance = await createApp();
    }

    console.log(`[Vercel] ${req.method} ${req.url}`);
    // Routes are defined as /api/... so keep the full URL
    return appInstance(req, res);
  } catch (error) {
    console.error("[Vercel] Handler error:", error);
    res.status(500).json({ error: "Server error", details: String(error) });
  }
}
