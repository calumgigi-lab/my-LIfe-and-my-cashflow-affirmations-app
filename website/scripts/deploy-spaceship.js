#!/usr/bin/env node
/**
 * deploy-spaceship.js
 * Usage: node scripts/deploy-spaceship.js
 *
 * Reads credentials from .ftp-credentials (never commit that file).
 * Uploads everything in public/ to your Spaceship public_html/, overwriting all files.
 */

const ftp  = require("basic-ftp");
const fs   = require("fs");
const path = require("path");

// ── Load credentials ─────────────────────────────────────────────────────────
const credFile = path.join(__dirname, "..", ".ftp-credentials");
if (!fs.existsSync(credFile)) {
  console.error(`
ERROR: .ftp-credentials file not found.

Create a file called  .ftp-credentials  in the website/ folder with:

  FTP_HOST=server50.shared.spaceship.host
  FTP_USER=your_cpanel_username
  FTP_PASS=your_cpanel_password
  REMOTE_DIR=/public_html
`);
  process.exit(1);
}

const creds = {};
fs.readFileSync(credFile, "utf8")
  .split(/\r?\n/)
  .forEach(line => {
    const i = line.indexOf("=");
    if (i > 0) creds[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  });

const { FTP_HOST, FTP_USER, FTP_PASS, REMOTE_DIR = "/public_html" } = creds;

if (!FTP_HOST || !FTP_USER || !FTP_PASS) {
  console.error("ERROR: .ftp-credentials must contain FTP_HOST, FTP_USER, and FTP_PASS.");
  process.exit(1);
}

// ── Deploy ────────────────────────────────────────────────────────────────────
const localDir = path.join(__dirname, "..", "public");

async function deploy() {
  const client = new ftp.Client();

  let uploaded = 0;
  client.trackProgress(info => {
    if (info.name) {
      uploaded++;
      process.stdout.clearLine?.(0);
      process.stdout.cursorTo?.(0);
      process.stdout.write(`  ↑ [${uploaded}] ${info.name}`);
    }
  });

  try {
    console.log(`\nConnecting to ${FTP_HOST}…`);
    await client.access({
      host:     FTP_HOST,
      user:     FTP_USER,
      password: FTP_PASS,
      secure:   true,          // explicit FTPS (port 21 + TLS)
      secureOptions: { rejectUnauthorized: false },
    });

    console.log(`Uploading ${localDir}  →  ${REMOTE_DIR}\n`);
    await client.uploadFromDir(localDir, REMOTE_DIR);
    process.stdout.write("\n");
    console.log(`\n✓  Deploy complete! ${uploaded} files uploaded.\n`);
  } catch (err) {
    process.stdout.write("\n");
    // If FTPS fails, retry with plain FTP
    if (err.message?.includes("ECONNRESET") || err.code === 530 || err.code === 500) {
      console.warn("FTPS failed, retrying with plain FTP…");
      client.close();
      await deployPlain();
      return;
    }
    console.error("Deploy failed:", err.message);
    process.exit(1);
  } finally {
    client.close();
  }
}

async function deployPlain() {
  const client = new ftp.Client();
  let uploaded = 0;
  client.trackProgress(info => {
    if (info.name) {
      uploaded++;
      process.stdout.clearLine?.(0);
      process.stdout.cursorTo?.(0);
      process.stdout.write(`  ↑ [${uploaded}] ${info.name}`);
    }
  });

  try {
    await client.access({ host: FTP_HOST, user: FTP_USER, password: FTP_PASS, secure: false });
    await client.uploadFromDir(localDir, REMOTE_DIR);
    process.stdout.write("\n");
    console.log(`\n✓  Deploy complete! ${uploaded} files uploaded.\n`);
  } catch (err) {
    process.stdout.write("\n");
    console.error("Deploy failed:", err.message);
    process.exit(1);
  } finally {
    client.close();
  }
}

deploy();
