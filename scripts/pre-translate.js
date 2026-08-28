/**
 * Batch pre-translate all affirmations into all supported languages.
 *
 * Usage:
 *   GOOGLE_TRANSLATE_API_KEY=... node scripts/pre-translate.js
 *   # or with LibreTranslate:
 *   LIBRETRANSLATE_URL=http://localhost:5000/translate node scripts/pre-translate.js
 *
 * Skips already-cached translations so it's safe to re-run.
 */

const { translateAffirmation } = require("../api/translate");

const SUPPORTED_LANGUAGES = [
  "es", "fr", "de", "pt", "it", "ru", "zh", "ja", "ar", "hi", "yo", "ig", "ha",
];

async function run() {
  const { sql } = await connectDB();

  console.log("Ensuring translation table...");
  await sql`
    CREATE TABLE IF NOT EXISTS affirmation_translations (
      id SERIAL PRIMARY KEY,
      affirmation_id INTEGER NOT NULL REFERENCES affirmations(id),
      language VARCHAR(10) NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
      UNIQUE(affirmation_id, language)
    )
  `;

  const affs = await sql`
    SELECT id, title, content FROM affirmations ORDER BY id ASC
  `;
  console.log(`Found ${affs.length} affirmations to translate`);

  let total = 0;
  let skipped = 0;
  let errors = 0;

  for (const aff of affs) {
    for (const lang of SUPPORTED_LANGUAGES) {
      const cached = await sql`
        SELECT id FROM affirmation_translations
        WHERE affirmation_id = ${aff.id} AND language = ${lang}
        LIMIT 1
      `;
      if (cached.length) {
        skipped++;
        continue;
      }

      try {
        console.log(`Translating #${aff.id} -> ${lang}...`);
        const result = await translateAffirmation(aff.title, aff.content, lang);
        await sql`
          INSERT INTO affirmation_translations (affirmation_id, language, title, content, updated_at)
          VALUES (${aff.id}, ${lang}, ${result.title}, ${result.content}, NOW())
          ON CONFLICT (affirmation_id, language) DO NOTHING
        `;
        total++;
      } catch (e) {
        console.error(`Failed to translate #${aff.id} -> ${lang}: ${e.message}`);
        errors++;
      }
    }
  }

  console.log(`\nDone!`);
  console.log(`  Translated: ${total}`);
  console.log(`  Skipped (cached): ${skipped}`);
  console.log(`  Errors: ${errors}`);
  process.exit(errors > 0 ? 1 : 0);
}

async function connectDB() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }
  const postgres = require("postgres");
  const sql = postgres(url, { ssl: "require", max: 1 });
  return { sql };
}

run().catch((e) => {
  console.error("Fatal:", e.message);
  process.exit(1);
});
