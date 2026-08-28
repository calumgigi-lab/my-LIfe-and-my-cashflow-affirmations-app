require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");
const API = process.env.EXPO_PUBLIC_API_URL || "https://global-affirmation-hub-1.vercel.app";
const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1 });

(async () => {
  const before = await sql`
    SELECT id, status FROM monthly_purchases
    WHERE user_id = 79 AND booklet_id = 299 AND payment_method = 'oasispay'
    ORDER BY id
  `;
  console.log("Before init:", before.map((r) => `${r.id}:${r.status}`).join(", "));

  const init = await fetch(`${API}/api/payments/oasispay/initialize`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-User-Id": "79" },
    body: JSON.stringify({ bookletId: 299, platform: "android" }),
  });
  console.log("Init status:", init.status);

  const after = await sql`
    SELECT id, status FROM monthly_purchases
    WHERE user_id = 79 AND booklet_id = 299 AND payment_method = 'oasispay'
    ORDER BY id
  `;
  console.log("After init:", after.map((r) => `${r.id}:${r.status}`).join(", "));

  const pending = after.filter((r) => r.status === "pending");
  console.log("Pending count:", pending.length, pending.length === 1 ? "✓ OK" : "✗ FAIL");

  const access = await fetch(`${API}/api/booklets/access`, { headers: { "X-User-Id": "79" } });
  const ad = await access.json();
  console.log("confirmingBookletIds:", ad.confirmingBookletIds);

  const approved = await sql`
    SELECT user_id, booklet_id, transaction_id FROM monthly_purchases
    WHERE status = 'approved' AND payment_method = 'oasispay'
    ORDER BY approved_at DESC NULLS LAST LIMIT 1
  `;
  if (approved.length) {
    const row = approved[0];
    const rev = await fetch(`${API}/api/payments/oasispay/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Id": String(row.user_id) },
      body: JSON.stringify({ reference: row.transaction_id, bookletId: row.booklet_id }),
    });
    console.log("Approved re-verify:", rev.status, await rev.json());
  }

  await sql.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
