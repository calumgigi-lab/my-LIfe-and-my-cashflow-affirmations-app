require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");
const API = process.env.EXPO_PUBLIC_API_URL || "https://global-affirmation-hub-1.vercel.app";
const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1 });

(async () => {
  const userId = 79;
  const res = await fetch(`${API}/api/booklets/access`, {
    headers: { "X-User-Id": String(userId) },
  });
  const data = await res.json();
  console.log("booklets/access for user 79:");
  console.log(JSON.stringify(data, null, 2));

  const before = await sql`SELECT count(*)::int AS n FROM monthly_purchases WHERE user_id = ${userId} AND status = 'pending'`;
  console.log("\nPending rows in DB:", before[0].n);

  await sql.end();
})().catch((e) => { console.error(e); process.exit(1); });
