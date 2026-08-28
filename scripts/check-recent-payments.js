require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");
const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1 });

(async () => {
  const recentUsers = await sql`
    SELECT id, username, email, created_at FROM users
    ORDER BY created_at DESC LIMIT 10
  `;
  console.log("Recent users:");
  for (const u of recentUsers) console.log(`  #${u.id} ${u.username} (${u.email}) @ ${u.created_at}`);

  const recentPurchases = await sql`
    SELECT mp.id, mp.user_id, u.username, mp.booklet_id, mp.status, mp.payment_method, mp.transaction_id, mp.created_at
    FROM monthly_purchases mp
    LEFT JOIN users u ON u.id = mp.user_id
    ORDER BY mp.created_at DESC LIMIT 15
  `;
  console.log("\nRecent purchases:");
  for (const p of recentPurchases) {
    console.log(`  #${p.id} user=${p.user_id}(${p.username}) booklet=${p.booklet_id} ${p.status} ${p.payment_method} ref=${p.transaction_id} @ ${p.created_at}`);
  }

  const approvedOasis = await sql`
    SELECT mp.*, u.username FROM monthly_purchases mp
    LEFT JOIN users u ON u.id = mp.user_id
    WHERE mp.payment_method = 'oasispay' AND mp.status = 'approved'
    ORDER BY mp.created_at DESC
  `;
  console.log(`\nApproved OasisPay (${approvedOasis.length}):`);
  for (const p of approvedOasis) {
    console.log(`  #${p.id} user=${p.user_id}(${p.username}) booklet=${p.booklet_id} ref=${p.transaction_id}`);
  }

  await sql.end();
})().catch((e) => { console.error(e); process.exit(1); });
