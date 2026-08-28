require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");
const API = process.env.EXPO_PUBLIC_API_URL || "https://global-affirmation-hub-1.vercel.app";
const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1 });

(async () => {
  const recent = await sql`
    SELECT mp.id, mp.user_id, u.username, mp.booklet_id, mp.status, mp.payment_method,
           mp.transaction_id, mp.created_at, mp.approved_at
    FROM monthly_purchases mp
    LEFT JOIN users u ON u.id = mp.user_id
    WHERE mp.payment_method = 'oasispay'
    ORDER BY mp.created_at DESC
    LIMIT 12
  `;
  console.log("Recent OasisPay purchases:\n");
  for (const p of recent) {
    console.log(`  #${p.id} ${p.username}(${p.user_id}) booklet=${p.booklet_id} ${p.status} ref=${p.transaction_id} @ ${p.created_at}`);
  }

  const pending = await sql`
    SELECT mp.*, u.username FROM monthly_purchases mp
    LEFT JOIN users u ON u.id = mp.user_id
    WHERE mp.status = 'pending' AND mp.payment_method = 'oasispay'
    ORDER BY mp.created_at DESC
  `;
  console.log(`\nPending OasisPay: ${pending.length}`);
  for (const p of pending) {
    console.log(`  #${p.id} ${p.username} booklet=${p.booklet_id} ref=${p.transaction_id}`);
    const res = await fetch(`${API}/api/payments/oasispay/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Id": String(p.user_id) },
      body: JSON.stringify({ reference: p.transaction_id, bookletId: p.booklet_id }),
    });
    const data = await res.json();
    console.log(`    verify → ${res.status}`, data);
  }

  await sql.end();
})().catch((e) => { console.error(e); process.exit(1); });
