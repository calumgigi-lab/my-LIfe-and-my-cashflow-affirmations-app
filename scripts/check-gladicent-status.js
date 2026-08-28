require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");
const API = process.env.EXPO_PUBLIC_API_URL || "https://global-affirmation-hub-1.vercel.app";

(async () => {
  const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1 });

  const mp = await sql`
    SELECT id, status, transaction_id, approved_at, created_at
    FROM monthly_purchases WHERE user_id = 16 AND booklet_id = 300 ORDER BY id
  `;
  console.log("Purchases:", mp);

  const audit = await sql`
    SELECT payment_id, user_id, action, details, created_at
    FROM payment_audit_log
    WHERE payment_id IN (260, 261)
    ORDER BY created_at DESC
  `.catch(() => []);
  console.log("Audit:", audit);

  const accessRes = await fetch(`${API}/api/booklets/access`, {
    headers: { "X-User-Id": "16" },
  });
  console.log("Access:", await accessRes.json());

  await sql.end();
})().catch((e) => { console.error(e); process.exit(1); });
