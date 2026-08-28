require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");
const API = process.env.EXPO_PUBLIC_API_URL || "https://global-affirmation-hub-1.vercel.app";

(async () => {
  const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1 });

  const users = await sql`
    SELECT id, username, email, display_name, created_at
    FROM users
    WHERE LOWER(username) LIKE '%gladicent%'
       OR LOWER(email) LIKE '%gladicent%'
       OR LOWER(display_name) LIKE '%gladicent%'
    ORDER BY id
  `;

  if (!users.length) {
    console.log("No user found matching Gladicent.");
    await sql.end();
    return;
  }

  for (const user of users) {
    console.log("\n" + "=".repeat(72));
    console.log(`USER #${user.id} — ${user.username}`);
    console.log("=".repeat(72));
    console.log(`  Email:        ${user.email}`);
    console.log(`  Display name: ${user.display_name || "(none)"}`);
    console.log(`  Joined:       ${user.created_at}`);

    const purchases = await sql`
      SELECT
        mp.id,
        mp.booklet_id,
        b.title AS booklet_title,
        b.month,
        b.year,
        mp.status,
        mp.payment_method,
        mp.platform,
        mp.product_id,
        mp.transaction_id,
        mp.amount_naira,
        mp.oasispay_lookup_ids,
        mp.created_at,
        mp.approved_at
      FROM monthly_purchases mp
      LEFT JOIN booklets b ON b.id = mp.booklet_id
      WHERE mp.user_id = ${user.id}
      ORDER BY mp.created_at DESC
    `;

    const unlocked = await sql`
      SELECT booklet_id FROM monthly_purchases
      WHERE user_id = ${user.id} AND status = 'approved'
      ORDER BY booklet_id
    `;

    console.log(`\n  Unlocked booklets: ${unlocked.map((r) => r.booklet_id).join(", ") || "(none)"}`);

    const accessRes = await fetch(`${API}/api/booklets/access`, {
      headers: { "X-User-Id": String(user.id) },
    });
    const access = await accessRes.json().catch(() => ({}));
    console.log(`  App access:        unlocked=${(access.unlockedBookletIds || []).join(", ") || "none"}, pending=${(access.pendingBookletIds || []).join(", ") || "none"}, confirming=${(access.confirmingBookletIds || []).join(", ") || "none"}`);
    console.log(`\n  All transactions (${purchases.length}):\n`);

    for (const r of purchases) {
      let lookupIds = [];
      try {
        lookupIds = JSON.parse(r.oasispay_lookup_ids || "[]");
      } catch {
        lookupIds = [];
      }

      console.log(`  ── Purchase #${r.id} — ${r.status.toUpperCase()} ──`);
      console.log(`     Booklet:    #${r.booklet_id} — ${r.booklet_title} (${r.month}/${r.year})`);
      console.log(`     Method:     ${r.payment_method}`);
      console.log(`     Platform:   ${r.platform || "?"}`);
      console.log(`     Product:    ${r.product_id || "?"}`);
      console.log(`     Amount:     ₦${r.amount_naira ?? "?"}`);
      console.log(`     Reference:  ${r.transaction_id}`);
      console.log(`     Lookup IDs: ${lookupIds.length ? lookupIds.join(", ") : "(none)"}`);
      console.log(`     Created:    ${r.created_at}`);
      console.log(`     Approved:   ${r.approved_at || "(not approved)"}`);

      if (r.payment_method === "oasispay" && r.status !== "approved") {
        console.log(`     Live verify (production API):`);
        const verifyRes = await fetch(`${API}/api/payments/oasispay/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-User-Id": String(user.id) },
          body: JSON.stringify({ reference: r.transaction_id, bookletId: r.booklet_id }),
        });
        const verifyData = await verifyRes.json().catch(() => ({}));
        console.log(`       HTTP ${verifyRes.status}: ${verifyData.message || verifyData.error || JSON.stringify(verifyData)}`);
        if (verifyData.status) console.log(`       Gateway status: ${verifyData.status}`);
      }
      console.log("");
    }
  }

  console.log("=".repeat(72));
  await sql.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
