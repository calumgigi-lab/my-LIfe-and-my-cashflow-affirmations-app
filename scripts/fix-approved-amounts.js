require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");
const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1 });

(async () => {
  // Get current price from admin_settings
  const priceSetting = await sql`
    SELECT value FROM admin_settings WHERE key = 'monthly_price_naira' LIMIT 1
  `.catch(() => []);
  const price = priceSetting.length ? (parseInt(priceSetting[0].value) || 1500) : 1500;
  console.log(`Using price: ₦${price}`);

  // Count affected rows before fix
  const [before] = await sql`
    SELECT count(*) as count, COALESCE(sum(amount_naira), 0) as total
    FROM monthly_purchases WHERE status = 'approved'
  `;
  console.log(`Before: ${before.count} approved, total ₦${before.total}`);

  // Backfill: set amount_naira for all approved bank_transfer records with NULL or 0
  const updated = await sql`
    UPDATE monthly_purchases
    SET amount_naira = ${price}
    WHERE status = 'approved'
      AND (payment_method IS NULL OR payment_method != 'points')
      AND (amount_naira IS NULL OR amount_naira = 0)
    RETURNING id
  `;
  console.log(`✓ Fixed ${updated.length} records → set amount_naira = ₦${price}`);

  // Verify after fix
  const [after] = await sql`
    SELECT count(*) as count, COALESCE(sum(amount_naira), 0) as total
    FROM monthly_purchases WHERE status = 'approved'
  `;
  console.log(`After:  ${after.count} approved, total ₦${after.total}`);
  console.log(`Expected: ${after.count} × ₦${price} = ₦${Number(after.count) * price}`);

  await sql.end();
})().catch(e => { console.error(e); sql.end(); process.exit(1); });
