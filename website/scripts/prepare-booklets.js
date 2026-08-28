/**
 * Copies affirmation booklet cover art into website/public/assets/booklets.
 */
const fs = require("fs");
const path = require("path");

const srcDir = path.join(__dirname, "..", "..", "book thumbnail");
const destDir = path.join(__dirname, "..", "public", "assets", "booklets");

const files = [
  ["january.png", "january.png"],
  ["february.png", "february.png"],
  ["march.png", "march.png"],
  ["april.png", "april.png"],
  ["may 2026.png", "may-2026.png"],
  ["may.png", "may.png"],
  ["june 2026.png", "june-2026.png"],
  ["june.png", "june.png"],
  ["july 2026.png", "july-2026.png"],
  ["july.png", "july.png"],
  ["august.png", "august.png"],
  ["september.png", "september.png"],
  ["october.png", "october.png"],
  ["november.png", "november.png"],
  ["december.png", "december.png"],
];

if (!fs.existsSync(srcDir)) {
  console.warn("Source book thumbnails not found:", srcDir);
  process.exit(0);
}

fs.mkdirSync(destDir, { recursive: true });

let copied = 0;
for (const [srcName, destName] of files) {
  const src = path.join(srcDir, srcName);
  if (!fs.existsSync(src)) continue;
  fs.copyFileSync(src, path.join(destDir, destName));
  copied += 1;
}

console.log(`Copied ${copied} booklet covers to website/public/assets/booklets`);
