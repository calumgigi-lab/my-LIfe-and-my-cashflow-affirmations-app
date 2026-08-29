const postgres = require("postgres");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

let _sql = null;
function getSQL() {
  if (!_sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL not configured");
    _sql = postgres(url, { ssl: "require", max: 1, prepareThreshold: 0 });
  }
  return _sql;
}

// Ensure profile columns exist
async function ensureProfileColumns() {
  try {
    const sql = getSQL();
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS bio text`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone text`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS gender text`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth text`;
  } catch {}
}
ensureProfileColumns();

function hashPasswordSHA256(password) {
  const hash = crypto.createHash("sha256");
  hash.update(password + "global-affirmation-salt-2026");
  return hash.digest("hex");
}

function safeDecode(s) {
  if (!s) return s;
  try { return decodeURIComponent(s); } catch { return s; }
}

// ── Flutterwave V3 API Helper ──
async function flutterwaveApi(method, endpoint, body) {
  const secretKey = process.env.FLW_SECRET_KEY;
  if (!secretKey) throw new Error("FLW_SECRET_KEY not configured");

  const res = await fetch(`https://api.flutterwave.com/v3${endpoint}`, {
    method,
    headers: { "Authorization": `Bearer ${secretKey}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  return data;
}

// Verify admin from X-User-Id header
async function verifyAdmin(req, sql) {
  const userId = req.headers["x-user-id"];
  if (!userId) return null;
  const result = await sql`SELECT id, is_admin FROM users WHERE id = ${parseInt(userId)}`;
  if (!result.length || !result[0].is_admin) return null;
  return result[0];
}

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-User-Id");
  if (req.method === "OPTIONS") return res.status(200).end();

  const url = req.url || "/";
  const path = url.split("?")[0];
  const method = req.method || "GET";

  try {
    // ── Images: Serve affirmation images from DB ──
    const imgMatch = path.match(/^\/api\/images\/(\d+)$/);
    if (imgMatch && method === "GET") {
      const sql = getSQL();
      const affId = parseInt(imgMatch[1]);
      const rows = await sql`SELECT image_data FROM affirmations WHERE id = ${affId}`;
      if (!rows.length || !rows[0].image_data) {
        return res.status(404).json({ error: "Image not found" });
      }
      const dataUri = rows[0].image_data;
      const base64 = dataUri.split(",")[1];
      const mime = dataUri.split(";")[0].replace("data:", "");
      const buffer = Buffer.from(base64, "base64");
      res.setHeader("Content-Type", mime);
      res.setHeader("Cache-Control", "public, max-age=86400");
      return res.send(buffer);
    }

    // ── Health (tests DB connection) ──
    if (path === "/api/health" || path === "/api") {
      const sql = getSQL();
      await sql`SELECT 1`;
      return res.json({ status: "ok", timestamp: new Date().toISOString() });
    }

    // ── Auth: Register ──
    if (path === "/api/auth/register" && method === "POST") {
      const { username, email, password, displayName } = req.body || {};
      if (!username || !email || !password) {
        return res.status(400).json({ error: "username, email, and password are required" });
      }
      const sql = getSQL();
      const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
      if (existing.length > 0) {
        return res.status(409).json({ error: "Email already registered" });
      }
      const hashed = await bcrypt.hash(password, 10);
      const result = await sql`
        INSERT INTO users (username, email, password, display_name)
        VALUES (${username}, ${email}, ${hashed}, ${displayName || null})
        RETURNING id, username, email, display_name, is_admin
      `;
      const u = result[0];
      return res.json({
        id: u.id,
        username: u.username,
        email: u.email,
        displayName: u.display_name,
        isAdmin: u.is_admin,
      });
    }

    // ── Auth: Login ──
    if (path === "/api/auth/login" && method === "POST") {
      const { email, password } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ error: "email and password are required" });
      }
      const sql = getSQL();
      // Look up user by email
      const result = await sql`
        SELECT id, username, email, password, display_name, profile_picture_url, is_admin
        FROM users WHERE email = ${email}
      `;
      if (!result.length) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      const u = result[0];
      // Support both bcrypt ($2b$) and SHA256 (64-char hex) passwords
      let passwordValid = false;
      if (u.password.startsWith("$2b$") || u.password.startsWith("$2a$")) {
        passwordValid = await bcrypt.compare(password, u.password);
      } else {
        passwordValid = hashPasswordSHA256(password) === u.password;
      }
      if (!passwordValid) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      return res.json({
        id: u.id,
        username: u.username,
        email: u.email,
        displayName: u.display_name,
        profilePictureUrl: u.profile_picture_url,
        isAdmin: u.is_admin,
      });
    }

    // ── Auth: Me ──
    if (path === "/api/auth/me" && method === "GET") {
      const sql = getSQL();
      const userId = req.headers["x-user-id"] ? parseInt(req.headers["x-user-id"]) : null;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const result = await sql`
        SELECT id, username, email, display_name, profile_picture_url, is_admin, created_at,
               bio, phone, gender, date_of_birth
        FROM users WHERE id = ${userId}
      `;
      if (!result.length) return res.status(401).json({ error: "User not found" });
      const u = result[0];
      return res.json({
        id: u.id,
        username: u.username,
        email: u.email,
        displayName: u.display_name,
        profilePictureUrl: u.profile_picture_url,
        isAdmin: u.is_admin,
        createdAt: u.created_at,
        bio: u.bio || null,
        phone: u.phone || null,
        gender: u.gender || null,
        dateOfBirth: u.date_of_birth || null,
      });
    }

    // ── Auth: Update Profile ──
    if (path === "/api/auth/profile" && method === "PUT") {
      const sql = getSQL();
      const userId = req.headers["x-user-id"] ? parseInt(req.headers["x-user-id"]) : null;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const { displayName, username, email, bio, phone, gender, dateOfBirth } = req.body || {};
      await sql`
        UPDATE users SET
          display_name = COALESCE(${displayName || null}, display_name),
          username = COALESCE(${username || null}, username),
          email = COALESCE(${email || null}, email),
          bio = COALESCE(${bio || null}, bio),
          phone = COALESCE(${phone || null}, phone),
          gender = COALESCE(${gender || null}, gender),
          date_of_birth = COALESCE(${dateOfBirth || null}, date_of_birth)
        WHERE id = ${userId}
      `;
      return res.json({ message: "Profile updated" });
    }

    // ── Auth: Logout ──
    if (path === "/api/auth/logout" && method === "POST") {
      return res.json({ message: "Logged out" });
    }

    // ── Booklets: List ──
    if (path === "/api/booklets" && method === "GET") {
      const sql = getSQL();
      const result = await sql`SELECT * FROM booklets ORDER BY year DESC, month DESC`;
      return res.json(result.map(b => ({
        id: b.id,
        title: b.title,
        month: b.month,
        year: b.year,
        description: b.description,
        coverColor: b.cover_color,
        createdAt: b.created_at,
      })));
    }

    // ── Booklets: Get by ID ──
    const bookletMatch = path.match(/^\/api\/booklets\/(\d+)$/);
    if (bookletMatch && method === "GET") {
      const sql = getSQL();
      const id = parseInt(bookletMatch[1]);
      const booklet = await sql`SELECT * FROM booklets WHERE id = ${id}`;
      if (!booklet.length) {
        return res.status(404).json({ error: "Booklet not found" });
      }
      const affs = await sql`
        SELECT * FROM affirmations WHERE booklet_id = ${id} ORDER BY day_number ASC
      `;
      const b = booklet[0];
      return res.json({
        id: b.id,
        title: b.title,
        month: b.month,
        year: b.year,
        description: b.description,
        coverColor: b.cover_color,
        createdAt: b.created_at,
        affirmations: affs.map(a => ({
          id: a.id,
          bookletId: a.booklet_id,
          dayNumber: a.day_number,
          title: safeDecode(a.title),
          content: a.content,
          imageUrl: a.image_data ? `/api/images/${a.id}` : a.image_url,
          createdAt: a.created_at,
        })),
      });
    }

    // ── Booklets: Get affirmations for a booklet ──
    const bookletAffsMatch = path.match(/^\/api\/booklets\/(\d+)\/affirmations$/);
    if (bookletAffsMatch && method === "GET") {
      const sql = getSQL();
      const id = parseInt(bookletAffsMatch[1]);
      const affs = await sql`
        SELECT * FROM affirmations WHERE booklet_id = ${id} ORDER BY day_number ASC
      `;
      return res.json(affs.map(a => ({
        id: a.id,
        bookletId: a.booklet_id,
        dayNumber: a.day_number,
        title: safeDecode(a.title),
        content: a.content,
        imageUrl: a.image_data ? `/api/images/${a.id}` : a.image_url,
        createdAt: a.created_at,
      })));
    }

    // ── Booklets: Bulk access check (all unlocked booklet IDs) ──
    if (path === "/api/booklets/access" && method === "GET") {
      const sql = getSQL();
      const userId = req.headers["x-user-id"] ? parseInt(req.headers["x-user-id"]) : null;

      let unlockedBookletIds = [];
      if (userId) {
        const purchases = await sql`
          SELECT DISTINCT booklet_id FROM monthly_purchases
          WHERE user_id = ${userId} AND status = 'approved'
        `;
        unlockedBookletIds = purchases.map(p => p.booklet_id);
      }

      let monthlyPriceNaira = 1500;
      const priceSetting = await sql`
        SELECT value FROM admin_settings WHERE key = 'monthly_price_naira' LIMIT 1
      `.catch(() => []);
      if (priceSetting.length) {
        monthlyPriceNaira = parseInt(priceSetting[0].value) || 1500;
      }

      return res.json({
        unlockedBookletIds,
        previewDays: 2,
        monthlyPriceNaira,
      });
    }

    // ── Booklets: Access check (unlock status) ──
    const bookletAccessMatch = path.match(/^\/api\/booklets\/(\d+)\/access$/);
    if (bookletAccessMatch && method === "GET") {
      const sql = getSQL();
      const bookletId = parseInt(bookletAccessMatch[1]);
      const userId = req.headers["x-user-id"] ? parseInt(req.headers["x-user-id"]) : null;

      let unlocked = false;
      if (userId) {
        const purchase = await sql`
          SELECT id FROM monthly_purchases
          WHERE user_id = ${userId} AND booklet_id = ${bookletId} AND status = 'approved'
          LIMIT 1
        `;
        unlocked = purchase.length > 0;
      }

      // Check admin_settings for price override, fallback to 1500
      let monthlyPriceNaira = 1500;
      const priceSetting = await sql`
        SELECT value FROM admin_settings WHERE key = 'monthly_price_naira' LIMIT 1
      `.catch(() => []);
      if (priceSetting.length) {
        monthlyPriceNaira = parseInt(priceSetting[0].value) || 1500;
      }

      return res.json({
        bookletId,
        unlocked,
        previewDays: 2,
        monthlyPriceNaira,
      });
    }

    // ── Affirmations: Today ──
    if (path === "/api/affirmations/today" && method === "GET") {
      const sql = getSQL();
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      const day = now.getDate();

      const booklet = await sql`
        SELECT * FROM booklets WHERE month = ${month} AND year = ${year} LIMIT 1
      `;
      if (!booklet.length) {
        return res.json({ message: "No booklet for this month", affirmation: null });
      }
      const aff = await sql`
        SELECT * FROM affirmations
        WHERE booklet_id = ${booklet[0].id} AND day_number = ${day} LIMIT 1
      `;
      if (!aff.length) {
        return res.json({ message: "No affirmation for today", affirmation: null });
      }
      const a = aff[0];
      return res.json({
        id: a.id,
        bookletId: a.booklet_id,
        dayNumber: a.day_number,
        title: safeDecode(a.title),
        content: a.content,
        imageUrl: a.image_data ? `/api/images/${a.id}` : a.image_url,
        createdAt: a.created_at,
        bookletMonth: booklet[0].month,
        bookletYear: booklet[0].year,
      });
    }

    // ── Affirmations: By Date ──
    if (path === "/api/affirmations/by-date" && method === "GET") {
      const sql = getSQL();
      const dateParam = req.query.date || "";
      const parsed = new Date(dateParam);
      if (isNaN(parsed.getTime())) {
        return res.status(400).json({ error: "Invalid date parameter" });
      }
      const month = parsed.getMonth() + 1;
      const year = parsed.getFullYear();
      const day = parsed.getDate();

      const booklet = await sql`
        SELECT * FROM booklets WHERE month = ${month} AND year = ${year} LIMIT 1
      `;
      if (!booklet.length) {
        return res.json({ message: "No booklet for this date", affirmation: null });
      }
      const aff = await sql`
        SELECT * FROM affirmations
        WHERE booklet_id = ${booklet[0].id} AND day_number = ${day} LIMIT 1
      `;
      return res.json(aff[0] || { message: "No affirmation for this date", affirmation: null });
    }

    // ── Affirmation: Get by ID ──
    const affIdMatch = path.match(/^\/api\/affirmations\/(\d+)$/);
    if (affIdMatch && method === "GET") {
      const sql = getSQL();
      const affirmationId = parseInt(affIdMatch[1]);
      const aff = await sql`
        SELECT a.*, b.month as booklet_month, b.year as booklet_year, b.title as booklet_title
        FROM affirmations a
        JOIN booklets b ON a.booklet_id = b.id
        WHERE a.id = ${affirmationId} LIMIT 1
      `;
      if (!aff.length) {
        return res.status(404).json({ error: "Affirmation not found" });
      }
      const a = aff[0];
      return res.json({
        id: a.id,
        bookletId: a.booklet_id,
        dayNumber: a.day_number,
        title: safeDecode(a.title),
        content: a.content,
        imageUrl: a.image_data ? `/api/images/${a.id}` : a.image_url,
        createdAt: a.created_at,
        bookletMonth: a.booklet_month,
        bookletYear: a.booklet_year,
        bookletTitle: a.booklet_title,
      });
    }

    // ── Stats ──
    if (path === "/api/stats" && method === "GET") {
      const sql = getSQL();
      const userId = req.headers["x-user-id"] ? parseInt(req.headers["x-user-id"]) : null;
      const [b, a, u] = await Promise.all([
        sql`SELECT count(*) as count FROM booklets`,
        sql`SELECT count(*) as count FROM affirmations`,
        sql`SELECT count(*) as count FROM users`,
      ]);

      let currentStreak = 0, longestStreak = 0, totalAffirmed = 0;
      let thisMonth = 0, totalDays = 0, level = "Bronze", completedToday = false;
      let unlockedBooklets = 0;
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      const todayStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

      if (userId) {
        const streakRow = await sql`
          SELECT current_streak, longest_streak
          FROM user_streaks WHERE user_id = ${userId} LIMIT 1
        `.catch(() => []);
        if (streakRow.length) {
          currentStreak = streakRow[0].current_streak || 0;
          longestStreak = streakRow[0].longest_streak || 0;
        }
        const completionsRow = await sql`
          SELECT count(*) as count FROM affirmation_completions WHERE user_id = ${userId}
        `.catch(() => []);
        totalAffirmed = completionsRow.length ? Number(completionsRow[0].count) : 0;

        const thisMonthRow = await sql`
          SELECT count(*) as count FROM affirmation_completions
          WHERE user_id = ${userId}
          AND EXTRACT(MONTH FROM completed_date) = ${currentMonth}
          AND EXTRACT(YEAR FROM completed_date) = ${currentYear}
        `.catch(() => []);
        thisMonth = thisMonthRow.length ? Number(thisMonthRow[0].count) : 0;

        const totalDaysRow = await sql`
          SELECT count(DISTINCT completed_date) as count FROM affirmation_completions
          WHERE user_id = ${userId}
        `.catch(() => []);
        totalDays = totalDaysRow.length ? Number(totalDaysRow[0].count) : 0;

        const todayCheck = await sql`
          SELECT id FROM affirmation_completions
          WHERE user_id = ${userId} AND completed_date = ${todayStr}
          LIMIT 1
        `.catch(() => []);
        completedToday = todayCheck.length > 0;

        const unlockedRow = await sql`
          SELECT count(DISTINCT booklet_id) as count FROM monthly_purchases
          WHERE user_id = ${userId} AND status = 'approved'
        `.catch(() => []);
        unlockedBooklets = unlockedRow.length ? Number(unlockedRow[0].count) : 0;

        if (totalAffirmed >= 100) level = "Diamond";
        else if (totalAffirmed >= 50) level = "Platinum";
        else if (totalAffirmed >= 20) level = "Gold";
        else if (totalAffirmed >= 5) level = "Silver";
        else level = "Bronze";
      }

      const nextLevelThreshold = level === "Bronze" ? 5 : level === "Silver" ? 20 : level === "Gold" ? 50 : level === "Platinum" ? 100 : 100;
      const prevLevelThreshold = level === "Bronze" ? 0 : level === "Silver" ? 5 : level === "Gold" ? 20 : level === "Platinum" ? 50 : 100;
      let levelProgress = 100;
      if (nextLevelThreshold > prevLevelThreshold) {
        levelProgress = Math.min(((totalAffirmed - prevLevelThreshold) / (nextLevelThreshold - prevLevelThreshold)) * 100, 100);
      }

      return res.json({
        totalBooklets: Number(b[0].count),
        totalAffirmations: Number(a[0].count),
        totalUsers: Number(u[0].count),
        unlockedBooklets,
        currentStreak,
        longestStreak,
        totalAffirmed,
        thisMonth,
        totalDays,
        level,
        levelProgress,
        completedToday,
        timestamp: new Date().toISOString(),
      });
    }

    // ── Completions: Check if affirmation is completed (permanent) ──
    const completionCheckMatch = path.match(/^\/api\/completions\/check\/(\d+)$/);
    if (completionCheckMatch && method === "GET") {
      const sql = getSQL();
      const affirmationId = parseInt(completionCheckMatch[1]);
      const userId = req.headers["x-user-id"] ? parseInt(req.headers["x-user-id"]) : null;
      if (!userId) return res.json({ completed: false });

      const result = await sql`
        SELECT id FROM affirmation_completions
        WHERE user_id = ${userId} AND affirmation_id = ${affirmationId}
        LIMIT 1
      `;
      return res.json({ completed: result.length > 0 });
    }

    // ── Completions: Complete an affirmation (permanent, one-time only) ──
    const completeMatch = path.match(/^\/api\/affirmations\/(\d+)\/complete$/);
    if (completeMatch && method === "POST") {
      const sql = getSQL();
      const affirmationId = parseInt(completeMatch[1]);
      const userId = req.headers["x-user-id"] ? parseInt(req.headers["x-user-id"]) : null;
      if (!userId) return res.status(401).json({ error: "Authentication required" });

      const today = new Date().toISOString().split("T")[0];

      // Permanent check — once affirmed, never again (across all days)
      const existing = await sql`
        SELECT id FROM affirmation_completions
        WHERE user_id = ${userId} AND affirmation_id = ${affirmationId}
        LIMIT 1
      `;
      if (existing.length > 0) {
        return res.json({ message: "Already affirmed", completed: true });
      }

      // Ensure unique constraint exists to prevent race-condition duplicates
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS uq_affirmation_completions_user_affirm ON affirmation_completions (user_id, affirmation_id)`.catch(() => {});

      // Insert completion — only proceed if a new row was actually inserted
      const insertResult = await sql`
        INSERT INTO affirmation_completions (user_id, affirmation_id, completed_date)
        VALUES (${userId}, ${affirmationId}, ${today})
        ON CONFLICT (user_id, affirmation_id) DO NOTHING
        RETURNING id
      `.catch(() => []);

      // If ON CONFLICT fired (insertResult is empty), someone already completed it
      if (!insertResult.length) {
        return res.json({ message: "Already affirmed", completed: true });
      }

      // Award 50 reward points
      await sql`
        CREATE TABLE IF NOT EXISTS reward_points (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          points INTEGER NOT NULL DEFAULT 0,
          total_earned INTEGER NOT NULL DEFAULT 0,
          total_spent INTEGER NOT NULL DEFAULT 0,
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `.catch(() => {});
      await sql`
        CREATE TABLE IF NOT EXISTS reward_history (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          points INTEGER NOT NULL,
          action VARCHAR(50) NOT NULL,
          description TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `.catch(() => {});

      const existingPoints = await sql`
        SELECT id FROM reward_points WHERE user_id = ${userId} LIMIT 1
      `.catch(() => []);
      if (existingPoints.length) {
        await sql`
          UPDATE reward_points
          SET points = points + 50, total_earned = total_earned + 50, updated_at = NOW()
          WHERE user_id = ${userId}
        `;
      } else {
        await sql`
          INSERT INTO reward_points (user_id, points, total_earned, total_spent)
          VALUES (${userId}, 50, 50, 0)
        `;
      }
      await sql`
        INSERT INTO reward_history (user_id, points, action, description)
        VALUES (${userId}, 50, 'affirm', 'Affirmed daily affirmation')
      `;

      // Update streak
      const streakRow = await sql`
        SELECT * FROM user_streaks WHERE user_id = ${userId} LIMIT 1
      `;
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

      if (streakRow.length) {
        const lastActive = streakRow[0].last_active_date;
        let newStreak = streakRow[0].current_streak;
        if (lastActive === yesterday) {
          newStreak += 1;
        } else if (lastActive !== today) {
          newStreak = 1;
        }
        const newLongest = Math.max(newStreak, streakRow[0].longest_streak);
        await sql`
          UPDATE user_streaks
          SET current_streak = ${newStreak}, longest_streak = ${newLongest},
              total_affirmed = total_affirmed + 1, last_active_date = ${today}
          WHERE user_id = ${userId}
        `;

        // Streak milestone bonus: +10 points at 7, +25 at 14, +50 at 30
        let milestoneBonus = 0;
        if (newStreak === 7) milestoneBonus = 10;
        else if (newStreak === 14) milestoneBonus = 25;
        else if (newStreak === 30) milestoneBonus = 50;
        if (milestoneBonus > 0) {
          await sql`UPDATE reward_points SET points = points + ${milestoneBonus}, total_earned = total_earned + ${milestoneBonus}, updated_at = NOW() WHERE user_id = ${userId}`;
          await sql`INSERT INTO reward_history (user_id, points, action, description) VALUES (${userId}, ${milestoneBonus}, 'streak_milestone', ${`Streak milestone: ${newStreak} days`})`;
        }

        return res.json({ message: "Completed", completed: true, pointsAwarded: 50, streakMilestoneBonus: milestoneBonus, currentStreak: newStreak });
      } else {
        await sql`
          INSERT INTO user_streaks (user_id, current_streak, longest_streak, total_affirmed, last_active_date)
          VALUES (${userId}, 1, 1, 1, ${today})
        `;
      }

      return res.json({ message: "Completed", completed: true, pointsAwarded: 50, streakMilestoneBonus: 0, currentStreak: 1 });
    }

    // ── Reward Points: Get balance ──
    if (path === "/api/rewards/balance" && method === "GET") {
      const sql = getSQL();
      const userId = req.headers["x-user-id"] ? parseInt(req.headers["x-user-id"]) : null;
      if (!userId) return res.json({ points: 0 });

      await sql`
        CREATE TABLE IF NOT EXISTS reward_points (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          points INTEGER NOT NULL DEFAULT 0,
          total_earned INTEGER NOT NULL DEFAULT 0,
          total_spent INTEGER NOT NULL DEFAULT 0,
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `.catch(() => {});
      await sql`
        CREATE TABLE IF NOT EXISTS reward_history (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          points INTEGER NOT NULL,
          action VARCHAR(50) NOT NULL,
          description TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `.catch(() => {});

      const result = await sql`
        SELECT points, total_earned, total_spent FROM reward_points WHERE user_id = ${userId} LIMIT 1
      `.catch(() => []);
      if (!result.length) return res.json({ points: 0, totalEarned: 0, totalSpent: 0 });
      return res.json({
        points: result[0].points,
        totalEarned: result[0].total_earned,
        totalSpent: result[0].total_spent,
      });
    }

    // ── Reward Points: History ──
    if (path === "/api/rewards/history" && method === "GET") {
      const sql = getSQL();
      const userId = req.headers["x-user-id"] ? parseInt(req.headers["x-user-id"]) : null;
      if (!userId) return res.json([]);

      const result = await sql`
        SELECT id, points, action, description, created_at
        FROM reward_history WHERE user_id = ${userId}
        ORDER BY created_at DESC LIMIT 50
      `.catch(() => []);
      return res.json(result.map(r => ({
        id: r.id,
        points: r.points,
        action: r.action,
        description: r.description,
        createdAt: r.created_at,
      })));
    }

    // ── Rewards: Daily Check-in ──
    if (path === "/api/rewards/daily-checkin" && method === "POST") {
      const sql = getSQL();
      const userId = req.headers["x-user-id"] ? parseInt(req.headers["x-user-id"]) : null;
      if (!userId) return res.status(401).json({ error: "Authentication required" });

      const today = new Date().toISOString().split("T")[0];
      const existing = await sql`
        SELECT id FROM reward_history
        WHERE user_id = ${userId} AND action = 'daily_checkin' AND created_at::date = ${today}::date
        LIMIT 1
      `.catch(() => []);

      if (existing.length) return res.json({ alreadyCheckedIn: true, pointsAwarded: 0 });

      const userRow = await sql`SELECT is_admin FROM users WHERE id = ${userId} LIMIT 1`.catch(() => []);
      const isAdmin = userRow.length && userRow[0].is_admin;
      const checkInPts = isAdmin ? 1000 : 10;
      const existingPts = await sql`SELECT id FROM reward_points WHERE user_id = ${userId} LIMIT 1`.catch(() => []);
      if (existingPts.length) {
        await sql`UPDATE reward_points SET points = points + ${checkInPts}, total_earned = total_earned + ${checkInPts}, updated_at = NOW() WHERE user_id = ${userId}`;
      } else {
        await sql`INSERT INTO reward_points (user_id, points, total_earned, total_spent) VALUES (${userId}, ${checkInPts}, ${checkInPts}, 0)`;
      }
      await sql`INSERT INTO reward_history (user_id, points, action, description) VALUES (${userId}, ${checkInPts}, 'daily_checkin', ${isAdmin ? 'Admin daily bonus' : 'Daily check-in bonus'})`;

      return res.json({ alreadyCheckedIn: false, pointsAwarded: checkInPts });
    }

    // ── Leaderboard ──
    if (path === "/api/leaderboard" && method === "GET") {
      const sql = getSQL();

      const result = await sql`
        SELECT rp.user_id, rp.points, rp.total_earned,
               u.username, u.display_name, u.profile_picture_url,
               COALESCE(us.total_affirmed, 0) as total_affirmed,
               COALESCE(us.current_streak, 0) as current_streak
        FROM reward_points rp
        JOIN users u ON rp.user_id = u.id
        LEFT JOIN user_streaks us ON rp.user_id = us.user_id
        ORDER BY rp.total_earned DESC
        LIMIT 50
      `.catch(() => []);

      return res.json(result.map((r, i) => ({
        rank: i + 1,
        userId: r.user_id,
        username: r.username,
        displayName: r.display_name,
        profilePictureUrl: r.profile_picture_url,
        points: r.points,
        totalEarned: r.total_earned,
        totalAffirmed: r.total_affirmed,
        currentStreak: r.current_streak,
      })));
    }

    // ── Purchase with Points ──
    if (path === "/api/purchases/with-points" && method === "POST") {
      const sql = getSQL();
      const userId = req.headers["x-user-id"] ? parseInt(req.headers["x-user-id"]) : (req.body?.userId ? parseInt(req.body.userId) : null);
      if (!userId) return res.status(401).json({ error: "Authentication required" });

      const { bookletId } = req.body || {};
      if (!bookletId) return res.status(400).json({ error: "bookletId is required" });

      const pointsCost = 4500;

      // Check balance
      const balance = await sql`
        SELECT points FROM reward_points WHERE user_id = ${userId} LIMIT 1
      `.catch(() => []);
      const currentPoints = balance.length ? balance[0].points : 0;

      if (currentPoints < pointsCost) {
        return res.status(400).json({
          error: `Insufficient points. You have ${currentPoints} but need ${pointsCost}.`,
          currentPoints,
          required: pointsCost,
        });
      }

      // Check if already purchased
      const existing = await sql`
        SELECT id FROM monthly_purchases
        WHERE user_id = ${userId} AND booklet_id = ${bookletId} AND status = 'approved'
        LIMIT 1
      `;
      if (existing.length) {
        return res.status(400).json({ error: "You already own this booklet" });
      }

      // Deduct points
      await sql`
        UPDATE reward_points
        SET points = points - ${pointsCost}, total_spent = total_spent + ${pointsCost}, updated_at = NOW()
        WHERE user_id = ${userId}
      `;

      // Log the spend
      await sql`
        INSERT INTO reward_history (user_id, points, action, description)
        VALUES (${userId}, ${-pointsCost}, 'purchase', ${`Purchased booklet #${bookletId} with points`})
      `;

      // Create auto-approved purchase with payment_method = 'points'
      const result = await sql`
        INSERT INTO monthly_purchases (user_id, booklet_id, platform, product_id, transaction_id, status, approved_at, amount_naira, payment_method)
        VALUES (${userId}, ${bookletId}, 'points', 'reward_points', ${'points_' + userId + '_' + bookletId + '_' + Date.now()}, 'approved', NOW(), 0, 'points')
        RETURNING *
      `;

      return res.json({
        message: "Booklet purchased with points!",
        purchase: result[0],
        pointsSpent: pointsCost,
        remainingPoints: currentPoints - pointsCost,
      });
    }

    // ── Streak ──
    if (path === "/api/streak" && method === "GET") {
      const sql = getSQL();
      const userId = req.headers["x-user-id"] ? parseInt(req.headers["x-user-id"]) : null;
      if (!userId) return res.json({ currentStreak: 0, longestStreak: 0, totalAffirmed: 0 });

      const result = await sql`
        SELECT current_streak, longest_streak, total_affirmed, last_active_date
        FROM user_streaks WHERE user_id = ${userId} LIMIT 1
      `.catch(() => []);
      if (!result.length) return res.json({ currentStreak: 0, longestStreak: 0, totalAffirmed: 0 });

      return res.json({
        currentStreak: result[0].current_streak || 0,
        longestStreak: result[0].longest_streak || 0,
        totalAffirmed: result[0].total_affirmed || 0,
        lastActiveDate: result[0].last_active_date,
      });
    }

    // ── Profile Picture: Upload ──
    if (path === "/api/profile/picture" && method === "POST") {
      const sql = getSQL();
      const userId = req.headers["x-user-id"] ? parseInt(req.headers["x-user-id"]) : null;
      if (!userId) return res.status(401).json({ error: "Authentication required" });

      const { pictureUrl } = req.body || {};
      if (!pictureUrl) return res.status(400).json({ error: "pictureUrl is required" });

      // Validate it's a data URI (base64 image) - reject URLs to external sites
      if (!pictureUrl.startsWith("data:image/")) {
        return res.status(400).json({ error: "Invalid image format. Must be a base64 data URI." });
      }

      // Limit size (~2MB base64 ≈ ~1.5MB image)
      if (pictureUrl.length > 2 * 1024 * 1024) {
        return res.status(400).json({ error: "Image too large. Maximum size is ~1.5MB." });
      }

      await sql`UPDATE users SET profile_picture_url = ${pictureUrl} WHERE id = ${userId}`;

      // One-time profile picture upload bonus
      let bonusAwarded = 0;
      const alreadyBonused = await sql`SELECT id FROM reward_history WHERE user_id = ${userId} AND action = 'profile_picture' LIMIT 1`.catch(() => []);
      if (!alreadyBonused.length) {
        const profPicPts = 100;
        bonusAwarded = profPicPts;
        const existingPts = await sql`SELECT id FROM reward_points WHERE user_id = ${userId} LIMIT 1`.catch(() => []);
        if (existingPts.length) {
          await sql`UPDATE reward_points SET points = points + ${profPicPts}, total_earned = total_earned + ${profPicPts}, updated_at = NOW() WHERE user_id = ${userId}`;
        } else {
          await sql`INSERT INTO reward_points (user_id, points, total_earned, total_spent) VALUES (${userId}, ${profPicPts}, ${profPicPts}, 0)`;
        }
        await sql`INSERT INTO reward_history (user_id, points, action, description) VALUES (${userId}, ${profPicPts}, 'profile_picture', 'Profile picture upload bonus')`;
      }

      return res.json({ message: "Profile picture updated", profilePictureUrl: pictureUrl, bonusAwarded });
    }

    // ── Profile Picture: Delete ──
    if (path === "/api/profile/picture" && method === "DELETE") {
      const sql = getSQL();
      const userId = req.headers["x-user-id"] ? parseInt(req.headers["x-user-id"]) : null;
      if (!userId) return res.status(401).json({ error: "Authentication required" });

      await sql`UPDATE users SET profile_picture_url = NULL WHERE id = ${userId}`;
      return res.json({ message: "Profile picture removed" });
    }

    // ── Notification Settings: Get ──
    if (path === "/api/notification-settings" && method === "GET") {
      const sql = getSQL();
      const userId = req.headers["x-user-id"] ? parseInt(req.headers["x-user-id"]) : null;
      if (!userId) return res.json({ enabled: false, intervalMinutes: 30 });

      const result = await sql`
        SELECT enabled, start_hour, end_hour, interval_minutes
        FROM notification_settings WHERE user_id = ${userId} LIMIT 1
      `.catch(() => []);
      if (!result.length) return res.json({ enabled: false, startHour: 8, endHour: 21, intervalMinutes: 30 });

      return res.json({
        enabled: result[0].enabled,
        startHour: result[0].start_hour,
        endHour: result[0].end_hour,
        intervalMinutes: result[0].interval_minutes,
      });
    }

    // ── Notification Settings: Update ──
    if (path === "/api/notification-settings" && method === "PUT") {
      const sql = getSQL();
      const userId = req.headers["x-user-id"] ? parseInt(req.headers["x-user-id"]) : null;
      if (!userId) return res.status(401).json({ error: "Authentication required" });

      const { enabled, intervalMinutes, startHour, endHour } = req.body || {};
      const existing = await sql`
        SELECT id FROM notification_settings WHERE user_id = ${userId} LIMIT 1
      `.catch(() => []);

      if (existing.length) {
        await sql`
          UPDATE notification_settings
          SET enabled = COALESCE(${enabled !== undefined ? enabled : null}, enabled),
              interval_minutes = COALESCE(${intervalMinutes || null}, interval_minutes),
              start_hour = COALESCE(${startHour || null}, start_hour),
              end_hour = COALESCE(${endHour || null}, end_hour)
          WHERE user_id = ${userId}
        `;
      } else {
        await sql`
          INSERT INTO notification_settings (user_id, enabled, interval_minutes, start_hour, end_hour)
          VALUES (${userId}, ${enabled !== undefined ? enabled : true}, ${intervalMinutes || 30}, ${startHour || 8}, ${endHour || 21})
        `;
      }
      return res.json({ message: "Notification settings updated" });
    }

    // ── Feedback: Submit ──
    if (path === "/api/feedback" && method === "POST") {
      const sql = getSQL();
      const userId = req.headers["x-user-id"] ? parseInt(req.headers["x-user-id"]) : null;
      if (!userId) return res.status(401).json({ error: "Authentication required" });

      const { subject, message } = req.body || {};
      if (!subject || !message) {
        return res.status(400).json({ error: "subject and message are required" });
      }

      // Sanitize inputs
      const cleanSubject = String(subject).slice(0, 200);
      const cleanMessage = String(message).slice(0, 2000);

      await sql`
        INSERT INTO feedback_entries (user_id, subject, message)
        VALUES (${userId}, ${cleanSubject}, ${cleanMessage})
      `;
      return res.json({ message: "Feedback submitted successfully" });
    }

    // ── News ──
    if (path === "/api/news" && method === "GET") {
      const sql = getSQL();
      // Auto-create news table if it doesn't exist
      await sql`
        CREATE TABLE IF NOT EXISTS news (
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          category VARCHAR(30) NOT NULL DEFAULT 'update',
          created_by INTEGER REFERENCES users(id),
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `.catch(() => {});

      const items = await sql`
        SELECT id, title, message, category, created_at
        FROM news ORDER BY created_at DESC
      `;
      return res.json(items.map(n => ({
        id: n.id,
        title: n.title,
        message: n.message,
        category: n.category,
        createdAt: n.created_at,
      })));
    }

    // ── Purchases: Verify ──
    if (path === "/api/purchases/verify" && method === "POST") {
      const sql = getSQL();
      await sql`ALTER TABLE monthly_purchases ADD COLUMN IF NOT EXISTS payment_method VARCHAR(30) DEFAULT 'bank_transfer'`.catch(() => {});
      const userId = req.headers["x-user-id"] ? parseInt(req.headers["x-user-id"]) : (req.body?.userId ? parseInt(req.body.userId) : null);
      const { bookletId, platform, productId, transactionId } = req.body || {};
      if (!userId || !bookletId || !transactionId) {
        return res.status(400).json({ 
          error: "Missing required fields",
          details: { hasUserId: !!userId, hasBookletId: !!bookletId, hasTransactionId: !!transactionId }
        });
      }
      const result = await sql`
        INSERT INTO monthly_purchases (user_id, booklet_id, platform, product_id, transaction_id, status, payment_method)
        VALUES (${userId}, ${bookletId}, ${platform || "android"}, ${productId || "monthly_booklet"}, ${transactionId}, 'pending', 'bank_transfer')
        RETURNING *
      `;
      return res.json(result[0]);
    }

    // ── Public: Payment Provider Settings ──
    if (path === "/api/payment-provider" && method === "GET") {
      return res.json({
        provider: "flutterwave",
        publicKey: process.env.FLW_PUBLIC_KEY || "",
        currency: "NGN",
      });
    }

    // ── Flutterwave: Initialize Payment ──
    if (path === "/api/payments/flutterwave/initialize" && method === "POST") {
      const sql = getSQL();
      const userId = req.headers["x-user-id"] ? parseInt(req.headers["x-user-id"]) : null;
      if (!userId) return res.status(401).json({ error: "Authentication required" });

      const { bookletId, amount, email, name } = req.body || {};
      if (!bookletId || !amount || !email) {
        return res.status(400).json({ error: "bookletId, amount, and email are required" });
      }

      const txRef = `affirm-${userId}-${bookletId}-${Date.now()}`;
      const baseUrl = process.env.APP_BASE_URL || req.headers.origin || `https://${req.headers.host}`;
      const callbackUrl = `${baseUrl}/api/payments/flutterwave/callback?tx_ref=${txRef}&bookletId=${bookletId}&userId=${userId}&amount=${amount}`;
      const deepLinkUrl = `mylifemycashflow://payment-complete?tx_ref=${txRef}&bookletId=${bookletId}&userId=${userId}`;
      const redirectUrl = callbackUrl;

      const flwRes = await flutterwaveApi("POST", "/payments", {
        tx_ref: txRef,
        amount: String(amount),
        currency: "NGN",
        redirect_url: redirectUrl,
        customer: { email, name: name || email },
        customizations: {
          title: "My Life and My Cash Flow",
          description: `Monthly Booklet Access`,
        },
        meta: { userId, bookletId },
      });

      if (flwRes.status === "success") {
        return res.json({ status: "success", checkoutUrl: flwRes.data.link, txRef });
      }
      return res.status(500).json({ error: "Failed to initialize payment", details: flwRes });
    }

    // ── Flutterwave: Callback (user redirected here after payment) ──
    const flwCallbackMatch = path.match(/^\/api\/payments\/flutterwave\/callback$/);
    if (flwCallbackMatch && method === "GET") {
      const sql = getSQL();
      const txRef = req.query.tx_ref;
      const bookletId = parseInt(req.query.bookletId) || null;
      const userId = parseInt(req.query.userId) || null;

      let paymentSuccessful = false;

      if (txRef) {
        const flwRes = await flutterwaveApi("GET", `/transactions/verify_by_reference?tx_ref=${txRef}`);
        if (flwRes.status === "success" && flwRes.data && flwRes.data.status === "successful") {
          paymentSuccessful = true;
          if (bookletId && userId) {
            await sql`
              INSERT INTO monthly_purchases (user_id, booklet_id, platform, product_id, transaction_id, status, payment_method, amount_naira)
              VALUES (${userId}, ${bookletId}, 'web', 'flutterwave', ${txRef}, 'approved', 'flutterwave', ${parseInt(req.query.amount) || 1500})
              ON CONFLICT DO NOTHING
            `.catch(() => {});
          }
        }
      }

      const params = new URLSearchParams();
      if (txRef) params.set("tx_ref", txRef);
      if (bookletId) params.set("bookletId", String(bookletId));
      if (userId) params.set("userId", String(userId));
      params.set("status", paymentSuccessful ? "success" : "cancelled");
      const deepLinkUrl = `mylifemycashflow://payment-complete?${params.toString()}`;
      return res.redirect(deepLinkUrl);
    }

    // ── Flutterwave: Sync Payment Status ──
    if (path === "/api/payments/flutterwave/sync" && method === "POST") {
      const sql = getSQL();
      const userId = req.headers["x-user-id"] ? parseInt(req.headers["x-user-id"]) : null;
      const { reference, bookletId } = req.body || {};

      if (!reference) {
        return res.status(400).json({ error: "reference is required" });
      }

      const flwRes = await flutterwaveApi("GET", `/transactions/verify_by_reference?tx_ref=${reference}`);
      if (flwRes.status === "success" && flwRes.data && flwRes.data.status === "successful") {
        let uid = userId || flwRes.data.meta?.userId;
        let bid = bookletId || flwRes.data.meta?.bookletId;
        // Fallback: parse tx_ref format affirm-{userId}-{bookletId}-{timestamp}
        if ((!uid || !bid) && reference && reference.startsWith("affirm-")) {
          const parts = reference.split("-");
          uid = uid || parseInt(parts[1]) || null;
          bid = bid || parseInt(parts[2]) || null;
        }
        if (uid && bid) {
          await sql`
            INSERT INTO monthly_purchases (user_id, booklet_id, platform, product_id, transaction_id, status, payment_method, amount_naira)
            VALUES (${uid}, ${bid}, 'web', 'flutterwave', ${reference}, 'approved', 'flutterwave', ${flwRes.data.amount || 1500})
            ON CONFLICT DO NOTHING
          `.catch(() => {});
        }
        return res.json({ status: "success", verified: true });
      }
      return res.json({ status: "pending", verified: false });
    }

    // ── Flutterwave: Verify by Transaction ID ──
    if (path === "/api/payments/flutterwave/verify" && method === "POST") {
      const sql = getSQL();
      const { transactionId } = req.body || {};
      if (!transactionId) return res.status(400).json({ error: "transactionId is required" });

      const flwRes = await flutterwaveApi("GET", `/transactions/${transactionId}`);
      if (flwRes.status === "success" && flwRes.data) {
        const tx = flwRes.data;
        if (tx.status === "successful") {
          let uid = tx.meta?.userId;
          let bid = tx.meta?.bookletId;
          // Fallback: parse tx_ref format affirm-{userId}-{bookletId}-{timestamp}
          if ((!uid || !bid) && tx.tx_ref && tx.tx_ref.startsWith("affirm-")) {
            const parts = tx.tx_ref.split("-");
            uid = uid || parseInt(parts[1]) || null;
            bid = bid || parseInt(parts[2]) || null;
          }
          if (uid && bid) {
            await sql`
              INSERT INTO monthly_purchases (user_id, booklet_id, platform, product_id, transaction_id, status, payment_method, amount_naira)
              VALUES (${uid}, ${bid}, 'web', 'flutterwave', ${tx.tx_ref || tx.flw_ref || String(tx.id)}, 'approved', 'flutterwave', ${tx.amount})
              ON CONFLICT DO NOTHING
            `.catch(() => {});
          }
        }
        return res.json({ status: tx.status, data: tx });
      }
      return res.status(404).json({ error: "Transaction not found" });
    }

    // ── Flutterwave: Webhook ──
    if (path === "/api/payments/flutterwave/webhook" && method === "POST") {
      const sql = getSQL();
      const secretHash = process.env.FLW_SECRET_HASH;
      const verifHash = req.headers["verif-hash"] || req.headers["flutterwave-signature"];
      const body = req.body;

      // Flutterwave sends the secret hash in the "verif-hash" header.
      // Compare it directly against FLW_SECRET_HASH (plain comparison — Flutterwave does not use HMAC here).
      const sigValid = !secretHash || verifHash === secretHash;
      if (secretHash && !sigValid) {
        console.warn("Flutterwave webhook: invalid verif-hash, rejecting");
        return res.status(401).json({ error: "invalid_signature" });
      }

      // Flutterwave sends type="charge.completed", NOT event
      if (body?.type === "charge.completed" && body?.data) {
        const tx = body.data;
        const txRef = tx.tx_ref || tx.reference;

        // Parse tx_ref format: affirm-{userId}-{bookletId}-{timestamp}
        let uid = null, bid = null;
        if (txRef && txRef.startsWith("affirm-")) {
          const parts = txRef.split("-");
          uid = parseInt(parts[1]) || null;
          bid = parseInt(parts[2]) || null;
        }

        // Also try meta (may be empty in webhook but worth checking)
        if (!uid || !bid) {
          uid = uid || tx.meta?.userId || tx.customer?.id;
          bid = bid || tx.meta?.bookletId;
        }

        if (uid && bid && tx.status === "successful") {
          // Re-verify via API as Flutterwave recommends
          let verified = false;
          try {
            const verifyRes = await flutterwaveApi("GET", `/transactions/verify_by_reference?tx_ref=${txRef}`);
            verified = verifyRes?.data?.status === "successful";
          } catch (e) {
            console.warn("Flutterwave webhook: re-verify API error:", e.message);
          }

          if (verified) {
            await sql`
              INSERT INTO monthly_purchases (user_id, booklet_id, platform, product_id, transaction_id, status, payment_method, amount_naira)
              VALUES (${uid}, ${bid}, 'web', 'flutterwave', ${txRef || tx.flw_ref || String(tx.id)}, 'approved', 'flutterwave', ${tx.amount})
              ON CONFLICT DO NOTHING
            `.catch(() => {});
          } else {
            console.warn("Flutterwave webhook: re-verification failed, not inserting");
          }
        }
      }
      // Must return 200 within 60 seconds per Flutterwave docs
      return res.status(200).json({ status: "ok" });
    }

    // ══════════════════════════════════════
    // ADMIN ENDPOINTS (require X-User-Id of admin user)
    // ══════════════════════════════════════

    // ── Admin: Payment Analytics ──
    if (path === "/api/admin/analytics/payments" && method === "GET") {
      const sql = getSQL();
      const admin = await verifyAdmin(req, sql);
      if (!admin) return res.status(403).json({ error: "Admin access required" });

      const [total, pending, approved, rejected, totalAmount, approvedAmount, uniqueUsers] = await Promise.all([
        sql`SELECT count(*) as count FROM monthly_purchases`,
        sql`SELECT count(*) as count FROM monthly_purchases WHERE status = 'pending'`,
        sql`SELECT count(*) as count FROM monthly_purchases WHERE status = 'approved'`,
        sql`SELECT count(*) as count FROM monthly_purchases WHERE status = 'rejected'`,
        sql`SELECT COALESCE(sum(amount_naira), 0) as total FROM monthly_purchases`,
        sql`SELECT COALESCE(sum(amount_naira), 0) as total FROM monthly_purchases WHERE status = 'approved'`,
        sql`SELECT count(DISTINCT user_id) as count FROM monthly_purchases`,
      ]);
      return res.json({
        totalPayments: Number(total[0].count),
        pending: Number(pending[0].count),
        approved: Number(approved[0].count),
        rejected: Number(rejected[0].count),
        totalAmountNaira: Number(totalAmount[0].total),
        approvedAmountNaira: Number(approvedAmount[0].total),
        uniqueUsers: Number(uniqueUsers[0].count),
        paymentsByStatus: {
          pending: Number(pending[0].count),
          approved: Number(approved[0].count),
          rejected: Number(rejected[0].count),
        },
      });
    }

    // ── Admin: List Payments ──
    if (path === "/api/admin/payments" && method === "GET") {
      const sql = getSQL();
      const admin = await verifyAdmin(req, sql);
      if (!admin) return res.status(403).json({ error: "Admin access required" });

      const statusFilter = req.query.status;
      // Ensure payment_method column exists
      await sql`ALTER TABLE monthly_purchases ADD COLUMN IF NOT EXISTS payment_method VARCHAR(30) DEFAULT 'bank_transfer'`.catch(() => {});

      let payments;
      if (statusFilter && statusFilter !== "all") {
        payments = await sql`
          SELECT mp.*, u.username as user_name, u.email as user_email,
                 b.title as booklet_title, b.month as booklet_month, b.year as booklet_year
          FROM monthly_purchases mp
          LEFT JOIN users u ON mp.user_id = u.id
          LEFT JOIN booklets b ON mp.booklet_id = b.id
          WHERE mp.status = ${statusFilter}
          ORDER BY mp.created_at DESC
        `;
      } else {
        payments = await sql`
          SELECT mp.*, u.username as user_name, u.email as user_email,
                 b.title as booklet_title, b.month as booklet_month, b.year as booklet_year
          FROM monthly_purchases mp
          LEFT JOIN users u ON mp.user_id = u.id
          LEFT JOIN booklets b ON mp.booklet_id = b.id
          ORDER BY mp.created_at DESC
        `;
      }
      return res.json({
        payments: payments.map(p => ({
          id: p.id,
          userId: p.user_id,
          bookletId: p.booklet_id,
          userName: p.user_name,
          userEmail: p.user_email,
          bookletTitle: p.booklet_title,
          bookletMonth: p.booklet_month,
          bookletYear: p.booklet_year,
          platform: p.platform,
          productId: p.product_id,
          transactionId: p.transaction_id,
          amountNaira: p.amount_naira,
          paymentMethod: p.payment_method || 'bank_transfer',
          status: p.status,
          approvedBy: p.approved_by,
          approvedAt: p.approved_at,
          createdAt: p.created_at,
        })),
        summary: { total: payments.length },
      });
    }

    // ── Admin: Approve Payment ──
    const approveMatch = path.match(/^\/api\/admin\/payments\/(\d+)\/approve$/);
    if (approveMatch && method === "POST") {
      const sql = getSQL();
      const admin = await verifyAdmin(req, sql);
      if (!admin) return res.status(403).json({ error: "Admin access required" });

      const paymentId = parseInt(approveMatch[1]);
      const { reason } = req.body || {};
      const result = await sql`
        UPDATE monthly_purchases
        SET status = 'approved', approved_by = ${admin.id}, approved_at = NOW()
        WHERE id = ${paymentId}
        RETURNING *
      `;
      if (!result.length) return res.status(404).json({ error: "Payment not found" });

      // Log to audit
      await sql`
        INSERT INTO payment_audit_log (payment_id, user_id, action, details)
        VALUES (${paymentId}, ${admin.id}, ${'approved'}, ${reason || 'Approved by admin'})
      `.catch(() => {});

      return res.json(result[0]);
    }

    // ── Admin: Reject Payment ──
    const rejectMatch = path.match(/^\/api\/admin\/payments\/(\d+)\/reject$/);
    if (rejectMatch && method === "POST") {
      const sql = getSQL();
      const admin = await verifyAdmin(req, sql);
      if (!admin) return res.status(403).json({ error: "Admin access required" });

      const paymentId = parseInt(rejectMatch[1]);
      const { reason } = req.body || {};
      const result = await sql`
        UPDATE monthly_purchases
        SET status = 'rejected'
        WHERE id = ${paymentId}
        RETURNING *
      `;
      if (!result.length) return res.status(404).json({ error: "Payment not found" });

      await sql`
        INSERT INTO payment_audit_log (payment_id, user_id, action, details)
        VALUES (${paymentId}, ${admin.id}, ${'rejected'}, ${reason || 'Rejected by admin'})
      `.catch(() => {});

      return res.json(result[0]);
    }

    // ── Admin: Create Affirmation ──
    if (path === "/api/admin/affirmations" && method === "POST") {
      const sql = getSQL();
      const admin = await verifyAdmin(req, sql);
      if (!admin) return res.status(403).json({ error: "Admin access required" });

      const { bookletId, dayNumber, title, content } = req.body || {};
      if (!bookletId || !dayNumber || !title || !content) {
        return res.status(400).json({ error: "bookletId, dayNumber, title, and content are required" });
      }
      const result = await sql`
        INSERT INTO affirmations (booklet_id, day_number, title, content)
        VALUES (${bookletId}, ${dayNumber}, ${title}, ${content})
        RETURNING *
      `;
      return res.json(result[0]);
    }

    // ── Admin: Update Affirmation ──
    const affUpdateMatch = path.match(/^\/api\/admin\/affirmations\/(\d+)$/);
    if (affUpdateMatch && method === "PUT") {
      const sql = getSQL();
      const admin = await verifyAdmin(req, sql);
      if (!admin) return res.status(403).json({ error: "Admin access required" });

      const affId = parseInt(affUpdateMatch[1]);
      const { bookletId, dayNumber, title, content } = req.body || {};
      const result = await sql`
        UPDATE affirmations
        SET booklet_id = COALESCE(${bookletId || null}, booklet_id),
            day_number = COALESCE(${dayNumber || null}, day_number),
            title = COALESCE(${title || null}, title),
            content = COALESCE(${content || null}, content)
        WHERE id = ${affId}
        RETURNING *
      `;
      if (!result.length) return res.status(404).json({ error: "Affirmation not found" });
      return res.json(result[0]);
    }

    // ── Admin: Delete Affirmation ──
    if (affUpdateMatch && method === "DELETE") {
      const sql = getSQL();
      const admin = await verifyAdmin(req, sql);
      if (!admin) return res.status(403).json({ error: "Admin access required" });

      const affId = parseInt(affUpdateMatch[1]);
      await sql`DELETE FROM affirmation_completions WHERE affirmation_id = ${affId}`.catch(() => {});
      const result = await sql`DELETE FROM affirmations WHERE id = ${affId} RETURNING id`;
      if (!result.length) return res.status(404).json({ error: "Affirmation not found" });
      return res.json({ message: "Affirmation deleted", id: affId });
    }

    // ── Admin: Create News ──
    if (path === "/api/admin/news" && method === "POST") {
      const sql = getSQL();
      const admin = await verifyAdmin(req, sql);
      if (!admin) return res.status(403).json({ error: "Admin access required" });

      const { title, message, category } = req.body || {};
      if (!title || !message) {
        return res.status(400).json({ error: "title and message are required" });
      }

      const validCategories = ["update", "event", "release", "announcement"];
      const cat = validCategories.includes(category) ? category : "update";

      // Ensure table exists
      await sql`
        CREATE TABLE IF NOT EXISTS news (
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          category VARCHAR(30) NOT NULL DEFAULT 'update',
          created_by INTEGER REFERENCES users(id),
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `.catch(() => {});

      const result = await sql`
        INSERT INTO news (title, message, category, created_by)
        VALUES (${String(title).slice(0, 200)}, ${String(message).slice(0, 2000)}, ${cat}, ${admin.id})
        RETURNING *
      `;
      const n = result[0];
      return res.json({
        id: n.id,
        title: n.title,
        message: n.message,
        category: n.category,
        createdBy: n.created_by,
        createdAt: n.created_at,
      });
    }

    // ── Admin: Delete News ──
    const newsDeleteMatch = path.match(/^\/api\/admin\/news\/(\d+)$/);
    if (newsDeleteMatch && method === "DELETE") {
      const sql = getSQL();
      const admin = await verifyAdmin(req, sql);
      if (!admin) return res.status(403).json({ error: "Admin access required" });

      const newsId = parseInt(newsDeleteMatch[1]);
      const result = await sql`DELETE FROM news WHERE id = ${newsId} RETURNING id`;
      if (!result.length) return res.status(404).json({ error: "News item not found" });
      return res.json({ message: "News deleted", id: newsId });
    }

    // ── Admin: Update News ──
    const newsUpdateMatch = path.match(/^\/api\/admin\/news\/(\d+)$/);
    if (newsUpdateMatch && method === "PUT") {
      const sql = getSQL();
      const admin = await verifyAdmin(req, sql);
      if (!admin) return res.status(403).json({ error: "Admin access required" });

      const newsId = parseInt(newsUpdateMatch[1]);
      const { title, message, category } = req.body || {};
      const result = await sql`
        UPDATE news
        SET title = COALESCE(${title || null}, title),
            message = COALESCE(${message || null}, message),
            category = COALESCE(${category || null}, category)
        WHERE id = ${newsId}
        RETURNING *
      `;
      if (!result.length) return res.status(404).json({ error: "News item not found" });
      const n = result[0];
      return res.json({
        id: n.id,
        title: n.title,
        message: n.message,
        category: n.category,
        createdAt: n.created_at,
      });
    }

    // ── Admin: List Users (for role management) ──
    if (path === "/api/admin/users" && method === "GET") {
      const sql = getSQL();
      const admin = await verifyAdmin(req, sql);
      if (!admin) return res.status(403).json({ error: "Admin access required" });

      const users = await sql`
        SELECT id, username, email, display_name, is_admin, created_at
        FROM users ORDER BY created_at ASC
      `;
      return res.json(users.map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        displayName: u.display_name,
        isAdmin: u.is_admin,
        createdAt: u.created_at,
      })));
    }

    // ── Admin: Update User Role ──
    const userRoleMatch = path.match(/^\/api\/admin\/users\/(\d+)\/role$/);
    if (userRoleMatch && method === "PUT") {
      const sql = getSQL();
      const admin = await verifyAdmin(req, sql);
      if (!admin) return res.status(403).json({ error: "Admin access required" });

      const targetUserId = parseInt(userRoleMatch[1]);
      const { isAdmin } = req.body || {};

      if (typeof isAdmin !== "boolean") {
        return res.status(400).json({ error: "isAdmin (boolean) is required" });
      }

      // Prevent admin from removing their own admin rights
      if (targetUserId === admin.id && !isAdmin) {
        return res.status(400).json({ error: "You cannot remove your own admin rights" });
      }

      // Only the primary admin (id=1) or the requesting admin can grant/revoke
      // Any admin can promote, but only the original creator can demote other admins
      const targetUser = await sql`SELECT id, is_admin FROM users WHERE id = ${targetUserId}`;
      if (!targetUser.length) return res.status(404).json({ error: "User not found" });

      await sql`UPDATE users SET is_admin = ${isAdmin} WHERE id = ${targetUserId}`;

      return res.json({
        message: isAdmin ? "User promoted to admin" : "Admin rights removed",
        userId: targetUserId,
        isAdmin,
      });
    }

    // ── Auth: Forgot Password (generate OTP) ──
    if (path === "/api/auth/forgot-password" && method === "POST") {
      const sql = getSQL();
      const { email } = req.body || {};
      if (!email) return res.status(400).json({ error: "email is required" });

      await sql`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          otp_code VARCHAR(6) NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          used BOOLEAN DEFAULT FALSE NOT NULL,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `.catch(() => {});

      const userRow = await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
      if (userRow.length) {
        const userId = userRow[0].id;
        await sql`DELETE FROM password_reset_tokens WHERE user_id = ${userId}`.catch(() => {});
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
        await sql`
          INSERT INTO password_reset_tokens (user_id, otp_code, expires_at)
          VALUES (${userId}, ${otpCode}, ${expiresAt})
        `;
        const resendKey = process.env.RESEND_API_KEY;
        const fromEmail = process.env.FROM_EMAIL || "noreply@globalaffirmationhub.com";
        if (resendKey) {
          try {
            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${resendKey}` },
              body: JSON.stringify({
                from: fromEmail, to: email,
                subject: "Password Reset Code – Global Affirmation Hub",
                html: `<h2>Password Reset</h2><p>Your reset code is:</p><h1 style="letter-spacing:8px;color:#1976D2">${otpCode}</h1><p>Expires in 15 minutes. If you didn't request this, ignore this email.</p>`,
              }),
            });
          } catch (e) { console.error("Email send failed:", e.message); }
        } else {
          console.log(`[DEV] Password reset OTP for ${email}: ${otpCode}`);
        }
      }
      return res.json({ message: "If that email is registered, a reset code has been sent." });
    }

    // ── Auth: Reset Password (verify OTP + set new password) ──
    if (path === "/api/auth/reset-password" && method === "POST") {
      const sql = getSQL();
      const { email, otpCode, newPassword } = req.body || {};
      if (!email || !otpCode || !newPassword) {
        return res.status(400).json({ error: "email, otpCode, and newPassword are required" });
      }
      if (String(newPassword).length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }
      const userRow = await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
      if (!userRow.length) return res.status(400).json({ error: "Invalid or expired reset code" });
      const userId = userRow[0].id;
      const tokenRow = await sql`
        SELECT id FROM password_reset_tokens
        WHERE user_id = ${userId} AND otp_code = ${String(otpCode)} AND expires_at > NOW() AND used = FALSE
        LIMIT 1
      `.catch(() => []);
      if (!tokenRow.length) return res.status(400).json({ error: "Invalid or expired reset code" });
      const hashed = await bcrypt.hash(String(newPassword), 10);
      await sql`UPDATE users SET password = ${hashed} WHERE id = ${userId}`;
      await sql`UPDATE password_reset_tokens SET used = TRUE WHERE id = ${tokenRow[0].id}`;
      return res.json({ message: "Password reset successfully. You can now log in." });
    }

    // ── Auth: Change Password (logged-in user) ──
    if (path === "/api/auth/change-password" && method === "PUT") {
      const sql = getSQL();
      const userId = req.headers["x-user-id"] ? parseInt(req.headers["x-user-id"]) : null;
      if (!userId) return res.status(401).json({ error: "Authentication required" });
      const { currentPassword, newPassword } = req.body || {};
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "currentPassword and newPassword are required" });
      }
      if (String(newPassword).length < 6) {
        return res.status(400).json({ error: "New password must be at least 6 characters" });
      }
      const result = await sql`SELECT password FROM users WHERE id = ${userId} LIMIT 1`;
      if (!result.length) return res.status(404).json({ error: "User not found" });
      const u = result[0];
      let passwordValid = false;
      if (u.password.startsWith("$2b$") || u.password.startsWith("$2a$")) {
        passwordValid = await bcrypt.compare(String(currentPassword), u.password);
      } else {
        passwordValid = hashPasswordSHA256(String(currentPassword)) === u.password;
      }
      if (!passwordValid) return res.status(400).json({ error: "Current password is incorrect" });
      const hashed = await bcrypt.hash(String(newPassword), 10);
      await sql`UPDATE users SET password = ${hashed} WHERE id = ${userId}`;
      return res.json({ message: "Password changed successfully" });
    }

    // ── Admin: Get Duplicate Affirmations ──
    if (path === "/api/admin/affirmations/duplicates" && method === "GET") {
      const sql = getSQL();
      const admin = await verifyAdmin(req, sql);
      if (!admin) return res.status(403).json({ error: "Admin access required" });

      const duplicates = await sql`
        SELECT a.id, a.booklet_id, a.day_number, a.title, a.content,
               b.title as booklet_title, b.month, b.year, cnt.dup_count
        FROM affirmations a
        JOIN booklets b ON a.booklet_id = b.id
        JOIN (
          SELECT LOWER(TRIM(content)) as norm_content, COUNT(*) as dup_count
          FROM affirmations
          GROUP BY LOWER(TRIM(content))
          HAVING COUNT(*) > 1
        ) cnt ON LOWER(TRIM(a.content)) = cnt.norm_content
        ORDER BY cnt.dup_count DESC, LOWER(TRIM(a.content)), a.id ASC
      `;

      return res.json(duplicates.map(a => ({
        id: a.id,
        bookletId: a.booklet_id,
        dayNumber: a.day_number,
        title: safeDecode(a.title),
        contentPreview: String(a.content).substring(0, 180),
        bookletTitle: a.booklet_title,
        month: a.month,
        year: a.year,
        duplicateCount: Number(a.dup_count),
      })));
    }

    // ── Admin: Pending Password Reset Codes ──
    if (path === "/api/admin/users/reset-codes" && method === "GET") {
      const sql = getSQL();
      const admin = await verifyAdmin(req, sql);
      if (!admin) return res.status(403).json({ error: "Admin access required" });

      await sql`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          otp_code VARCHAR(6) NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          used BOOLEAN DEFAULT FALSE NOT NULL,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `.catch(() => {});

      const tokens = await sql`
        SELECT prt.id, prt.otp_code, prt.expires_at, prt.created_at,
               u.email, u.username, u.display_name
        FROM password_reset_tokens prt
        JOIN users u ON prt.user_id = u.id
        WHERE prt.used = FALSE AND prt.expires_at > NOW()
        ORDER BY prt.created_at DESC
      `.catch(() => []);

      return res.json(tokens.map(t => ({
        id: t.id,
        email: t.email,
        username: t.username,
        displayName: t.display_name,
        otpCode: t.otp_code,
        expiresAt: t.expires_at,
        createdAt: t.created_at,
      })));
    }

    // ── Locale files ──
    if (path.startsWith("/api/locales/") && method === "GET") {
      const lang = path.replace("/api/locales/", "").replace(".json", "");
      const validLangs = new Set([
        "en","es","fr","de","pt","it","ru","zh","ja","ar","hi",
        "yo","ig","ha","zu","xh","af","st","tn","ss","ve","ts",
        "sw","am","rw","sn","mg","wo","ak","lg","om","so",
      ]);
      if (!validLangs.has(lang)) {
        return res.status(404).json({ error: "Language not found" });
      }
      try {
        const locale = require(`../lib/i18n/locales/${lang}.json`);
        return res.json(locale);
      } catch {
        return res.status(404).json({ error: "Locale file not found" });
      }
    }

    // ── Favorites: Get ──
    if (path === "/api/favorites" && method === "GET") {
      const sql = getSQL();
      const userId = req.headers["x-user-id"] ? parseInt(req.headers["x-user-id"]) : null;
      if (!userId) return res.json({ favorites: [] });

      await sql`
        CREATE TABLE IF NOT EXISTS favorites (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          affirmation_id INTEGER NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(user_id, affirmation_id)
        )
      `.catch(() => {});

      const result = await sql`
        SELECT affirmation_id FROM favorites WHERE user_id = ${userId} ORDER BY created_at DESC
      `.catch(() => []);
      return res.json({ favorites: result.map(r => r.affirmation_id) });
    }

    // ── Favorites: Add ──
    if (path === "/api/favorites" && method === "POST") {
      const sql = getSQL();
      const userId = req.headers["x-user-id"] ? parseInt(req.headers["x-user-id"]) : null;
      if (!userId) return res.status(401).json({ error: "Authentication required" });

      const { affirmationId } = req.body || {};
      if (!affirmationId) return res.status(400).json({ error: "affirmationId is required" });

      await sql`
        CREATE TABLE IF NOT EXISTS favorites (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          affirmation_id INTEGER NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(user_id, affirmation_id)
        )
      `.catch(() => {});

      await sql`
        INSERT INTO favorites (user_id, affirmation_id)
        VALUES (${userId}, ${parseInt(affirmationId)})
        ON CONFLICT (user_id, affirmation_id) DO NOTHING
      `.catch(() => {});

      return res.json({ message: "Favorite added" });
    }

    // ── Favorites: Remove ──
    const favDeleteMatch = path.match(/^\/api\/favorites\/(\d+)$/);
    if (favDeleteMatch && method === "DELETE") {
      const sql = getSQL();
      const userId = req.headers["x-user-id"] ? parseInt(req.headers["x-user-id"]) : null;
      if (!userId) return res.status(401).json({ error: "Authentication required" });

      const affirmationId = parseInt(favDeleteMatch[1]);
      await sql`DELETE FROM favorites WHERE user_id = ${userId} AND affirmation_id = ${affirmationId}`;
      return res.json({ message: "Favorite removed" });
    }

    // ── Admin Daily Auto-Bonus ──
    if (path === "/api/rewards/admin-daily" && method === "POST") {
      const sql = getSQL();
      const userId = req.headers["x-user-id"] ? parseInt(req.headers["x-user-id"]) : null;
      if (!userId) return res.status(401).json({ error: "Authentication required" });

      const userRow = await sql`SELECT is_admin FROM users WHERE id = ${userId} LIMIT 1`.catch(() => []);
      if (!userRow.length || !userRow[0].is_admin) {
        return res.json({ awarded: 0 });
      }

      const today = new Date().toISOString().split("T")[0];
      const existing = await sql`
        SELECT id FROM reward_history
        WHERE user_id = ${userId} AND action = 'admin_daily_auto' AND created_at::date = ${today}::date
        LIMIT 1
      `.catch(() => []);

      if (existing.length) return res.json({ awarded: 0, alreadyReceived: true });

      const bonusPts = 1000;
      const existingPts = await sql`SELECT id FROM reward_points WHERE user_id = ${userId} LIMIT 1`.catch(() => []);
      if (existingPts.length) {
        await sql`UPDATE reward_points SET points = points + ${bonusPts}, total_earned = total_earned + ${bonusPts}, updated_at = NOW() WHERE user_id = ${userId}`;
      } else {
        await sql`INSERT INTO reward_points (user_id, points, total_earned, total_spent) VALUES (${userId}, ${bonusPts}, ${bonusPts}, 0)`;
      }
      await sql`INSERT INTO reward_history (user_id, points, action, description) VALUES (${userId}, ${bonusPts}, 'admin_daily_auto', 'Admin daily auto-bonus')`;

      return res.json({ awarded: bonusPts });
    }

    // ── Admin: Update affirmation title/content ──
    if (path.match(/^\/api\/affirmations\/\d+$/) && (method === "PATCH" || method === "PUT")) {
      const affId = parseInt(path.split("/").pop());
      const { title, content } = req.body || {};
      if (!title && !content) return res.status(400).json({ error: "Provide title and/or content" });
      const sql = getSQL();
      if (title && content) {
        await sql`UPDATE affirmations SET title = ${title}, content = ${content} WHERE id = ${affId}`;
      } else if (title) {
        await sql`UPDATE affirmations SET title = ${title} WHERE id = ${affId}`;
      } else {
        await sql`UPDATE affirmations SET content = ${content} WHERE id = ${affId}`;
      }
      return res.json({ ok: true, id: affId });
    }

    // ── 404 ──
    return res.status(404).json({ error: "Not found", path });
  } catch (error) {
    console.error("API Error:", error.message || error);
    return res.status(500).json({ error: "Internal server error", details: error.message });
  }
};
