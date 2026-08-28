require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");
const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1 });

(async () => {
  const userId = 79;
  const rows = await sql`
    SELECT id, booklet_id, status, payment_method, transaction_id, amount_naira, approved_at, created_at
    FROM monthly_purchases WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;
  console.log(`User ${userId} purchases (${rows.length}):`);
  for (const r of rows) {
    console.log(`  #${r.id} booklet=${r.booklet_id} ${r.status} ${r.payment_method} ref=${r.transaction_id} created=${r.created_at}`);
  }

  const approved = await sql`
    SELECT booklet_id FROM monthly_purchases WHERE user_id = ${userId} AND status = 'approved'
  `;
  console.log("\nUnlocked booklet IDs:", approved.map((a) => a.booklet_id).join(", ") || "(none)");

  await sql.end();
})().catch((e) => { console.error(e); process.exit(1); });
