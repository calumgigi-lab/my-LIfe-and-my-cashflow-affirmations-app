/**
 * Reconcile stuck OasisPay rows by calling the live verify API (uses Vercel env keys).
 * Usage: node scripts/reconcile-via-api.js
 */
require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");

const API = process.env.EXPO_PUBLIC_API_URL || "https://global-affirmation-hub-1.vercel.app";
const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1 });

(async () => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");

  const pendingRows = await sql`
    SELECT id, user_id, booklet_id, transaction_id
    FROM monthly_purchases
    WHERE status = 'pending' AND payment_method = 'oasispay' AND transaction_id IS NOT NULL
    ORDER BY created_at DESC
  `;

  console.log(`Reconciling ${pendingRows.length} pending OasisPay row(s) via ${API}\n`);

  let approved = 0;
  let failed = 0;

  for (const row of pendingRows) {
    const label = `#${row.id} user=${row.user_id} booklet=${row.booklet_id} ref=${row.transaction_id}`;
    try {
      const res = await fetch(`${API}/api/payments/oasispay/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": String(row.user_id),
        },
        body: JSON.stringify({ reference: row.transaction_id, bookletId: row.booklet_id }),
      });
      const data = await res.json();
      if (res.ok) {
        console.log(`✓ ${label} → ${data.message || "unlocked"} (alreadyUnlocked=${!!data.alreadyUnlocked})`);
        approved += 1;
      } else {
        console.log(`… ${label} → ${data.error || res.status}`);
        failed += 1;
      }
    } catch (e) {
      console.log(`! ${label} → ${e.message}`);
      failed += 1;
    }
  }

  const after = await sql`
    SELECT count(*)::int AS n FROM monthly_purchases WHERE status = 'pending' AND payment_method = 'oasispay'
  `;
  console.log(`\nRemaining pending OasisPay: ${after[0].n}`);
  console.log(`Results: ${approved} verified/unlocked, ${failed} not yet paid or failed`);

  await sql.end();
})().catch((e) => {
  console.error(e);
  sql.end().catch(() => {});
  process.exit(1);
});
