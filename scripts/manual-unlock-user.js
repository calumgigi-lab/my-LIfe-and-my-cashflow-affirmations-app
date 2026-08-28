require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");
const API = process.env.EXPO_PUBLIC_API_URL || "https://global-affirmation-hub-1.vercel.app";

const USER_ID = 16;
const BOOKLET_ID = 300;
const PURCHASE_ID = 261;
const AUDIT_LABEL = "Manually unlocked by admin (Gladicent — July 2026)";

(async () => {
  const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1 });

  const user = await sql`
    SELECT id, username, email FROM users WHERE id = ${USER_ID} LIMIT 1
  `;
  if (!user.length) throw new Error(`User #${USER_ID} not found`);

  const already = await sql`
    SELECT id FROM monthly_purchases
    WHERE user_id = ${USER_ID} AND booklet_id = ${BOOKLET_ID} AND status = 'approved'
    LIMIT 1
  `;
  if (already.length) {
    console.log(`Already unlocked — purchase #${already[0].id}`);
    await sql.end();
    return;
  }

  const pending = await sql`
    SELECT id, transaction_id, status FROM monthly_purchases WHERE id = ${PURCHASE_ID} LIMIT 1
  `;
  if (!pending.length) throw new Error(`Purchase #${PURCHASE_ID} not found`);

  const updated = await sql`
    UPDATE monthly_purchases
    SET status = 'approved',
        approved_at = NOW(),
        payment_method = 'oasispay',
        amount_naira = COALESCE(amount_naira, 1500)
    WHERE id = ${PURCHASE_ID}
    RETURNING id, user_id, booklet_id, status, transaction_id, approved_at
  `;

  await sql`
    UPDATE monthly_purchases
    SET status = 'rejected'
    WHERE user_id = ${USER_ID}
      AND booklet_id = ${BOOKLET_ID}
      AND status = 'pending'
      AND id <> ${PURCHASE_ID}
  `;

  await sql`
    INSERT INTO payment_audit_log (payment_id, user_id, action, details)
    VALUES (${PURCHASE_ID}, ${USER_ID}, 'approved', ${AUDIT_LABEL})
  `.catch(() => {});

  const accessRes = await fetch(`${API}/api/booklets/access`, {
    headers: { "X-User-Id": String(USER_ID) },
  });
  const access = await accessRes.json().catch(() => ({}));

  console.log("\n✅ July booklet unlocked for Gladicent\n");
  console.log(`  User:     #${user[0].id} ${user[0].username} (${user[0].email})`);
  console.log(`  Booklet:  #${BOOKLET_ID}`);
  console.log(`  Purchase: #${updated[0].id} — ${updated[0].status}`);
  console.log(`  Ref:      ${updated[0].transaction_id}`);
  console.log(`  Approved: ${updated[0].approved_at}`);
  console.log(`\n  App access: unlocked=${(access.unlockedBookletIds || []).join(", ") || "none"}`);

  await sql.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
