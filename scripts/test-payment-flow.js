/**
 * Smoke-test payment API + DB state after OasisPay unlock fixes.
 * Usage: node scripts/test-payment-flow.js
 */
require("dotenv").config({ path: ".env.local" });

const API = process.env.EXPO_PUBLIC_API_URL || "https://global-affirmation-hub-1.vercel.app";

async function fetchJson(path) {
  const res = await fetch(`${API}${path}`);
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text.slice(0, 200) };
  }
  return { ok: res.ok, status: res.status, data };
}

(async () => {
  console.log(`Testing payment flow against ${API}\n`);

  const settings = await fetchJson("/api/settings/public");
  console.log("1. Public settings:");
  console.log(`   paymentProvider: ${settings.data?.paymentProvider ?? "?"}`);
  console.log(`   monthlyPriceNaira: ${settings.data?.monthlyPriceNaira ?? "?"}`);
  if (settings.data?.paymentProvider !== "oasispay") {
    console.warn("   ⚠ Expected paymentProvider=oasispay");
  } else {
    console.log("   ✓ OasisPay is active");
  }

  if (!process.env.DATABASE_URL) {
    console.log("\n2. DB checks skipped (no DATABASE_URL)");
    return;
  }

  const postgres = require("postgres");
  const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1 });

  const [pendingOasis, pendingManual, approvedOasis, stuckSample] = await Promise.all([
    sql`SELECT count(*)::int AS n FROM monthly_purchases WHERE status = 'pending' AND payment_method = 'oasispay'`,
    sql`SELECT count(*)::int AS n FROM monthly_purchases WHERE status = 'pending' AND COALESCE(payment_method, 'bank_transfer') = 'bank_transfer'`,
    sql`SELECT count(*)::int AS n FROM monthly_purchases WHERE status = 'approved' AND payment_method = 'oasispay'`,
    sql`
      SELECT mp.id, mp.user_id, mp.booklet_id, mp.transaction_id, mp.status, u.email
      FROM monthly_purchases mp
      LEFT JOIN users u ON u.id = mp.user_id
      WHERE mp.payment_method = 'oasispay'
      ORDER BY mp.created_at DESC
      LIMIT 3
    `,
  ]);

  console.log("\n2. Database payment counts:");
  console.log(`   pending OasisPay (should reconcile to 0): ${pendingOasis[0].n}`);
  console.log(`   pending manual/bank_transfer (admin queue): ${pendingManual[0].n}`);
  console.log(`   approved OasisPay: ${approvedOasis[0].n}`);

  if (stuckSample.length) {
    console.log("\n3. Recent OasisPay purchases:");
    for (const row of stuckSample) {
      console.log(`   #${row.id} user=${row.user_id} (${row.email}) booklet=${row.booklet_id} status=${row.status} ref=${row.transaction_id}`);
    }
  }

  const adminUser = await sql`SELECT id FROM users WHERE is_admin = TRUE LIMIT 1`;
  if (adminUser.length) {
    const adminPayments = await fetch(`${API}/api/admin/payments?status=pending`, {
      headers: { "X-User-Id": String(adminUser[0].id) },
    });
    const adminData = await adminPayments.json();
    const oasisInAdmin = (adminData.payments || []).filter(
      (p) => p.paymentMethod === "oasispay" || p.paymentMethod === "paystack",
    );
    console.log("\n4. Admin pending queue (live API):");
    console.log(`   total pending shown: ${adminData.payments?.length ?? 0}`);
    console.log(`   automated in queue: ${oasisInAdmin.length} (should be 0 after deploy)`);
    if (oasisInAdmin.length === 0) {
      console.log("   ✓ No OasisPay/Paystack in admin approval queue");
    } else {
      console.warn("   ⚠ Deploy latest api/index.js — automated payments still in admin queue");
    }
  }

  await sql.end();
  console.log("\nDone.");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
