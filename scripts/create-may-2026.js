require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");
const MAY_2026 = require("./may-2026-data");
const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1 });

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

(async () => {
  // 1. Confirm booklet doesn't already exist
  const existing = await sql`SELECT id FROM booklets WHERE month = 5 AND year = 2026 LIMIT 1`;
  if (existing.length) {
    console.error(`May 2026 booklet already exists (ID ${existing[0].id}). Aborting.`);
    await sql.end(); process.exit(1);
  }

  // 2. Get all distinct image URLs to randomize
  const imgRows = await sql`SELECT DISTINCT image_url FROM affirmations WHERE image_url IS NOT NULL`;
  const allImages = imgRows.map(r => r.image_url);
  if (allImages.length === 0) {
    console.error("No image URLs found in DB. Aborting."); await sql.end(); process.exit(1);
  }
  console.log(`Found ${allImages.length} distinct image URLs to randomize across 31 days.`);

  // Shuffle and cycle through images so all 31 days get a randomized image
  const shuffled = shuffle(allImages);
  const imageFor = (i) => shuffled[i % shuffled.length];

  // 3. Create the booklet
  const [booklet] = await sql`
    INSERT INTO booklets (title, month, year, description, cover_color)
    VALUES (
      'My Life & My Cashflow Affirmations - 2026 Edition - May 2026',
      5, 2026,
      'Daily affirmations for May 2026',
      '#4CAF50'
    )
    RETURNING *
  `;
  console.log(`\n✓ Booklet created: "${booklet.title}" (ID ${booklet.id})`);

  // 4. Insert 31 affirmations
  console.log("\nInserting affirmations...");
  for (let i = 0; i < MAY_2026.length; i++) {
    const { day, title, content } = MAY_2026[i];
    const imageUrl = imageFor(i);
    await sql`
      INSERT INTO affirmations (booklet_id, day_number, title, content, image_url)
      VALUES (${booklet.id}, ${day}, ${title}, ${content}, ${imageUrl})
    `;
    console.log(`  ✓ Day ${day}: "${title}" [${imageUrl}]`);
  }

  console.log(`\nDone. May 2026 booklet (ID ${booklet.id}) created with ${MAY_2026.length} affirmations.`);
  await sql.end();
})().catch(e => { console.error(e); sql.end(); process.exit(1); });
