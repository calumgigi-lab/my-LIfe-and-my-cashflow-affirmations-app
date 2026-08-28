/**
 * Sync April 2026 affirmations to DB with correct TOC titles + content
 * 
 * Mapping:
 * - Days 1-11: JSON Days 1-11 (titles & content match TOC)
 * - Day 12: "I HAVE PUT ON HUMILITY" (content provided by author, not in JSON)
 * - Days 13-30: TOC titles, content from JSON Days 12-29 (shifted by 1)
 * - Day 31: TBD - "NOT BY POWER"
 */
const postgres = require("postgres");
const fs = require("fs");

const DAY_12_CONTENT = "I fear the Lord, therefore I hate pride and arrogance, corruption and perverse speech. My words are seasoned with grace. I speak life, progress, distinction and honour.\n\n\"The fear of the LORD is to hate evil: pride, arrogancy and the evil way, and the froward mouth, do I hate.\" Says the Lord. Hallelujah. So I say no to pride and arrogance. I have put on humility as I shine as light to the nations. Glory to God.\n\nPlease pray in the Spirit.";

const TOC_TITLES = {
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
};

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }

  const sql = postgres(url, { ssl: "require" });
  const BOOKLET_ID = 297;

  try {
    // Read the JSON file
    const data = JSON.parse(fs.readFileSync("affirmations_april_2026.json", "utf8"));
    const jsonAffs = data[0].affirmations;

    // Build content map: DB day_number -> content
    const contentMap = {};

    // Days 1-11: content from JSON Days 1-11
    for (let d = 1; d <= 11; d++) {
      const j = jsonAffs.find(a => a.dayNumber === d);
      if (j) contentMap[d] = j.content;
    }

    // Day 12: author-provided content
    contentMap[12] = DAY_12_CONTENT;

    // Days 13-30: content from JSON Days 12-29 (shifted by 1)
    for (let d = 13; d <= 30; d++) {
      const j = jsonAffs.find(a => a.dayNumber === (d - 1));
      if (j) contentMap[d] = j.content;
    }

    // Get current DB affirmations
    const dbAffs = await sql`
      SELECT id, day_number, title, content FROM affirmations 
      WHERE booklet_id = ${BOOKLET_ID} ORDER BY day_number ASC
    `;
    console.log(`Database has ${dbAffs.length} affirmations for booklet ${BOOKLET_ID}\n`);

    let updated = 0;
    for (let day = 1; day <= 30; day++) {
      const dbAff = dbAffs.find(a => a.day_number === day);
      if (!dbAff) {
        console.log(`  Day ${day}: NOT FOUND in DB - skipping`);
        continue;
      }

      const correctTitle = TOC_TITLES[day];
      const correctContent = contentMap[day];
      if (!correctTitle || !correctContent) {
        console.log(`  Day ${day}: No mapping data - skipping`);
        continue;
      }

      const titleChanged = dbAff.title !== correctTitle;
      const contentChanged = dbAff.content !== correctContent;

      if (titleChanged || contentChanged) {
        await sql`
          UPDATE affirmations 
          SET title = ${correctTitle}, content = ${correctContent}
          WHERE id = ${dbAff.id}
        `;
        updated++;
        if (titleChanged) {
          console.log(`  Day ${day}: Title: "${dbAff.title}" -> "${correctTitle}"`);
        }
        if (contentChanged) {
          console.log(`  Day ${day}: Content updated (${correctContent.length} chars)`);
        }
      } else {
        console.log(`  Day ${day}: Already correct`);
      }
    }

    // Report on Day 31
    const day31 = dbAffs.find(a => a.day_number === 31);
    if (day31) {
      console.log(`\n  Day 31 exists in DB: "${day31.title}" (NOT YET UPDATED - need content)`);
    }

    console.log(`\nDone! Updated ${updated} of 30 affirmations.`);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
