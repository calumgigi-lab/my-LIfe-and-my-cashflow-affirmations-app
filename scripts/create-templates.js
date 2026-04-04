#!/usr/bin/env node

/**
 * Create empty month-structured templates
 * User fills in affirmations super fast
 */

const fs = require("fs");
const path = require("path");

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const years = [2025, 2026];

console.log("📋 Creating month templates...\n");

for (const year of years) {
  for (let i = 0; i < months.length; i++) {
    const month = months[i];
    const monthLower = month.toLowerCase();
    const filename = `template_${monthLower}_${year}.txt`;

    let content = `Month: ${month}\nYear: ${year}\n\n`;

    for (let day = 1; day <= 31; day++) {
      content += `Day ${day}: [TITLE]\n`;
      content += `[AFFIRMATION CONTENT]\n\n`;
    }

    fs.writeFileSync(filename, content, "utf-8");
    console.log(`✓ ${filename}`);
  }
}

console.log("\n✅ Templates created!");
console.log("\nHow to use:");
console.log("1. Open template_january_2025.txt");
console.log("2. Replace [TITLE] and [AFFIRMATION CONTENT]");
console.log("3. Save file");
console.log("4. npm run affirmations:bulk template_january_2025.txt");
console.log("\nRepeat for all months\n");
