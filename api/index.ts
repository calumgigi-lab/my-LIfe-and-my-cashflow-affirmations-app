import { createApp } from "../server/app";

let appPromise: ReturnType<typeof createApp> | null = null;

function normalizeApiUrl(rawUrl: unknown): string {
  if (typeof rawUrl !== "string" || !rawUrl.length) {
    return "/api";
  }

  let path = rawUrl;
  if (/^https?:\/\//i.test(path)) {
    try {
      const parsed = new URL(path);
      path = `${parsed.pathname}${parsed.search}`;
    } catch {
      // Keep raw value if URL parsing fails.
    }
  }

  if (!path.startsWith("/")) {
    path = `/${path}`;
  }

  if (path !== "/api" && !path.startsWith("/api/")) {
    path = `/api${path}`;
  }

  return path;
}

export default async function handler(req: any, res: any) {
  try {
    if (!appPromise) {
      appPromise = createApp();
    }

    req.url = normalizeApiUrl(req.url);

    const app = await appPromise;
    return app(req, res);
  } catch (error) {
    console.error("Vercel API handler failed:", error);
    return res.status(500).json({ message: "Serverless handler failed" });
  }
}
