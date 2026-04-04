import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// Load environment variables FIRST
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const result = dotenv.config({ path: envPath });
  if (!result.error) {
    console.log("✓ Environment loaded from .env.local");
  }
}

// Now import and run the actual server
import("./index.js");
