/**
 * Copies page-images from the main app into website/public for standalone deploy.
 */
const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "..", "..", "public", "page-images");
const dest = path.join(__dirname, "..", "public", "page-images");

if (!fs.existsSync(src)) {
  console.warn("Source page-images not found:", src);
  process.exit(0);
}

fs.mkdirSync(dest, { recursive: true });
for (const file of fs.readdirSync(src)) {
  fs.copyFileSync(path.join(src, file), path.join(dest, file));
}
console.log(`Copied ${fs.readdirSync(dest).length} images to website/public/page-images`);
