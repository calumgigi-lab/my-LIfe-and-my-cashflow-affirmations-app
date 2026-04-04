#!/usr/bin/env node
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";

// Get __dirname in ESM context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local BEFORE anything else
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const result = dotenv.config({ path: envPath });
  if (result.parsed) {
    console.log("✓ Loaded environment from .env.local");
  }
}

// Now dynamically import and run the server
const { default: startServer } = await import("./server.js");
startServer();
