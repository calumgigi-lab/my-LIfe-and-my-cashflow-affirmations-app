require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");
const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1 });

(async () => {
  // 1. Get Sep 28 content
  const [sep28] = await sql`
    SELECT a.id, a.title, a.content, b.month, b.year
    FROM affirmations a JOIN booklets b ON b.id = a.booklet_id
    WHERE b.month = 9 AND b.year = 2025 AND a.day_number = 28
  `;
  console.log("=== SEP 28 ===");
  console.log("Title:", sep28.title);
  console.log("Content (first 200):", sep28.content.substring(0, 200));

  // 2. Find any other affirmation with same title
  const sameTitle = await sql`
    SELECT a.id, a.day_number, b.month, b.year, b.title as booklet_title
    FROM affirmations a JOIN booklets b ON b.id = a.booklet_id
    WHERE LOWER(a.title) = LOWER(${sep28.title}) AND a.id != ${sep28.id}
  `;
  console.log("\n=== OTHER AFFIRMATIONS WITH SAME TITLE ===");
  sameTitle.forEach(r => console.log(`  [${r.booklet_title}] Day ${r.day_number} (ID ${r.id})`));

  // 3. Find any with same content snippet
  const snippet = sep28.content.substring(0, 80);
  const sameContent = await sql`
    SELECT a.id, a.day_number, a.title, b.month, b.year, b.title as booklet_title
    FROM affirmations a JOIN booklets b ON b.id = a.booklet_id
    WHERE a.content LIKE ${'%' + snippet.substring(0, 50) + '%'} AND a.id != ${sep28.id}
  `;
  console.log("\n=== OTHER AFFIRMATIONS WITH SAME CONTENT ===");
  sameContent.forEach(r => console.log(`  [${r.booklet_title}] Day ${r.day_number}: "${r.title}" (ID ${r.id})`));

  // 4. Booklet schema
  const bookletCols = await sql`
    SELECT column_name, data_type, column_default
    FROM information_schema.columns
    WHERE table_name = 'booklets' ORDER BY ordinal_position
  `;
  console.log("\n=== BOOKLET SCHEMA ===");
  bookletCols.forEach(c => console.log(`  ${c.column_name} (${c.data_type}) default: ${c.column_default}`));

  // 5. Latest booklet as reference
  const [latest] = await sql`SELECT * FROM booklets ORDER BY id DESC LIMIT 1`;
  console.log("\n=== LATEST BOOKLET ===");
  console.log(JSON.stringify(latest, null, 2));

  // 6. Sample image URLs from existing affirmations
  const images = await sql`SELECT DISTINCT image_url FROM affirmations WHERE image_url IS NOT NULL LIMIT 15`;
  console.log("\n=== SAMPLE IMAGE URLS ===");
  images.forEach(r => console.log(" ", r.image_url));

  await sql.end();
})().catch(e => { console.error(e); sql.end(); });
