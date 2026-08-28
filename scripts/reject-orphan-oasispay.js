require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");
const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1 });
(async () => {
  const r = await sql`
    UPDATE monthly_purchases SET status = 'rejected'
    WHERE status = 'pending' AND payment_method = 'oasispay'
    RETURNING id, user_id, booklet_id, transaction_id
  `;
  console.log(`Rejected ${r.length} orphan pending OasisPay row(s):`);
  for (const row of r) {
    console.log(`  #${row.id} user=${row.user_id} booklet=${row.booklet_id} ref=${row.transaction_id}`);
  }
  await sql.end();
})().catch((e) => { console.error(e); process.exit(1); });
