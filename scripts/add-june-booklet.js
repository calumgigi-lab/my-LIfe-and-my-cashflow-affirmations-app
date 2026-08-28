#!/usr/bin/env node
/**
 * Migration script to add June 2026 booklet and affirmations to the database
 * Usage: node scripts/add-june-booklet.js
 * 
 * This script:
 * 1. Connects to the database
 * 2. Creates the June 2026 booklet if it doesn't exist
 * 3. Inserts all 31 daily affirmations for June 2026
 * 4. Assigns local WhatsApp images to each affirmation using the seeded randomization
 */

require('dotenv').config({ path: '.env.local' });
const postgres = require('postgres');

const affirmationsData = require('../affirmations_june_2026.json');

// Image pool + randomization algorithm — kept in sync with lib/affirmation-images.ts
// so June images match the scheme used by every other month in production.
const AFFIRMATION_IMAGES = [
  '/page-images/IMG_0049.JPG.jpeg',
  '/page-images/IMG_0050.JPG.jpeg',
  '/page-images/IMG_0051.JPG.jpeg',
  '/page-images/IMG_0052.JPG.jpeg',
  '/page-images/IMG_0053.JPG.jpeg',
  '/page-images/IMG_0054.JPG.jpeg',
  '/page-images/IMG_0055.JPG.jpeg',
  '/page-images/IMG_0056.JPG.jpeg',
  '/page-images/IMG_0057.JPG.jpeg',
  '/page-images/IMG_0058.JPG.jpeg',
  '/page-images/IMG_0059.JPG.jpeg',
  '/page-images/IMG_0060.JPG.jpeg',
  '/page-images/IMG_0061.JPG.jpeg',
  '/page-images/IMG_0062.JPG.jpeg',
  '/page-images/IMG_0063.JPG.jpeg',
  '/page-images/IMG_0064.JPG.jpeg',
  '/page-images/IMG_0065.JPG.jpeg',
  '/page-images/IMG_0066.JPG.jpeg',
  '/page-images/IMG_0068.JPG.jpeg',
  '/page-images/IMG_0069.JPG.jpeg',
  '/page-images/IMG_0070.JPG.jpeg',
  '/page-images/IMG_0071.JPG.jpeg',
  '/page-images/IMG_0072.JPG.jpeg',
  '/page-images/IMG_0073.JPG.jpeg',
  '/page-images/IMG_0074.JPG.jpeg',
  '/page-images/IMG_0075.JPG.jpeg',
  '/page-images/IMG_0076.JPG.jpeg',
  '/page-images/IMG_0077.JPG.jpeg',
  '/page-images/IMG_0078.JPG.jpeg',
  '/page-images/IMG_0079.JPG.jpeg',
  '/page-images/IMG_0080.JPG.jpeg',
  '/page-images/IMG_0083.JPG.jpeg',
  '/page-images/IMG_0085.JPG.jpeg',
  '/page-images/IMG_0086.JPG.jpeg',
  '/page-images/IMG_2782.JPG.jpeg',
  '/page-images/IMG_2788.JPG.jpeg',
  '/page-images/IMG_2789.JPG.jpeg',
  '/page-images/IMG_8956.JPG.jpeg',
  '/page-images/IMG_8958.JPG.jpeg',
  '/page-images/IMG_8959.JPG.jpeg',
  '/page-images/IMG_8960.JPG.jpeg',
  '/page-images/IMG_8961.JPG.jpeg',
  '/page-images/IMG_8962.JPG.jpeg',
  '/page-images/IMG_8963.JPG.jpeg',
  '/page-images/IMG_8964.JPG.jpeg',
  '/page-images/IMG_8965.JPG.jpeg',
  '/page-images/IMG_8966.JPG.jpeg',
  '/page-images/IMG_8967.JPG.jpeg',
  '/page-images/IMG_8970.JPG.jpeg',
  '/page-images/IMG_8971.JPG.jpeg',
  '/page-images/IMG_8972.JPG.jpeg',
  '/page-images/IMG_8975.JPG.jpeg',
  '/page-images/IMG_8978.JPG.jpeg',
  '/page-images/IMG_8980.JPG.jpeg',
  '/page-images/IMG_8981.JPG.jpeg',
  '/page-images/IMG_8982.JPG.jpeg',
  '/page-images/IMG_8983.JPG.jpeg',
  '/page-images/IMG_8984.JPG.jpeg',
  '/page-images/IMG_8985.JPG.jpeg',
  '/page-images/IMG_8988.JPG.jpeg',
  '/page-images/IMG_8989.JPG.jpeg',
  '/page-images/IMG_8994.JPG.jpeg',
  '/page-images/IMG_8996.JPG.jpeg',
];

function getLocalImagePath(bookletId, dayNumber) {
  let h = ((bookletId * 2654435761) ^ (dayNumber * 2246822519)) >>> 0;
  h = (((h >> 16) ^ h) * 0x45d9f3b) >>> 0;
  h = ((h >> 16) ^ h) >>> 0;
  return AFFIRMATION_IMAGES[h % AFFIRMATION_IMAGES.length];
}

async function addJuneBooklet() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('❌ DATABASE_URL not set. Please configure your environment.');
    process.exit(1);
  }

  const sql = postgres(url, { ssl: 'require', max: 1 });

  try {
    console.log('🚀 Starting June 2026 booklet migration...\n');

    // Check if June 2026 already exists
    const existing = await sql`
      SELECT id FROM booklets WHERE month = 6 AND year = 2026
    `;

    let bookletId;
    if (existing.length > 0) {
      bookletId = existing[0].id;
      console.log(`✅ June 2026 booklet already exists (ID: ${bookletId})`);
      
      // Delete existing affirmations for this booklet
      const deleteResult = await sql`
        DELETE FROM affirmations WHERE booklet_id = ${bookletId}
      `;
      console.log(`🗑️  Deleted ${deleteResult.count} existing affirmations\n`);
    } else {
      // Create June 2026 booklet
      const bookletData = affirmationsData[0];
      const result = await sql`
        INSERT INTO booklets (title, month, year, description, cover_color)
        VALUES (
          ${bookletData.title},
          ${bookletData.month},
          ${bookletData.year},
          ${bookletData.description},
          '#6366F1'
        )
        RETURNING id
      `;
      bookletId = result[0].id;
      console.log(`✅ Created June 2026 booklet (ID: ${bookletId})\n`);
    }

    // Insert affirmations
    const bookletData = affirmationsData[0];
    let inserted = 0;

    for (const aff of bookletData.affirmations) {
      const imageUrl = getLocalImagePath(bookletId, aff.dayNumber);
      
      await sql`
        INSERT INTO affirmations (booklet_id, day_number, title, content, image_url)
        VALUES (
          ${bookletId},
          ${aff.dayNumber},
          ${aff.title},
          ${aff.content},
          ${imageUrl}
        )
      `;
      inserted++;
      
      if (inserted % 10 === 0) {
        process.stdout.write(`\r📝 Inserted ${inserted}/${bookletData.affirmations.length} affirmations`);
      }
    }

    console.log(`\r✅ Inserted ${inserted}/${bookletData.affirmations.length} affirmations\n`);

    console.log('🎉 June 2026 booklet migration complete!');
    console.log(`   Booklet ID: ${bookletId}`);
    console.log(`   Affirmations: ${inserted}`);
    console.log(`   Images: Local WhatsApp images with seeded randomization\n`);

    await sql.end();
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    await sql.end();
    process.exit(1);
  }
}

addJuneBooklet();
