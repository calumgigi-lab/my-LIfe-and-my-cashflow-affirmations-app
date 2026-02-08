import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { storage } from "./storage";
import { loginSchema, registerSchema } from "@shared/schema";
import bcrypt from "bcryptjs";

const PgSession = connectPg(session);

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

function requireAuth(req: Request, res: Response, next: Function) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.use(
    session({
      store: new PgSession({
        pool: pool as any,
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || "dev-secret-change-in-production",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: false,
        sameSite: "lax",
      },
    }),
  );

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }

      const { username, email, password, displayName } = parsed.data;

      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already in use" });
      }

      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already taken" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUser({
        username,
        email,
        password: hashedPassword,
        displayName: displayName || username,
      });

      await storage.getOrCreateStreak(user.id);

      req.session.userId = user.id;
      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
      });
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }

      const { email, password } = parsed.data;
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      req.session.userId = user.id;
      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out" });
    });
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
    });
  });

  app.get("/api/booklets", async (_req: Request, res: Response) => {
    const allBooklets = await storage.getBooklets();
    res.json(allBooklets);
  });

  app.get("/api/booklets/:id", async (req: Request, res: Response) => {
    const booklet = await storage.getBooklet(parseInt(req.params.id));
    if (!booklet) {
      return res.status(404).json({ message: "Booklet not found" });
    }
    res.json(booklet);
  });

  app.get(
    "/api/booklets/:id/affirmations",
    async (req: Request, res: Response) => {
      const affs = await storage.getAffirmationsByBooklet(
        parseInt(req.params.id),
      );
      res.json(affs);
    },
  );

  app.get("/api/affirmations/:id", async (req: Request, res: Response) => {
    const aff = await storage.getAffirmation(parseInt(req.params.id));
    if (!aff) {
      return res.status(404).json({ message: "Affirmation not found" });
    }
    res.json(aff);
  });

  app.get("/api/affirmations/today", async (_req: Request, res: Response) => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const aff = await storage.getTodayAffirmation(month, day);
    if (!aff) {
      return res.json(null);
    }
    res.json(aff);
  });

  app.post(
    "/api/affirmations/:id/complete",
    requireAuth,
    async (req: Request, res: Response) => {
      const affirmationId = parseInt(req.params.id);
      const today = new Date().toISOString().split("T")[0];
      const completion = await storage.markAffirmationComplete(
        req.session.userId!,
        affirmationId,
        today,
      );
      res.json(completion);
    },
  );

  app.get(
    "/api/completions",
    requireAuth,
    async (req: Request, res: Response) => {
      const date = req.query.date as string | undefined;
      const completions = await storage.getCompletions(
        req.session.userId!,
        date,
      );
      res.json(completions);
    },
  );

  app.get(
    "/api/completions/check/:affirmationId",
    requireAuth,
    async (req: Request, res: Response) => {
      const today = new Date().toISOString().split("T")[0];
      const completed = await storage.isAffirmationCompleted(
        req.session.userId!,
        parseInt(req.params.affirmationId),
        today,
      );
      res.json({ completed });
    },
  );

  app.get(
    "/api/stats",
    requireAuth,
    async (req: Request, res: Response) => {
      const stats = await storage.getUserStats(req.session.userId!);
      res.json(stats);
    },
  );

  app.get(
    "/api/streak",
    requireAuth,
    async (req: Request, res: Response) => {
      const streak = await storage.getOrCreateStreak(req.session.userId!);
      res.json(streak);
    },
  );

  app.get(
    "/api/notification-settings",
    requireAuth,
    async (req: Request, res: Response) => {
      const settings = await storage.getNotificationSettings(
        req.session.userId!,
      );
      res.json(
        settings || {
          enabled: true,
          startHour: 8,
          endHour: 21,
          intervalMinutes: 30,
        },
      );
    },
  );

  app.put(
    "/api/notification-settings",
    requireAuth,
    async (req: Request, res: Response) => {
      const settings = await storage.upsertNotificationSettings(
        req.session.userId!,
        req.body,
      );
      res.json(settings);
    },
  );

  const httpServer = createServer(app);
  return httpServer;
}
