/**
 * Randomize the full page-image pool across ALL affirmations in the database.
 * Each affirmation gets a randomly picked image from the pool.
 */
require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");

const IMAGES = [
  "/page-images/IMG_0049.JPG.jpeg",
  "/page-images/IMG_0050.JPG.jpeg",
  "/page-images/IMG_0051.JPG.jpeg",
  "/page-images/IMG_0052.JPG.jpeg",
  "/page-images/IMG_0053.JPG.jpeg",
  "/page-images/IMG_0054.JPG.jpeg",
  "/page-images/IMG_0055.JPG.jpeg",
  "/page-images/IMG_0056.JPG.jpeg",
  "/page-images/IMG_0057.JPG.jpeg",
  "/page-images/IMG_0058.JPG.jpeg",
  "/page-images/IMG_0059.JPG.jpeg",
  "/page-images/IMG_0060.JPG.jpeg",
  "/page-images/IMG_0061.JPG.jpeg",
  "/page-images/IMG_0062.JPG.jpeg",
  "/page-images/IMG_0063.JPG.jpeg",
  "/page-images/IMG_0064.JPG.jpeg",
  "/page-images/IMG_0065.JPG.jpeg",
  "/page-images/IMG_0066.JPG.jpeg",
  "/page-images/IMG_0068.JPG.jpeg",
  "/page-images/IMG_0069.JPG.jpeg",
  "/page-images/IMG_0070.JPG.jpeg",
  "/page-images/IMG_0071.JPG.jpeg",
  "/page-images/IMG_0072.JPG.jpeg",
  "/page-images/IMG_0073.JPG.jpeg",
  "/page-images/IMG_0074.JPG.jpeg",
  "/page-images/IMG_0075.JPG.jpeg",
  "/page-images/IMG_0076.JPG.jpeg",
  "/page-images/IMG_0077.JPG.jpeg",
  "/page-images/IMG_0078.JPG.jpeg",
  "/page-images/IMG_0079.JPG.jpeg",
  "/page-images/IMG_0080.JPG.jpeg",
  "/page-images/IMG_0083.JPG.jpeg",
  "/page-images/IMG_0085.JPG.jpeg",
  "/page-images/IMG_0086.JPG.jpeg",
  "/page-images/IMG_2782.JPG.jpeg",
  "/page-images/IMG_2788.JPG.jpeg",
  "/page-images/IMG_2789.JPG.jpeg",
  "/page-images/IMG_8956.JPG.jpeg",
  "/page-images/IMG_8958.JPG.jpeg",
  "/page-images/IMG_8959.JPG.jpeg",
  "/page-images/IMG_8960.JPG.jpeg",
  "/page-images/IMG_8961.JPG.jpeg",
  "/page-images/IMG_8962.JPG.jpeg",
  "/page-images/IMG_8963.JPG.jpeg",
  "/page-images/IMG_8964.JPG.jpeg",
  "/page-images/IMG_8965.JPG.jpeg",
  "/page-images/IMG_8966.JPG.jpeg",
  "/page-images/IMG_8967.JPG.jpeg",
  "/page-images/IMG_8970.JPG.jpeg",
  "/page-images/IMG_8971.JPG.jpeg",
  "/page-images/IMG_8972.JPG.jpeg",
  "/page-images/IMG_8975.JPG.jpeg",
  "/page-images/IMG_8978.JPG.jpeg",
  "/page-images/IMG_8980.JPG.jpeg",
  "/page-images/IMG_8981.JPG.jpeg",
  "/page-images/IMG_8982.JPG.jpeg",
  "/page-images/IMG_8983.JPG.jpeg",
  "/page-images/IMG_8984.JPG.jpeg",
  "/page-images/IMG_8985.JPG.jpeg",
  "/page-images/IMG_8988.JPG.jpeg",
  "/page-images/IMG_8989.JPG.jpeg",
  "/page-images/IMG_8994.JPG.jpeg",
  "/page-images/IMG_8996.JPG.jpeg",
];

// Fisher-Yates shuffle
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const sql = postgres(url, { ssl: "require" });

  try {
    // Get all affirmations ordered by booklet and day
    const affs = await sql`
      SELECT id, booklet_id, day_number, title FROM affirmations
      ORDER BY booklet_id, day_number
    `;

    console.log(`Found ${affs.length} affirmations total\n`);

    // Build a shuffled image list that covers all affirmations
    // Repeat and shuffle to ensure variety across all pages
    let imagePool = [];
    while (imagePool.length < affs.length) {
      imagePool = imagePool.concat(shuffle(IMAGES));
    }

    // Update each affirmation with a randomized image
    let updated = 0;
    for (let i = 0; i < affs.length; i++) {
      const aff = affs[i];
      const img = imagePool[i];
      await sql`
        UPDATE affirmations SET image_url = ${img} WHERE id = ${aff.id}
      `;
      updated++;
      console.log(`  Day ${aff.day_number} (booklet ${aff.booklet_id}): ${aff.title} → ${img.split('/').pop()}`);
    }

    console.log(`\n✅ Randomized images for ${updated} affirmations across all booklets`);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
