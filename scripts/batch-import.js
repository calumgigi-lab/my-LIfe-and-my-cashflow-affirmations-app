#!/usr/bin/env node

/**
 * Batch import all month files at once
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const months = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december"
];

const years = [2025, 2026];

console.log("🚀 BULK IMPORTING ALL AFFIRMATIONS...\n");
console.log("=" * 60);

let imported = 0;
let failed = 0;

for (const year of years) {
  for (const month of months) {
    const filename = `template_${month}_${year}.txt`;
    
    try {
      console.log(`\n📂 Importing: ${filename}`);
      const result = execSync(`node scripts/bulk-import-affirmations.js ${filename}`, {
        stdio: "pipe",
        encoding: "utf-8",
      });
      
      // Extract success message
      if (result.includes("Added")) {
        imported++;
        console.log(`   ✅ Success`);
      }
    } catch (error) {
      failed++;
      console.log(`   ❌ Failed: ${error.message}`);
    }
  }
}

console.log("\n" + "=" * 60);
console.log(`\n✅ BATCH IMPORT COMPLETE!`);
console.log(`   Imported: ${imported}/24`);
console.log(`   Failed: ${failed}/24\n`);

console.log("📊 Summary of affirmations_template.json:");
try {
  const data = require("./affirmations_template.json");
  const total = data.reduce((sum, b) => sum + b.affirmations.length, 0);
  const filled = data.reduce((sum, b) => {
    const count = b.affirmations.filter(a => !a.content.includes("[ADD")).length;
    return sum + count;
  }, 0);
  
  console.log(`   Total booklets: ${data.length}`);
  console.log(`   Total slots: ${total}`);
  console.log(`   Filled: ${filled}/${total}`);
  console.log(`   Completion: ${Math.round((filled / total) * 100)}%\n`);
} catch (e) {
  console.log("   Could not read template file\n");
}

console.log("🌱 Next step:");
console.log("   npm run db:push");
console.log("   npm run affirmations:seed\n");
