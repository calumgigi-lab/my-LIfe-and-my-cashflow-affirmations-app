require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");

(async () => {
  const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1 });

  const today = await sql`
    SELECT
      mp.id,
      mp.user_id,
      u.username,
      u.email,
      mp.booklet_id,
      b.title AS booklet_title,
      b.month,
      b.year,
      mp.status,
      mp.payment_method,
      mp.transaction_id,
      mp.amount_naira,
      mp.created_at,
      mp.approved_at
    FROM monthly_purchases mp
    LEFT JOIN users u ON u.id = mp.user_id
    LEFT JOIN booklets b ON b.id = mp.booklet_id
    WHERE mp.created_at >= CURRENT_DATE
       OR mp.approved_at >= CURRENT_DATE
    ORDER BY COALESCE(mp.approved_at, mp.created_at) DESC
  `;

  const approvedToday = today.filter((r) => r.status === "approved" && r.approved_at);
  const pendingToday = today.filter((r) => r.status === "pending");
  const rejectedToday = today.filter((r) => r.status === "rejected");

  console.log(`\nPayments activity today (${new Date().toDateString()})\n`);
  console.log("=".repeat(72));

  console.log(`\n✅ APPROVED (successful unlocks): ${approvedToday.length}`);
  if (approvedToday.length === 0) {
    console.log("   None today.");
  } else {
    for (const r of approvedToday) {
      console.log(`\n  #${r.id} — ${r.payment_method}`);
      console.log(`    User:     #${r.user_id} ${r.username} (${r.email})`);
      console.log(`    Booklet:  #${r.booklet_id} — ${r.booklet_title} (${r.month}/${r.year})`);
      console.log(`    Amount:   ₦${r.amount_naira}`);
      console.log(`    Ref:      ${r.transaction_id}`);
      console.log(`    Approved: ${r.approved_at}`);
    }
  }

  console.log(`\n⏳ PENDING (checkout started, not paid): ${pendingToday.length}`);
  if (pendingToday.length === 0) {
    console.log("   None today.");
  } else {
    for (const r of pendingToday) {
      console.log(`\n  #${r.id} — ${r.payment_method}`);
      console.log(`    User:     #${r.user_id} ${r.username} (${r.email})`);
      console.log(`    Booklet:  #${r.booklet_id} — ${r.booklet_title}`);
      console.log(`    Started:  ${r.created_at}`);
      console.log(`    Ref:      ${r.transaction_id}`);
    }
  }

  if (rejectedToday.length) {
    console.log(`\n❌ REJECTED / superseded today: ${rejectedToday.length}`);
    for (const r of rejectedToday) {
      console.log(`  #${r.id} user=#${r.user_id} booklet=#${r.booklet_id} ${r.payment_method} @ ${r.created_at}`);
    }
  }

  const oasisApproved = approvedToday.filter((r) => r.payment_method === "oasispay");
  const bankApproved = approvedToday.filter((r) => r.payment_method === "bank_transfer");
  const pointsApproved = approvedToday.filter((r) => r.payment_method === "points");

  console.log("\n" + "=".repeat(72));
  console.log("\nSummary:");
  console.log(`  Successful payments today:  ${approvedToday.length}`);
  console.log(`    OasisPay:                 ${oasisApproved.length}`);
  console.log(`    Bank transfer (admin):    ${bankApproved.length}`);
  console.log(`    Reward points:            ${pointsApproved.length}`);
  console.log(`  Unpaid checkouts today:     ${pendingToday.length}`);
  console.log("");

  await sql.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
