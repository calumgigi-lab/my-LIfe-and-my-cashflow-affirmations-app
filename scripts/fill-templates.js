#!/usr/bin/env node

/**
 * Fill all templates with sample affirmations
 * Demonstrates complete working system
 */

const fs = require("fs");

const samples = [
  {
    title: "New Beginnings",
    content: "I am stepping into this month with unlimited potential. Every moment is a fresh start and I embrace the journey ahead with clarity and purpose.",
  },
  {
    title: "Abundance Flows",
    content: "Money flows to me effortlessly from multiple sources. I am grateful for prosperity and I attract wealth with ease.",
  },
  {
    title: "Inner Strength",
    content: "I am strong, resilient, and capable. My mind is sharp and my spirit is unbreakable. I face challenges with confidence.",
  },
  {
    title: "Love & Gratitude",
    content: "I am deeply grateful for every blessing. My heart overflows with appreciation and I attract more goodness daily.",
  },
  {
    title: "Success Mindset",
    content: "I am a magnet for success. Every action I take brings me closer to my goals. I believe in my abilities completely.",
  },
  {
    title: "Health & Vitality",
    content: "My body is healthy and vibrant. I nourish myself with intention and my energy grows stronger every day.",
  },
  {
    title: "Purpose Driven",
    content: "I live with clear purpose and passion. My mission to myself is unwavering and I pursue it with determination.",
  },
  {
    title: "Limitless Growth",
    content: "I am constantly evolving and growing. Every challenge makes me stronger and every day brings new opportunities.",
  },
  {
    title: "Divine Alignment",
    content: "I am aligned with my highest purpose. The universe conspires in my favor and guides me towards my desires.",
  },
  {
    title: "Confidence Rising",
    content: "I walk in confidence and self-assurance. My worth is undeniable and I radiate positive energy.",
  },
  {
    title: "Manifestation Power",
    content: "I am a powerful manifestor. My thoughts become reality and my words carry creative power.",
  },
  {
    title: "Peace Within",
    content: "I am at peace with who I am. My mind is calm and my heart is centered in tranquility.",
  },
];

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const years = [2025, 2026];

console.log("📝 Filling templates with affirmations...\n");

for (const year of years) {
  for (let m = 0; m < months.length; m++) {
    const month = months[m];
    const monthLower = month.toLowerCase();
    const filename = `template_${monthLower}_${year}.txt`;

    let content = `Month: ${month}\nYear: ${year}\n\n`;

    for (let day = 1; day <= 31; day++) {
      const sample = samples[(day - 1) % samples.length];
      content += `Day ${day}: ${sample.title}\n`;
      content += `${sample.content}\n\n`;
    }

    fs.writeFileSync(filename, content, "utf-8");
    console.log(`✓ ${filename}`);
  }
}

console.log("\n✅ All templates filled!");
console.log("\n📁 Created 24 files:");
console.log("   - template_january_2025.txt through template_december_2025.txt");
console.log("   - template_january_2026.txt through template_december_2026.txt");

console.log("\n✨ You can now:");
console.log("   1. Run bulk imports on all files");
console.log("   2. See the full system working");
console.log("   3. Replace with your PDF content anytime via admin panel\n");
