#!/usr/bin/env node

/**
 * 🚀 ULTRA-FAST COPY-PASTE AFFIRMATION BUILDER
 * 
 * This tool makes copy-pasting from PDFs LIGHTNING FAST:
 * 1. Open your PDF
 * 2. Copy affirmation text
 * 3. Paste into this tool
 * 4. Auto-formats and saves
 * 
 * Total time per month: 2-3 minutes
 */

const readline = require("readline");
const fs = require("fs");
const path = require("path");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

const monthNames = [
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

async function main() {
  console.clear();
  console.log("🚀 ULTRA-FAST AFFIRMATION COPY-PASTE\n");
  console.log("=====================================");
  console.log("Instructions:");
  console.log("1. Open your PDF in a viewer");
  console.log("2. Copy affirmation text (Ctrl+C)");
  console.log("3. Paste here when prompted");
  console.log("4. Auto-saves to .txt file\n");
  console.log("=====================================\n");

  // Select month
  console.log("Available months:");
  monthNames.forEach((m, i) => {
    if (i > 0) console.log(`[${i}] ${m}`);
  });

  const monthIdx = parseInt(await question("\nSelect month (1-12): "));
  if (monthIdx < 1 || monthIdx > 12) {
    console.log("❌ Invalid selection");
    rl.close();
    return;
  }

  const month = monthNames[monthIdx];
  const year = parseInt(await question("Enter year (e.g., 2025): "));

  const outputFile = `${month.toLowerCase()}_${year}.txt`;

  console.log(`\n📝 Creating: ${outputFile}`);
  console.log("Entry mode - paste affirmations as you copy from PDF\n");

  let affirmations = [];
  let continueEntry = true;

  while (continueEntry) {
    const day = parseInt(
      await question(
        `\nEnter day number (1-31, 0 to finish): `
      )
    );

    if (day === 0) {
      continueEntry = false;
      break;
    }

    if (day < 1 || day > 31) {
      console.log("❌ Invalid day (1-31)");
      continue;
    }

    const title = await question(`Day ${day} Title: `);

    console.log(`\n📋 Day ${day} Content:`);
    console.log("Paste your affirmation (Ctrl+Shift+V on Windows)");
    console.log("Press Enter, then Ctrl+D when done:\n");

    let content = "";
    let lines = [];

    // Collect multi-line input
    const collectContent = async () => {
      for (let i = 0; i < 50; i++) {
        // Max 50 lines
        const line = await new Promise((resolve) => {
          rl.question("", resolve);
        });

        if (line === undefined || line === null) break; // Ctrl+D

        if (line.trim() === "") {
          // Empty line signals end
          if (lines.length > 0) break;
        } else {
          lines.push(line);
        }
      }
    };

    await collectContent();
    content = lines.join("\n").trim();

    if (content.length > 10) {
      affirmations.push({
        day,
        title,
        content,
      });
      console.log(`✅ Day ${day} saved (${content.length} chars)`);
    } else {
      console.log("❌ Content too short, skipped");
    }
  }

  // Save to file
  let fileContent = `Month: ${month}\nYear: ${year}\n\n`;

  for (const aff of affirmations) {
    fileContent += `Day ${aff.day}: ${aff.title}\n`;
    fileContent += `${aff.content}\n\n`;
  }

  fs.writeFileSync(outputFile, fileContent, "utf-8");

  console.log(`\n✅ SUCCESS!`);
  console.log(`📁 Saved: ${outputFile}`);
  console.log(`📊 Affirmations: ${affirmations.length}`);
  console.log(`\n🚀 Next step:`);
  console.log(`   npm run affirmations:bulk ${outputFile}\n`);

  rl.close();
}

main().catch(console.error);
