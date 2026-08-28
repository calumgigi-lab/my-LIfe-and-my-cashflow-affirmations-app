require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");

(async () => {
  const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1 });

  const tz = await sql`
    SELECT NOW() AS db_now, CURRENT_DATE AS db_today, CURRENT_TIME AS db_time
  `;
  console.log("Local machine:", new Date().toString());
  console.log("DB server:    ", tz[0]);

  const recent = await sql`
    SELECT mp.id, mp.status, mp.payment_method, mp.approved_at, mp.created_at,
           u.username, u.email, b.title
    FROM monthly_purchases mp
    LEFT JOIN users u ON u.id = mp.user_id
    LEFT JOIN booklets b ON b.id = mp.booklet_id
    WHERE mp.status = 'approved'
    ORDER BY mp.approved_at DESC NULLS LAST
    LIMIT 5
  `;
  console.log("\nLast 5 approved payments:");
  for (const r of recent) {
    console.log(
      `  #${r.id} ${r.payment_method} — ${r.username} — approved ${r.approved_at} — ${r.title}`
    );
  }

  await sql.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
