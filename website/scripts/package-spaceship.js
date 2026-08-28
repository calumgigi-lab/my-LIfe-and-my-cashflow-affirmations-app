const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const publicDir = path.join(__dirname, "..", "public");
const stagingDir = path.join(__dirname, "..", ".deploy-staging");
const zipPath = path.join(__dirname, "..", "zionhouse-spaceship-deploy.zip");

try {
  execSync("python scripts/make-og-image.py", {
    cwd: path.join(__dirname, ".."),
    stdio: "inherit",
  });
} catch {
  console.warn("Could not regenerate og-image.jpg; using existing file if present.");
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

if (fs.existsSync(stagingDir)) fs.rmSync(stagingDir, { recursive: true, force: true });
if (fs.existsSync(zipPath)) fs.rmSync(zipPath, { force: true });

copyDir(publicDir, stagingDir);

execSync(
  `powershell -NoProfile -Command "Compress-Archive -Path '${stagingDir.replace(/'/g, "''")}\\*' -DestinationPath '${zipPath.replace(/'/g, "''")}' -CompressionLevel Optimal"`,
  { stdio: "inherit" },
);

fs.rmSync(stagingDir, { recursive: true, force: true });

const sizeMb = (fs.statSync(zipPath).size / (1024 * 1024)).toFixed(2);
console.log(`Created ${zipPath} (${sizeMb} MB)`);
