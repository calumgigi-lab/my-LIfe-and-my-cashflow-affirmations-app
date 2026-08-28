require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");
const API = process.env.EXPO_PUBLIC_API_URL || "https://global-affirmation-hub-1.vercel.app";
const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1 });

(async () => {
  const userId = 79;
  const bookletId = 300;

  const beforeCount = await sql`
    SELECT count(*)::int AS n FROM monthly_purchases WHERE user_id = ${userId} AND booklet_id = ${bookletId}
  `;
  console.log(`DB rows for user ${userId} booklet ${bookletId} before init: ${beforeCount[0].n}`);

  const initRes = await fetch(`${API}/api/payments/oasispay/initialize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-User-Id": String(userId),
    },
    body: JSON.stringify({ bookletId, platform: "android", productId: "test_init" }),
  });
  const initData = await initRes.json();
  console.log("Initialize status:", initRes.status);
  console.log("Reference:", initData.reference);
  console.log("Has checkout URL:", !!initData.authorizationUrl);

  const afterCount = await sql`
    SELECT count(*)::int AS n FROM monthly_purchases WHERE user_id = ${userId} AND booklet_id = ${bookletId}
  `;
  console.log(`DB rows after init: ${afterCount[0].n} (should equal before — no pending row created)`);

  if (afterCount[0].n !== beforeCount[0].n) {
    console.error("FAIL: initialize still created a DB row");
    process.exit(1);
  }
  console.log("✓ Initialize does not create pending admin/OasisPay DB row");

  if (initData.reference) {
    const verifyRes = await fetch(`${API}/api/payments/oasispay/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User-Id": String(userId),
      },
      body: JSON.stringify({ reference: initData.reference, bookletId }),
    });
    const verifyData = await verifyRes.json();
    console.log("\nVerify unpaid checkout:", verifyRes.status, verifyData.error || verifyData.message);
    if (verifyRes.ok) {
      console.error("FAIL: verify should not succeed before payment");
      process.exit(1);
    }
    console.log("✓ Verify correctly rejects unpaid checkout");
  }

  await sql.end();
})().catch((e) => { console.error(e); process.exit(1); });
