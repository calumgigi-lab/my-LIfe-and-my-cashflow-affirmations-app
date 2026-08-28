/**
 * Full payment flow verification against live API + DB.
 * Usage: node scripts/verify-payment-flow-full.js
 */
require("dotenv").config({ path: ".env.local" });

const API = process.env.EXPO_PUBLIC_API_URL || "https://global-affirmation-hub-1.vercel.app";
const OASISPAY_API_BASE = "https://api.oasispayhq.com/api/v1";

const results = [];

function pass(label, detail = "") {
  results.push({ ok: true, label, detail });
  console.log(`✓ ${label}${detail ? ` — ${detail}` : ""}`);
}

function fail(label, detail = "") {
  results.push({ ok: false, label, detail });
  console.log(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
}

function warn(label, detail = "") {
  results.push({ ok: "warn", label, detail });
  console.log(`⚠ ${label}${detail ? ` — ${detail}` : ""}`);
}

async function fetchJson(path, options) {
  const res = await fetch(`${API}${path}`, options);
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text.slice(0, 300) };
  }
  return { ok: res.ok, status: res.status, data };
}

(async () => {
  console.log(`\n=== Payment flow verification ===\nAPI: ${API}\n`);

  const health = await fetchJson("/api/health");
  if (health.ok && health.data?.status === "ok") pass("API health");
  else fail("API health", `${health.status} ${JSON.stringify(health.data)}`);

  const settings = await fetchJson("/api/settings/public");
  if (settings.data?.paymentProvider === "oasispay") pass("OasisPay active");
  else fail("OasisPay active", `provider=${settings.data?.paymentProvider}`);

  if (settings.data?.paymentWhatsappUrl) fail("WhatsApp URL removed from public settings");
  else pass("No payment WhatsApp URL in settings");

  if (settings.data?.monthlyPriceNaira > 0) pass("Monthly price configured", `₦${settings.data.monthlyPriceNaira}`);
  else fail("Monthly price configured");

  const callback = await fetch(`${API}/api/payments/oasispay/callback?reference=test_ref`);
  const callbackText = await callback.text();
  if (callback.ok && callbackText.includes("mylifemycashflow://payment-complete")) {
    pass("Payment callback returns deep link HTML");
  } else {
    fail("Payment callback", `status=${callback.status}`);
  }

  if (!process.env.DATABASE_URL) {
    warn("DB tests skipped", "DATABASE_URL not set");
    summarize();
    return;
  }

  const postgres = require("postgres");
  const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1 });

  const testUser = await sql`
    SELECT id, email FROM users WHERE email IS NOT NULL ORDER BY id ASC LIMIT 1
  `;
  if (!testUser.length) {
    fail("Test user exists");
    await sql.end();
    summarize();
    return;
  }
  const userId = testUser[0].id;

  const lockedBooklet = await sql`
    SELECT b.id FROM booklets b
    WHERE NOT EXISTS (
      SELECT 1 FROM monthly_purchases mp
      WHERE mp.user_id = ${userId} AND mp.booklet_id = b.id AND mp.status = 'approved'
    )
    ORDER BY b.year DESC, b.month DESC
    LIMIT 1
  `;

  if (!lockedBooklet.length) {
    warn("No locked booklet for init test", "skipping initialize test");
  } else {
    const bookletId = lockedBooklet[0].id;

    const init = await fetchJson("/api/payments/oasispay/initialize", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Id": String(userId) },
      body: JSON.stringify({ bookletId, platform: "android", productId: "verify_flow_test" }),
    });

    if (init.ok && init.data?.authorizationUrl && init.data?.reference) {
      pass("Initialize returns checkout URL + reference");
    } else {
      fail("Initialize", `${init.status} ${init.data?.error || JSON.stringify(init.data)}`);
    }

    const afterPending = await sql`
      SELECT id, transaction_id, oasispay_lookup_ids FROM monthly_purchases
      WHERE user_id = ${userId} AND booklet_id = ${bookletId} AND payment_method = 'oasispay' AND status = 'pending'
      ORDER BY created_at DESC LIMIT 1
    `;

    if (afterPending.length) {
      pass("Initialize creates pending OasisPay row with lookup IDs");
      let lookupIds = [];
      try {
        lookupIds = JSON.parse(afterPending[0].oasispay_lookup_ids || "[]");
      } catch {
        lookupIds = [];
      }
      if (lookupIds.length >= 2) pass("Lookup IDs stored", lookupIds.join(", "));
      else fail("Lookup IDs stored", JSON.stringify(lookupIds));

      const verifyUnpaid = await fetchJson("/api/payments/oasispay/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Id": String(userId) },
        body: JSON.stringify({ reference: afterPending[0].transaction_id, bookletId }),
      });
      if (!verifyUnpaid.ok) pass("Verify rejects unpaid checkout", verifyUnpaid.data?.error);
      else fail("Verify rejects unpaid checkout", "unexpected success");

      const syncUnpaid = await fetchJson("/api/payments/oasispay/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Id": String(userId) },
        body: JSON.stringify({ bookletId }),
      });
      if (!syncUnpaid.ok) pass("Sync rejects unpaid checkout", syncUnpaid.data?.error);
      else fail("Sync rejects unpaid checkout", "unexpected success");

      const access = await fetchJson("/api/booklets/access", {
        headers: { "X-User-Id": String(userId) },
      });
      const confirming = access.data?.confirmingBookletIds || [];
      const adminPending = access.data?.pendingBookletIds || [];
      if (confirming.includes(bookletId) && !adminPending.includes(bookletId)) {
        pass("Access API: confirming vs admin pending separated");
      } else {
        fail(
          "Access API separation",
          `confirming=${confirming.includes(bookletId)} adminPending=${adminPending.includes(bookletId)}`,
        );
      }

      const bookletAccess = await fetchJson(`/api/booklets/${bookletId}/access`, {
        headers: { "X-User-Id": String(userId) },
      });
      if (bookletAccess.data?.hasConfirmingPayment && !bookletAccess.data?.hasPendingPayment) {
        pass("Per-booklet access: hasConfirmingPayment without admin pending");
      } else {
        fail(
          "Per-booklet access flags",
          JSON.stringify({
            hasConfirmingPayment: bookletAccess.data?.hasConfirmingPayment,
            hasPendingPayment: bookletAccess.data?.hasPendingPayment,
          }),
        );
      }
    } else {
      fail("Initialize creates pending row", "no row found — INSERT may be failing silently");
    }
  }

  const approved = await sql`
    SELECT mp.user_id, mp.booklet_id, mp.transaction_id
    FROM monthly_purchases mp
    WHERE mp.status = 'approved' AND mp.payment_method = 'oasispay'
    ORDER BY mp.approved_at DESC NULLS LAST
    LIMIT 1
  `;
  if (approved.length) {
    const row = approved[0];
    const reverify = await fetchJson("/api/payments/oasispay/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Id": String(row.user_id) },
      body: JSON.stringify({ reference: row.transaction_id, bookletId: row.booklet_id }),
    });
    if (reverify.ok && reverify.data?.alreadyUnlocked) {
      pass("Re-verify approved payment returns alreadyUnlocked");
    } else {
      fail("Re-verify approved payment", `${reverify.status} ${JSON.stringify(reverify.data)}`);
    }
  } else {
    warn("No approved OasisPay rows to test re-verify");
  }

  const admin = await sql`SELECT id FROM users WHERE is_admin = TRUE LIMIT 1`;
  if (admin.length) {
    const adminPayments = await fetchJson("/api/admin/payments?status=pending", {
      headers: { "X-User-Id": String(admin[0].id) },
    });
    const automated = (adminPayments.data?.payments || []).filter((p) =>
      ["oasispay", "paystack"].includes(p.paymentMethod),
    );
    if (automated.length === 0) pass("Admin queue excludes OasisPay/Paystack");
    else fail("Admin queue filter", `${automated.length} automated payments in queue`);
  }

  const stuck = await sql`
    SELECT mp.id, mp.user_id, mp.booklet_id, mp.transaction_id, mp.oasispay_lookup_ids
    FROM monthly_purchases mp
    WHERE mp.status = 'pending' AND mp.payment_method = 'oasispay'
    ORDER BY mp.created_at DESC
  `;
  console.log(`\n--- Pending OasisPay rows: ${stuck.length} ---`);
  if (process.env.OASISPAY_SECRET_KEY) {
    for (const row of stuck) {
      let lookupIds = [];
      try {
        lookupIds = JSON.parse(row.oasispay_lookup_ids || "[]");
      } catch {
        lookupIds = [];
      }
      const ids = [...new Set([row.transaction_id, ...lookupIds].filter(Boolean))];
      let gatewayStatus = "?";
      for (const id of ids) {
        try {
          const r = await fetch(`${OASISPAY_API_BASE}/payments/${encodeURIComponent(id)}`, {
            headers: { Authorization: `Bearer ${process.env.OASISPAY_SECRET_KEY}` },
          });
          const d = await r.json().catch(() => ({}));
          const p = d?.data ?? d;
          if (r.ok) {
            gatewayStatus = p?.status || p?.paymentStatus || "unknown";
            break;
          }
        } catch {
          /* try next id */
        }
      }
      console.log(`  #${row.id} user=${row.user_id} booklet=${row.booklet_id} gateway=${gatewayStatus}`);
      if (String(gatewayStatus).toLowerCase() === "pending") {
        warn(`Row #${row.id}`, "checkout started but OasisPay still shows pending (user may not have paid)");
      }
    }
  } else {
    warn("OASISPAY_SECRET_KEY not in .env.local", "cannot check gateway status for stuck rows");
  }

  await sql.end();
  summarize();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

function summarize() {
  const passed = results.filter((r) => r.ok === true).length;
  const failed = results.filter((r) => r.ok === false).length;
  const warnings = results.filter((r) => r.ok === "warn").length;
  console.log(`\n=== Summary: ${passed} passed, ${failed} failed, ${warnings} warnings ===\n`);
  if (failed > 0) process.exit(1);
}
