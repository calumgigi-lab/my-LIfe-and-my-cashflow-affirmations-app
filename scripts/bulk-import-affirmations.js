#!/usr/bin/env node

/**
 * BULK AFFIRMATION IMPORTER
 * 
 * Usage:
 * 1. Create a text file with format:
 *    ---
 *    Month: January
 *    Year: 2025
 *    
 *    Day 1: Title
 *    Content here can be multiple paragraphs
 *    and will be automatically formatted
 *    
 *    Day 2: Another Title
 *    Content for day 2
 *    ---
 * 2. Run: node scripts/bulk-import-affirmations.js <filename>
 */

const fs = require("fs");
const path = require("path");

const monthNames = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

function parseAffirmationFile(content) {
  const lines = content.split("\n");
  let month = null;
  let year = null;
  const affirmations = [];
  let currentDay = null;
  let currentTitle = null;
  let currentContent = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Parse month/year
    if (line.match(/^month:\s*/i)) {
      const monthStr = line.replace(/^month:\s*/i, "").toLowerCase();
      month = monthNames[monthStr] || null;
    }
    if (line.match(/^year:\s*/i)) {
      year = parseInt(line.replace(/^year:\s*/i, ""));
    }

    // Parse day entries: "Day 1: Title" or "1. Title"
    const dayMatch = line.match(/^(?:day\s+)?(\d+)[:.]\s*(.*)/i);
    if (dayMatch) {
      // Save previous affirmation
      if (currentDay && currentTitle && currentContent.length > 0) {
        affirmations.push({
          dayNumber: currentDay,
          title: currentTitle,
          content: currentContent.join("\n").trim(),
        });
      }

      currentDay = parseInt(dayMatch[1]);
      currentTitle = dayMatch[2].trim();
      currentContent = [];
    } else if (currentDay && line.length > 0) {
      // Add content for current day
      currentContent.push(line);
    }
  }

  // Don't forget the last one
  if (currentDay && currentTitle && currentContent.length > 0) {
    affirmations.push({
      dayNumber: currentDay,
      title: currentTitle,
      content: currentContent.join("\n").trim(),
    });
  }

  return { month, year, affirmations };
}

async function main() {
  const inputFile = process.argv[2];

  if (!inputFile) {
    console.log(`
🚀 BULK AFFIRMATION IMPORTER
=============================

Usage:
  node scripts/bulk-import-affirmations.js <file>

File Format Example:
  ---
  Month: January
  Year: 2025
  
  Day 1: New Beginnings
  I am stepping into a new year with unlimited potential.
  Every moment is a fresh start and I embrace the journey ahead.
  
  Day 2: Abundance
  Money flows to me effortlessly from every direction.
  I am grateful for all that comes my way.
  ---

Supported date formats:
  - 'Day 1: Title' or 'day 1: Title'
  - '1. Title' or '1: Title'
  - Month: January, February, etc. (case-insensitive)
  - Year: 2025
    `);
    process.exit(0);
  }

  if (!fs.existsSync(inputFile)) {
    console.error(`❌ File not found: ${inputFile}`);
    process.exit(1);
  }

  console.log(`\n📂 Reading: ${inputFile}`);
  const fileContent = fs.readFileSync(inputFile, "utf-8");

  // Parse the file
  const { month, year, affirmations } = parseAffirmationFile(fileContent);

  if (!month || !year) {
    console.error(
      "\n❌ Could not parse month/year. Make sure file contains:"
    );
    console.error("   Month: January");
    console.error("   Year: 2025");
    process.exit(1);
  }

  if (affirmations.length === 0) {
    console.error(
      "\n❌ No affirmations found. Check file format."
    );
    process.exit(1);
  }

  // Load or create template
  const templatePath = path.join(process.cwd(), "affirmations_template.json");
  let data = [];

  if (fs.existsSync(templatePath)) {
    data = JSON.parse(fs.readFileSync(templatePath, "utf-8"));
  }

  // Find or create matching booklet
  const monthNames_full = [
    "",
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  let booklet = data.find((b) => b.month === month && b.year === year);

  if (!booklet) {
    booklet = {
      title: `Affirmations - ${monthNames_full[month]} ${year}`,
      month,
      year,
      description: `Daily affirmations for ${monthNames_full[month]} ${year}`,
      affirmations: Array.from({ length: 31 }, (_, i) => ({
        dayNumber: i + 1,
        title: `Day ${i + 1}`,
        content: "[ADD AFFIRMATION CONTENT HERE]",
      })),
    };
    data.push(booklet);
    console.log(`\n📚 Created new booklet: ${booklet.title}`);
  } else {
    console.log(`\n📚 Found existing booklet: ${booklet.title}`);
  }

  // Merge affirmations
  for (const aff of affirmations) {
    if (aff.dayNumber <= 31) {
      booklet.affirmations[aff.dayNumber - 1] = aff;
    }
  }

  // Save
  fs.writeFileSync(templatePath, JSON.stringify(data, null, 2), "utf-8");

  // Stats
  const filledCount = booklet.affirmations.filter(
    (a) =>
      !a.content.includes("[ADD") && a.content.trim().length > 10
  ).length;

  console.log(`\n✅ Success!`);
  console.log(`   Added ${affirmations.length} affirmations`);
  console.log(
    `   ${booklet.title} is now ${filledCount}/${booklet.affirmations.length} complete`
  );
  console.log(`\n📁 Saved to: affirmations_template.json`);

  console.log(`\n📚 Next steps:`);
  console.log(`   1. (Optional) Add more files using this script`);
  console.log(`   2. npm run db:push`);
  console.log(`   3. tsx server/seed-new.ts\n`);
}

main().catch(console.error);
