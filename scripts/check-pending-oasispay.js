require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");

const API = process.env.EXPO_PUBLIC_API_URL || "https://global-affirmation-hub-1.vercel.app";
const OASISPAY_API_BASE = "https://api.oasispayhq.com/api/v1";

async function oasispayGet(id) {
  const res = await fetch(`${OASISPAY_API_BASE}/payments/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${process.env.OASISPAY_SECRET_KEY}` },
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

(async () => {
  const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1 });
  const rows = await sql`
    SELECT id, user_id, booklet_id, status, transaction_id, oasispay_lookup_ids, created_at
    FROM monthly_purchases
    WHERE status = 'pending' AND payment_method = 'oasispay'
    ORDER BY created_at DESC
  `;

  console.log(`Pending OasisPay rows: ${rows.length}\n`);

  for (const row of rows) {
    console.log(`#${row.id} user=${row.user_id} booklet=${row.booklet_id} ref=${row.transaction_id}`);
    let lookupIds = [];
    try {
      lookupIds = JSON.parse(row.oasispay_lookup_ids || "[]");
    } catch {
      lookupIds = [];
    }
    const ids = [...new Set([row.transaction_id, ...lookupIds].filter(Boolean))];
    console.log("  lookup IDs:", ids.join(", "));
    for (const id of ids) {
      const r = await oasispayGet(id);
      const p = r.data?.data ?? r.data;
      console.log(`    GET ${id} → HTTP ${r.status} status=${p?.status ?? p?.paymentStatus ?? "?"}`);
    }
    const sync = await fetch(`${API}/api/payments/oasispay/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Id": String(row.user_id) },
      body: JSON.stringify({ bookletId: row.booklet_id }),
    });
    console.log(`  sync → ${sync.status}`, await sync.json());
    console.log("");
  }

  await sql.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
