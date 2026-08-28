/**
 * End-to-end payment validation: init → verify rejects → sync rejects → access flags → approved unlock check.
 */
require("dotenv").config({ path: ".env.local" });

const API = process.env.EXPO_PUBLIC_API_URL || "https://global-affirmation-hub-1.vercel.app";
const postgres = require("postgres");

let passed = 0;
let failed = 0;

function ok(label, detail = "") {
  passed += 1;
  console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ""}`);
}

function bad(label, detail = "") {
  failed += 1;
  console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
}

async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, options);
  let data;
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  return { status: res.status, ok: res.ok, data };
}

(async () => {
  console.log(`\n=== Payment validation & unlock test ===\nAPI: ${API}\n`);

  const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1 });

  // Pick user + locked booklet
  const user = await sql`
    SELECT u.id, u.email FROM users u
    WHERE EXISTS (
      SELECT 1 FROM booklets b
      WHERE NOT EXISTS (
        SELECT 1 FROM monthly_purchases mp
        WHERE mp.user_id = u.id AND mp.booklet_id = b.id AND mp.status = 'approved'
      )
    )
    ORDER BY u.id ASC LIMIT 1
  `;
  if (!user.length) {
    bad("Find test user with locked booklet");
    await sql.end();
    process.exit(1);
  }
  const userId = user[0].id;

  const booklet = await sql`
    SELECT b.id, b.title FROM booklets b
    WHERE NOT EXISTS (
      SELECT 1 FROM monthly_purchases mp
      WHERE mp.user_id = ${userId} AND mp.booklet_id = b.id AND mp.status = 'approved'
    )
    ORDER BY b.year DESC, b.month DESC LIMIT 1
  `;
  const bookletId = booklet[0].id;

  console.log(`User #${userId} (${user[0].email}), booklet #${bookletId} (${booklet[0].title})\n`);

  // --- Validation: auth required ---
  const noAuth = await api("/api/payments/oasispay/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bookletId }),
  });
  if (noAuth.status === 400 || noAuth.status === 401) ok("Sync requires authentication", String(noAuth.status));
  else bad("Sync requires authentication", String(noAuth.status));

  const noRef = await api("/api/payments/oasispay/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-User-Id": String(userId) },
    body: JSON.stringify({ bookletId }),
  });
  if (noRef.status === 400) ok("Verify requires reference", noRef.data?.error);
  else bad("Verify requires reference", String(noRef.status));

  // --- Initialize ---
  const init = await api("/api/payments/oasispay/initialize", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-User-Id": String(userId) },
    body: JSON.stringify({ bookletId, platform: "android", productId: "validation_test" }),
  });
  if (init.ok && init.data.authorizationUrl?.startsWith("http") && init.data.reference) {
    ok("Initialize OK", init.data.reference);
  } else {
    bad("Initialize", init.data?.error || init.status);
    await sql.end();
    summarize();
    return;
  }

  const pending = await sql`
    SELECT id, transaction_id, oasispay_lookup_ids, status
    FROM monthly_purchases
    WHERE user_id = ${userId} AND booklet_id = ${bookletId}
      AND payment_method = 'oasispay' AND status = 'pending'
    ORDER BY created_at DESC LIMIT 1
  `;
  if (pending.length) ok("Pending checkout row created");
  else bad("Pending checkout row created");

  let lookupIds = [];
  try {
    lookupIds = JSON.parse(pending[0]?.oasispay_lookup_ids || "[]");
  } catch {
    lookupIds = [];
  }
  if (lookupIds.length >= 2 && lookupIds.some((id) => String(id).startsWith("idem_"))) {
    ok("Lookup IDs include idem token", lookupIds.join(", "));
  } else {
    bad("Lookup IDs", JSON.stringify(lookupIds));
  }

  const pendingCount = await sql`
    SELECT count(*)::int AS n FROM monthly_purchases
    WHERE user_id = ${userId} AND booklet_id = ${bookletId}
      AND payment_method = 'oasispay' AND status = 'pending'
  `;
  if (pendingCount[0].n === 1) ok("Only one active pending checkout per booklet");
  else bad("Single pending checkout", `count=${pendingCount[0].n}`);

  // --- Validation: unpaid checkout must not unlock ---
  const verify = await api("/api/payments/oasispay/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-User-Id": String(userId) },
    body: JSON.stringify({ reference: init.data.reference, bookletId }),
  });
  if (!verify.ok) ok("Verify blocks unpaid checkout", verify.data?.error);
  else bad("Verify blocks unpaid checkout", "unexpected success");

  const sync = await api("/api/payments/oasispay/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-User-Id": String(userId) },
    body: JSON.stringify({ bookletId }),
  });
  if (!sync.ok) ok("Sync blocks unpaid checkout", sync.data?.error);
  else bad("Sync blocks unpaid checkout", "unexpected success");

  const accessAfterInit = await api("/api/booklets/access", {
    headers: { "X-User-Id": String(userId) },
  });
  const unlocked = accessAfterInit.data?.unlockedBookletIds || [];
  const confirming = accessAfterInit.data?.confirmingBookletIds || [];
  const adminPending = accessAfterInit.data?.pendingBookletIds || [];

  if (!unlocked.includes(bookletId)) ok("Booklet not unlocked before payment");
  else bad("Booklet not unlocked before payment");

  if (confirming.includes(bookletId) && !adminPending.includes(bookletId)) {
    ok("Access: confirming (not admin pending) during checkout");
  } else {
    bad("Access flags", JSON.stringify({ confirming, adminPending }));
  }

  const perBooklet = await api(`/api/booklets/${bookletId}/access`, {
    headers: { "X-User-Id": String(userId) },
  });
  if (perBooklet.data?.hasConfirmingPayment && !perBooklet.data?.hasPendingPayment && !perBooklet.data?.unlocked) {
    ok("Per-booklet access: confirming, not unlocked");
  } else {
    bad("Per-booklet access", JSON.stringify(perBooklet.data));
  }

  // --- Unlock validation: approved payments ---
  const approvedRows = await sql`
    SELECT mp.id, mp.user_id, mp.booklet_id, mp.transaction_id
    FROM monthly_purchases mp
    WHERE mp.status = 'approved' AND mp.payment_method = 'oasispay'
    ORDER BY mp.approved_at DESC NULLS LAST
    LIMIT 3
  `;

  console.log("\n--- Approved OasisPay unlock checks ---");
  for (const row of approvedRows) {
    const access = await api("/api/booklets/access", {
      headers: { "X-User-Id": String(row.user_id) },
    });
    const ids = access.data?.unlockedBookletIds || [];
    if (ids.includes(row.booklet_id)) {
      ok(`User #${row.user_id} booklet #${row.booklet_id} in unlockedBookletIds`);
    } else {
      bad(`User #${row.user_id} booklet #${row.booklet_id} missing from unlockedBookletIds`);
    }

    const reverify = await api("/api/payments/oasispay/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Id": String(row.user_id) },
      body: JSON.stringify({ reference: row.transaction_id, bookletId: row.booklet_id }),
    });
    if (reverify.ok && reverify.data?.alreadyUnlocked) {
      ok(`Re-verify #${row.id} returns alreadyUnlocked`);
    } else {
      bad(`Re-verify #${row.id}`, JSON.stringify(reverify.data));
    }
  }

  if (!approvedRows.length) {
    console.log("  ⚠ No approved OasisPay rows to test unlock");
  }

  // --- Callback ---
  const cb = await fetch(`${API}/api/payments/oasispay/callback?reference=${encodeURIComponent(init.data.reference)}`);
  const cbHtml = await cb.text();
  if (cb.ok && cbHtml.includes("mylifemycashflow://payment-complete")) {
    ok("Callback HTML with deep link");
  } else {
    bad("Callback endpoint", String(cb.status));
  }

  await sql.end();
  summarize();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

function summarize() {
  console.log(`\n=== Result: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}
