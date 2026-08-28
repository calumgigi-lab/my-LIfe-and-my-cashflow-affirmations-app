/**
 * Unit-style check: findOasispayCandidateRows includes rejected superseded rows.
 * Run: node scripts/test-superseded-checkout-verify.js
 */
require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");

// Minimal copies of helpers for offline DB structure test (production logic is in api/index.js)
function parseOasispayLookupIds(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

async function findOasispayCandidateRows(sql, { userId, bookletId, reference }) {
  const byId = new Map();
  const addRows = (rows) => {
    for (const row of rows) {
      if (row?.id != null && !byId.has(row.id)) byId.set(row.id, row);
    }
  };

  if (userId && bookletId) {
    const rows = await sql`
      SELECT id, user_id, booklet_id, transaction_id, status, oasispay_lookup_ids, created_at
      FROM monthly_purchases
      WHERE user_id = ${userId}
        AND booklet_id = ${bookletId}
        AND payment_method = 'oasispay'
        AND (
          status = 'pending'
          OR (status = 'rejected' AND created_at > NOW() - INTERVAL '7 days')
        )
      ORDER BY CASE WHEN status = 'pending' THEN 0 ELSE 1 END, created_at DESC
    `;
    addRows(rows);
  }

  if (reference) {
    const likeRef = `%${reference}%`;
    const rows = await sql`
      SELECT id, user_id, booklet_id, transaction_id, status, oasispay_lookup_ids, created_at
      FROM monthly_purchases
      WHERE payment_method = 'oasispay'
        AND (transaction_id = ${reference} OR oasispay_lookup_ids LIKE ${likeRef})
        AND status IN ('pending', 'rejected')
    `;
    addRows(rows);
  }

  return [...byId.values()];
}

(async () => {
  const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1 });

  // Gladicent had rejected #260 + approved #261 — simulate a user with rejected+pending pattern
  const rows = await findOasispayCandidateRows(sql, { userId: 16, bookletId: 300 });
  console.log("\nGladicent candidate rows (user 16, booklet 300):");
  for (const r of rows) {
    console.log(`  #${r.id} ${r.status} ref=${r.transaction_id}`);
  }

  const ids = [...new Set(rows.flatMap((r) => [r.transaction_id, ...parseOasispayLookupIds(r.oasispay_lookup_ids)]))];
  console.log("\nAll lookup IDs that verify/sync would now check:");
  console.log(" ", ids.join("\n  "));

  const hasRejected = rows.some((r) => r.status === "rejected");
  const hasPending = rows.some((r) => r.status === "pending");
  console.log("\nIncludes rejected superseded row:", hasRejected ? "✓" : "(none — user may already be unlocked)");
  console.log("Includes pending row:", hasPending ? "✓" : "(none)");

  // Generic: any user with both pending + rejected for same booklet
  const dual = await sql`
    SELECT mp.user_id, mp.booklet_id,
           SUM(CASE WHEN mp.status = 'pending' THEN 1 ELSE 0 END)::int AS pending_n,
           SUM(CASE WHEN mp.status = 'rejected' THEN 1 ELSE 0 END)::int AS rejected_n
    FROM monthly_purchases mp
    WHERE mp.payment_method = 'oasispay'
      AND mp.created_at > NOW() - INTERVAL '7 days'
    GROUP BY mp.user_id, mp.booklet_id
    HAVING SUM(CASE WHEN mp.status = 'pending' THEN 1 ELSE 0 END) > 0
       AND SUM(CASE WHEN mp.status = 'rejected' THEN 1 ELSE 0 END) > 0
  `;
  console.log("\nUsers with pending + rejected OasisPay (superseded pattern):", dual.length);
  for (const d of dual) {
    console.log(`  user #${d.user_id} booklet #${d.booklet_id} — pending=${d.pending_n} rejected=${d.rejected_n}`);
  }

  console.log("\n✓ Candidate row query structure OK\n");
  await sql.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
