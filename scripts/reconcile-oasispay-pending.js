/**
 * Reconcile stuck OasisPay rows: pending in DB but paid on OasisPay → approved.
 * Also rejects orphan pending OasisPay rows that were never completed.
 *
 * Usage: node scripts/reconcile-oasispay-pending.js
 */
require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");
const crypto = require("crypto");

const OASISPAY_API_BASE = "https://api.oasispay.co/v1";
const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1 });

function isOasispayPaymentSuccessful(payment) {
  const root = payment?.data ?? payment;
  const candidates = [root?.status, root?.paymentStatus, root?.state, payment?.status, payment?.paymentStatus]
    .filter(Boolean)
    .map((s) => String(s).toLowerCase());
  const successValues = new Set(["successful", "success", "paid", "completed", "complete", "succeeded", "approved"]);
  return candidates.some((s) => successValues.has(s));
}

async function oasispayApi(method, apiPath, body) {
  const secret = process.env.OASISPAY_SECRET_KEY;
  if (!secret) throw new Error("OASISPAY_SECRET_KEY not set");
  const response = await fetch(`${OASISPAY_API_BASE}${apiPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.error || `OasisPay ${response.status}`);
  return data.data ?? data;
}

async function unlockPaid(sql, { userId, bookletId, reference, amountNaira, platform, productId }) {
  const already = await sql`
    SELECT id FROM monthly_purchases
    WHERE user_id = ${userId} AND booklet_id = ${bookletId} AND status = 'approved'
    LIMIT 1
  `;
  if (already.length) {
    await sql`
      UPDATE monthly_purchases SET status = 'rejected'
      WHERE user_id = ${userId} AND booklet_id = ${bookletId} AND status = 'pending' AND payment_method = 'oasispay'
    `.catch(() => {});
    return { action: "already_approved", id: already[0].id };
  }

  const pending = await sql`
    SELECT id FROM monthly_purchases
    WHERE user_id = ${userId} AND booklet_id = ${bookletId} AND status = 'pending' AND payment_method = 'oasispay'
    ORDER BY created_at DESC LIMIT 1
  `;

  if (pending.length) {
    const updated = await sql`
      UPDATE monthly_purchases
      SET status = 'approved', approved_at = NOW(), payment_method = 'oasispay',
          amount_naira = ${amountNaira}, transaction_id = ${reference}
      WHERE id = ${pending[0].id}
      RETURNING id
    `;
    await sql`
      UPDATE monthly_purchases SET status = 'rejected'
      WHERE user_id = ${userId} AND booklet_id = ${bookletId} AND status = 'pending' AND id <> ${pending[0].id}
    `.catch(() => {});
    return { action: "approved_pending_row", id: updated[0].id };
  }

  const inserted = await sql`
    INSERT INTO monthly_purchases (user_id, booklet_id, platform, product_id, transaction_id, status, payment_method, amount_naira, approved_at)
    VALUES (${userId}, ${bookletId}, ${platform || "android"}, ${productId || "oasispay_booklet"}, ${reference}, 'approved', 'oasispay', ${amountNaira}, NOW())
    RETURNING id
  `;
  return { action: "inserted_approved", id: inserted[0].id };
}

(async () => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set in .env.local");
  if (!process.env.OASISPAY_SECRET_KEY) throw new Error("OASISPAY_SECRET_KEY not set in .env.local");

  const priceSetting = await sql`SELECT value FROM admin_settings WHERE key = 'monthly_price_naira' LIMIT 1`.catch(() => []);
  const expectedAmount = priceSetting.length ? (parseInt(priceSetting[0].value, 10) || 1500) : 1500;

  const pendingRows = await sql`
    SELECT id, user_id, booklet_id, platform, product_id, transaction_id, amount_naira, created_at
    FROM monthly_purchases
    WHERE status = 'pending' AND payment_method = 'oasispay' AND transaction_id IS NOT NULL
    ORDER BY created_at DESC
  `;

  console.log(`Found ${pendingRows.length} pending OasisPay row(s) to reconcile\n`);

  let approved = 0;
  let rejected = 0;
  let stillPending = 0;

  for (const row of pendingRows) {
    const label = `#${row.id} user=${row.user_id} booklet=${row.booklet_id} ref=${row.transaction_id}`;
    try {
      const payment = await oasispayApi("GET", `/payments/${encodeURIComponent(row.transaction_id)}`);
      if (isOasispayPaymentSuccessful(payment)) {
        const meta = payment.metadata || {};
        const userId = parseInt(meta.user_id || meta.userId, 10) || row.user_id;
        const bookletId = parseInt(meta.booklet_id || meta.bookletId, 10) || row.booklet_id;
        const amountObj = payment.amount || {};
        const amountNaira = Math.round(Number(amountObj.amount ?? payment.amountNaira ?? row.amount_naira ?? expectedAmount));
        const reference = payment.id || payment.reference || row.transaction_id;
        const result = await unlockPaid(sql, {
          userId,
          bookletId,
          reference,
          amountNaira: amountNaira || expectedAmount,
          platform: meta.platform || row.platform,
          productId: meta.product_id || meta.productId || row.product_id,
        });
        console.log(`✓ PAID  ${label} → ${result.action} (purchase #${result.id})`);
        approved += 1;
      } else {
        const status = payment?.status || payment?.paymentStatus || "unknown";
        console.log(`… WAIT ${label} → OasisPay status: ${status}`);
        stillPending += 1;
      }
    } catch (e) {
      const msg = e.message || String(e);
      if (/not found|404/i.test(msg)) {
        await sql`UPDATE monthly_purchases SET status = 'rejected' WHERE id = ${row.id}`;
        console.log(`✗ GONE  ${label} → rejected (not found on OasisPay)`);
        rejected += 1;
      } else {
        console.log(`! ERROR ${label} → ${msg}`);
        stillPending += 1;
      }
    }
  }

  console.log(`\nDone: ${approved} approved, ${rejected} rejected, ${stillPending} still pending/unresolved`);
  await sql.end();
})().catch((e) => {
  console.error(e);
  sql.end().catch(() => {});
  process.exit(1);
});
