/**
 * Fix April 2026 booklet titles to match the manuscript
 */
const postgres = require("postgres");

const APRIL_TITLES = {
  1: "IT IS MANIFESTATION TIME",
  2: "THE FULLNESS OF GOD",
  3: "DOORS ARE OPENED UNTO ME",
  4: "LIFE IS SO EASY FOR ME",
  5: "THE NEXT BIGGEST THING",
  6: "I AM TOUCHING BILLIONS",
  7: "I DISPLAY THE POWER OF GOD",
  8: "I AM A SPIRIT",
  9: "I AM FLOODED WITH GOD",
  10: "REIGNING VICTORIOUSLY THROUGH CHRIST",
  11: "PEOPLE ARE PRESSING INTO OUR CHURCHES",
  12: "I HAVE PUT ON HUMILITY",
  13: "MY ABUNDANCE IS CERTAIN",
  14: "I'M THAT STRONG PILLAR",
  15: "MY BLOOD IS UNINFECTIBLE",
  16: "GOD IS MY POWER HOUSE",
  17: "MY EXPANSION IS NOW",
  18: "I HAVE CONQUERED YOU SATAN",
  19: "THERE IS NO TRACE OF POVERTY WITH ME",
  20: "I AM NOT ORDINARY",
  21: "I WILL NEVER BE PUT TO SHAME",
  22: "JUST WANNA GLORIFY JESUS",
  23: "I BELONG TO THE RICH CLASS",
  24: "THE HEALTH OF GOD",
  25: "ABOVE SATANIC ATTACK",
  26: "WHATEVER I REFUSE IS REFUSED",
  27: "ANOINTED TO OCCUPY TILL HE COMES",
  28: "I AM IMMORTAL",
  29: "INVISIBLE IN CHRIST",
  30: "CONSTANT CASHFLOW",
  31: "NOT BY POWER",
};

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }

  const sql = postgres(url, { ssl: "require" });
  const BOOKLET_ID = 297; // April 2026

  try {
    // Get current affirmations for April 2026
    const affs = await sql`
      SELECT id, day_number, title FROM affirmations 
      WHERE booklet_id = ${BOOKLET_ID} ORDER BY day_number ASC
    `;
    console.log(`Found ${affs.length} affirmations in booklet ${BOOKLET_ID}\n`);

    let updated = 0;
    let mismatches = [];

    for (const aff of affs) {
      const correctTitle = APRIL_TITLES[aff.day_number];
      if (!correctTitle) {
        console.log(`  Day ${aff.day_number}: No manuscript title found, skipping`);
        continue;
      }
      if (aff.title === correctTitle) {
        console.log(`  Day ${aff.day_number}: ✓ Already correct "${aff.title}"`);
        continue;
      }
      
      mismatches.push({ day: aff.day_number, was: aff.title, now: correctTitle });
      await sql`UPDATE affirmations SET title = ${correctTitle} WHERE id = ${aff.id}`;
      updated++;
      console.log(`  Day ${aff.day_number}: "${aff.title}" → "${correctTitle}"`);
    }

    console.log(`\n✅ Updated ${updated} titles out of ${affs.length} affirmations`);
    if (mismatches.length) {
      console.log(`\nChanged titles:`);
      mismatches.forEach(m => console.log(`  Day ${m.day}: "${m.was}" → "${m.now}"`));
    }
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
