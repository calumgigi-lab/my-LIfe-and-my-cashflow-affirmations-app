#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const readline = require("readline");

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
  console.log("\n📚 AFFIRMATION QUICK ENTRY");
  console.log("===========================\n");

  // Load existing template
  const templatePath = path.join(process.cwd(), "affirmations_template.json");
  let data = [];

  if (fs.existsSync(templatePath)) {
    data = JSON.parse(fs.readFileSync(templatePath, "utf-8"));
    console.log(`✅ Loaded existing template with ${data.length} booklets\n`);
  }

  // Select booklet
  console.log("Available booklets:");
  data.forEach((b, i) => {
    const filled = b.affirmations.filter(
      (a) => !a.content.includes("[ADD") && a.content.trim().length > 10
    ).length;
    console.log(
      `[${i}] ${b.title} (${filled}/${b.affirmations.length} filled)`
    );
  });

  const bookletIdx = parseInt(await question("\nSelect booklet number: "));
  if (bookletIdx < 0 || bookletIdx >= data.length) {
    console.log("❌ Invalid selection");
    rl.close();
    return;
  }

  const booklet = data[bookletIdx];
  console.log(`\n📖 Working on: ${booklet.title}\n`);

  // Quick entry mode
  let continueEntry = true;
  while (continueEntry) {
    const day = parseInt(await question("Enter day number (1-31) or 0 to exit: "));
    if (day === 0) break;
    if (day < 1 || day > 31) {
      console.log("❌ Invalid day");
      continue;
    }

    const affirmation = booklet.affirmations[day - 1];
    console.log(
      `\n▶ Day ${day}: ${affirmation.title}\n`
    );

    const title = await question(
      "Title (or press Enter to keep): "
    );
    if (title.trim()) {
      affirmation.title = title.trim();
    }

    console.log("\n📝 Content (paste your affirmation, then press Enter twice):");
    console.log("─".repeat(50));

    let content = "";
    let emptyLines = 0;
    let collectingContent = true;

    while (collectingContent) {
      const line = await new Promise((resolve) => {
        rl.question("", resolve);
      });

      if (line.trim() === "") {
        emptyLines++;
        if (emptyLines >= 1) {
          collectingContent = false;
        }
      } else {
        emptyLines = 0;
        content += line + "\n";
      }
    }

    if (content.trim()) {
      affirmation.content = content.trim();
      console.log(`\n✅ Day ${day} saved!`);
    }

    console.log("─".repeat(50) + "\n");
  }

  // Save to file
  fs.writeFileSync(templatePath, JSON.stringify(data, null, 2), "utf-8");
  console.log(`\n✅ Saved to ${templatePath}`);

  // Show progress
  const totalFilled = data.reduce((sum, b) => {
    const filled = b.affirmations.filter(
      (a) => !a.content.includes("[ADD") && a.content.trim().length > 10
    ).length;
    return sum + filled;
  }, 0);

  console.log(
    `\n📊 Progress: ${totalFilled} affirmations filled across all booklets\n`
  );

  console.log("Next steps:");
  console.log("  1. npm run db:push");
  console.log("  2. tsx server/seed-new.ts\n");

  rl.close();
}

main().catch(console.error);
