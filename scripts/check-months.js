require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");
const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1 });

(async () => {
  const rows = await sql`
    SELECT b.month, b.year, a.day_number, a.title
    FROM affirmations a JOIN booklets b ON b.id = a.booklet_id
    WHERE b.month IN (9, 10, 11) AND b.year = 2025
    ORDER BY b.month ASC, a.day_number ASC
  `;
  rows.forEach(r => console.log(`[Sep/Oct/Nov ${r.month}/Day ${String(r.day_number).padStart(2,'0')}] ${r.title}`));
  await sql.end();
})().catch(e => { console.error(e); sql.end(); });
