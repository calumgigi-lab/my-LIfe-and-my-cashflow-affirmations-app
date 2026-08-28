require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");
const OASISPAY_API_BASE = "https://api.oasispayhq.com/api/v1";

(async () => {
  const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1 });

  const rows = await sql`
    SELECT
      mp.id,
      mp.user_id,
      u.username,
      u.email,
      u.display_name,
      mp.booklet_id,
      b.title AS booklet_title,
      b.month,
      b.year,
      mp.status,
      mp.payment_method,
      mp.transaction_id,
      mp.amount_naira,
      mp.oasispay_lookup_ids,
      mp.created_at,
      mp.approved_at
    FROM monthly_purchases mp
    LEFT JOIN users u ON u.id = mp.user_id
    LEFT JOIN booklets b ON b.id = mp.booklet_id
    WHERE mp.status = 'pending' AND mp.payment_method = 'oasispay'
    ORDER BY mp.created_at DESC
  `;

  console.log(`\nPending OasisPay rows: ${rows.length}\n`);
  console.log("=".repeat(72));

  for (const r of rows) {
    let lookupIds = [];
    try {
      lookupIds = JSON.parse(r.oasispay_lookup_ids || "[]");
    } catch {
      lookupIds = [];
    }

    let gatewayStatus = "unknown";
    let gatewayId = null;
    if (process.env.OASISPAY_SECRET_KEY) {
      for (const id of [...new Set([r.transaction_id, ...lookupIds].filter(Boolean))]) {
        try {
          const res = await fetch(`${OASISPAY_API_BASE}/payments/${encodeURIComponent(id)}`, {
            headers: { Authorization: `Bearer ${process.env.OASISPAY_SECRET_KEY}` },
          });
          const data = await res.json().catch(() => ({}));
          const p = data?.data ?? data;
          if (res.ok) {
            gatewayStatus = p?.status || p?.paymentStatus || "unknown";
            gatewayId = id;
            break;
          }
        } catch {
          /* try next */
        }
      }
    }

    console.log(`\n#${r.id} — ${r.status.toUpperCase()}`);
    console.log(`  User:       #${r.user_id} ${r.username || "?"} (${r.email})`);
    if (r.display_name) console.log(`  Name:       ${r.display_name}`);
    console.log(`  Booklet:    #${r.booklet_id} — ${r.booklet_title || "?"} (${r.month}/${r.year})`);
    console.log(`  Amount:     ₦${r.amount_naira ?? "?"}`);
    console.log(`  Reference:  ${r.transaction_id}`);
    console.log(`  Lookup IDs: ${lookupIds.join(", ") || "(none)"}`);
    console.log(`  Created:    ${r.created_at}`);
    if (process.env.OASISPAY_SECRET_KEY) {
      console.log(`  OasisPay:   ${gatewayStatus}${gatewayId ? ` (via ${gatewayId})` : ""}`);
    } else {
      console.log(`  OasisPay:   (set OASISPAY_SECRET_KEY in .env.local to check gateway)`);
    }
  }

  console.log("\n" + "=".repeat(72));
  console.log(
    "\nNote: status=pending on OasisPay means checkout was started but payment was not completed.",
  );
  console.log("These do NOT require admin approval — user can pay again or pull to refresh after paying.\n");

  await sql.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
