/**
 * Download Google Play listing screenshots for com.mylifemycashflow.
 */
const fs = require("fs");
const path = require("path");
const https = require("https");
const { execSync } = require("child_process");

const PACKAGE = "com.mylifemycashflow";
const DEST = path.join(__dirname, "..", "public", "assets", "app");
const PLAY_URL = `https://play.google.com/store/apps/details?id=${PACKAGE}&hl=en&gl=ng`;

const SCREEN_META = [
  { file: "screenshot-library.webp", label: "Library", caption: "Browse & unlock monthly booklets" },
  { file: "screenshot-today.webp", label: "Today", caption: "Daily affirmation on your home screen" },
  { file: "screenshot-profile.webp", label: "Profile", caption: "Track streaks and your journey" },
  { file: "screenshot-leaderboard.webp", label: "Leaderboard", caption: "Points, ranks & community" },
];

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0" } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetchText(res.headers.location).then(resolve).catch(reject);
          return;
        }
        let data = "";
        res.on("data", (chunk) => { data += chunk; });
        res.on("end", () => resolve(data));
      })
      .on("error", reject);
  });
}

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0" } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetchBuffer(res.headers.location).then(resolve).catch(reject);
          return;
        }
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => resolve(Buffer.concat(chunks)));
      })
      .on("error", reject);
  });
}

function extractScreenshotBases(html) {
  const found = [];
  const seen = new Set();
  const marker = /Screenshot image/g;
  let match;

  while ((match = marker.exec(html)) !== null) {
    const chunk = html.slice(Math.max(0, match.index - 900), match.index + 200);
    const urls = chunk.match(/https:\/\/play-lh\.googleusercontent\.com\/[A-Za-z0-9_\-]+/g) || [];
    for (const url of urls) {
      if (seen.has(url)) continue;
      seen.add(url);
      found.push(url);
    }
  }

  return found.slice(0, SCREEN_META.length);
}

function isImageBuffer(buffer) {
  if (!buffer || buffer.length < 12) return false;
  const riff = buffer.slice(0, 4).toString("ascii");
  const png = buffer[0] === 0x89 && buffer[1] === 0x50;
  return riff === "RIFF" || png;
}

async function main() {
  fs.mkdirSync(DEST, { recursive: true });

  const html = await fetchText(PLAY_URL);
  const bases = extractScreenshotBases(html);
  if (bases.length < SCREEN_META.length) {
    throw new Error(`Expected ${SCREEN_META.length} screenshots, found ${bases.length}`);
  }

  const manifest = [];
  for (let i = 0; i < SCREEN_META.length; i += 1) {
    const meta = SCREEN_META[i];
    const source = `${bases[i]}=w1052-h592-rw`;
    const buffer = await fetchBuffer(source);
    if (!isImageBuffer(buffer)) {
      throw new Error(`Invalid image response for ${meta.file}`);
    }
    fs.writeFileSync(path.join(DEST, meta.file), buffer);
    manifest.push({ ...meta, source });
    console.log(`Saved ${meta.file}`);
  }

  fs.writeFileSync(
    path.join(DEST, "screenshots.json"),
    JSON.stringify(
      {
        package: PACKAGE,
        playUrl: `https://play.google.com/store/apps/details?id=${PACKAGE}`,
        updatedAt: new Date().toISOString(),
        screenshots: manifest,
      },
      null,
      2,
    ),
  );

  console.log(`Downloaded ${manifest.length} Play Store screenshots`);

  try {
    execSync(`python "${path.join(__dirname, "process-app-screenshots.py")}"`, { stdio: "inherit" });
  } catch (error) {
    console.warn("Transparent PNG processing failed:", error.message);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
