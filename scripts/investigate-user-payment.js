require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");
const API = process.env.EXPO_PUBLIC_API_URL || "https://global-affirmation-hub-1.vercel.app";
const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1 });

(async () => {
  const users = await sql`
    SELECT id, username, email, display_name FROM users
    WHERE username ILIKE '%nana%' OR email ILIKE '%nana%' OR display_name ILIKE '%nana%'
    ORDER BY id DESC LIMIT 5
  `;
  console.log("Users matching 'nana':");
  for (const u of users) console.log(`  #${u.id} ${u.username} (${u.email}) display=${u.display_name}`);

  if (!users.length) {
    await sql.end();
    return;
  }

  for (const user of users) {
    console.log(`\n=== User #${user.id} ${user.username} ===`);
    const purchases = await sql`
      SELECT id, booklet_id, status, payment_method, transaction_id, amount_naira, approved_at, created_at
      FROM monthly_purchases WHERE user_id = ${user.id}
      ORDER BY created_at DESC LIMIT 10
    `;
    console.log(`Purchases (${purchases.length}):`);
    for (const p of purchases) {
      console.log(`  #${p.id} booklet=${p.booklet_id} ${p.status} ${p.payment_method} ref=${p.transaction_id} @ ${p.created_at}`);
    }

    const accessRes = await fetch(`${API}/api/booklets/access`, {
      headers: { "X-User-Id": String(user.id) },
    });
    const access = await accessRes.json();
    console.log("Access:", JSON.stringify(access));

    for (const p of purchases.filter((x) => x.payment_method === "oasispay" && x.status !== "approved")) {
      if (!p.transaction_id) continue;
      console.log(`\nTrying verify for ref=${p.transaction_id} booklet=${p.booklet_id}...`);
      const verifyRes = await fetch(`${API}/api/payments/oasispay/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Id": String(user.id) },
        body: JSON.stringify({ reference: p.transaction_id, bookletId: p.booklet_id }),
      });
      const verifyData = await verifyRes.json();
      console.log(`  Verify: ${verifyRes.status}`, verifyData);
    }
  }

  await sql.end();
})().catch((e) => { console.error(e); process.exit(1); });
