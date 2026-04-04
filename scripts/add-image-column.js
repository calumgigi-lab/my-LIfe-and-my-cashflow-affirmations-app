// Manually add image_url column to affirmations table  
const dotenv = require('dotenv');
const path = require('path');
const pg = require('pg');

const envPath = path.join(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

const client = new pg.Client(process.env.DATABASE_URL);

(async () => {
  try {
    await client.connect();
    console.log('✓ Connected to database');

    // Add image_url column if it doesn't exist
    const query = `
      ALTER TABLE affirmations
      ADD COLUMN IF NOT EXISTS image_url text;
    `;

    await client.query(query);
    console.log('✓ Added image_url column to affirmations table');

    await client.end();
    console.log('✓ Migration complete');
  } catch (err) {
    console.error('❌ Migration error:', err);
    process.exit(1);
  }
})();
