require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");
const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1 });

(async () => {
  const rows = await sql`
    SELECT b.month, a.day_number, a.title, SUBSTRING(a.content, 1, 100) as snippet
    FROM affirmations a JOIN booklets b ON b.id = a.booklet_id
    WHERE b.month IN (10, 11) AND b.year = 2025
    ORDER BY a.day_number ASC, b.month ASC
  `;

  // Group by day and compare
  const byDay = {};
  rows.forEach(r => {
    if (!byDay[r.day_number]) byDay[r.day_number] = {};
    byDay[r.day_number][r.month] = r.snippet;
  });

  let identical = 0, different = 0;
  for (const day of Object.keys(byDay).sort((a,b)=>a-b)) {
    const oct = byDay[day][10];
    const nov = byDay[day][11];
    if (oct && nov) {
      if (oct === nov) {
        identical++;
      } else {
        different++;
        console.log(`Day ${day} DIFFERS:\n  OCT: ${oct}\n  NOV: ${nov}\n`);
      }
    }
  }
  console.log(`\nResult: ${identical} days IDENTICAL, ${different} days DIFFERENT`);
  await sql.end();
})().catch(e => { console.error(e); sql.end(); });
