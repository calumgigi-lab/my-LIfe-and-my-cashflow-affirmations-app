import * as dotenv from "dotenv";
import * as pathLib from "path";
import * as fs from "fs";
import pg from "pg";

const envLocalPath = pathLib.join(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
  console.log("✓ Loaded .env.local");
}

const { Pool } = pg;

async function clearConstraints() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "",
  });
  
  try {
    console.log("🗑️  Clearing monthly_purchases...");
    await pool.query("DELETE FROM monthly_purchases");
    console.log("✓ Cleared monthly_purchases");
    
    console.log("🗑️  Clearing affirmation_completions...");
    await pool.query("DELETE FROM affirmation_completions");
    console.log("✓ Cleared affirmation_completions");
    
    console.log("🗑️  Clearing affirmations...");
    await pool.query("DELETE FROM affirmations");
    console.log("✓ Cleared affirmations");
    
    console.log("🗑️  Clearing booklets...");
    await pool.query("DELETE FROM booklets");
    console.log("✓ Cleared booklets");
    
    console.log("✅ All tables cleared successfully!");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

clearConstraints();
