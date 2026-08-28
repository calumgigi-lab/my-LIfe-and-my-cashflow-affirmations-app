require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");
const API = process.env.EXPO_PUBLIC_API_URL || "https://global-affirmation-hub-1.vercel.app";

const USER_ID = 16;

(async () => {
  const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1 });

  const purchases = await sql`
    SELECT id, status, transaction_id, oasispay_lookup_ids, created_at, approved_at, amount_naira
    FROM monthly_purchases
    WHERE user_id = ${USER_ID} AND booklet_id = 300
    ORDER BY created_at ASC
  `;

  console.log("\nGladicent July (#300) — all purchase rows:\n");
  for (const p of purchases) {
    let lookupIds = [];
    try { lookupIds = JSON.parse(p.oasispay_lookup_ids || "[]"); } catch { /* */ }
    console.log(`#${p.id} ${p.status.toUpperCase()} — ref ${p.transaction_id}`);
    console.log(`  created: ${p.created_at}  approved: ${p.approved_at || "—"}`);
    console.log(`  lookup:  ${lookupIds.join(", ")}`);

    for (const ref of [p.transaction_id, ...lookupIds]) {
      if (!ref) continue;
      const verifyRes = await fetch(`${API}/api/payments/oasispay/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Id": String(USER_ID) },
        body: JSON.stringify({ reference: ref, bookletId: 300 }),
      });
      const data = await verifyRes.json().catch(() => ({}));
      console.log(`  verify(${ref.slice(0, 8)}…): HTTP ${verifyRes.status} — ${data.message || data.error || JSON.stringify(data)}`);
    }
    console.log("");
  }

  const syncRes = await fetch(`${API}/api/payments/oasispay/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-User-Id": String(USER_ID) },
    body: JSON.stringify({ bookletId: 300 }),
  });
  const syncData = await syncRes.json().catch(() => ({}));
  console.log(`Sync (current pending only): HTTP ${syncRes.status} — ${syncData.message || syncData.error || JSON.stringify(syncData)}`);

  await sql.end();
})().catch((e) => { console.error(e); process.exit(1); });
