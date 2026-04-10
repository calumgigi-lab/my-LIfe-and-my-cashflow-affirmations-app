import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../shared/schema";

let db: any = null;

export function getDb() {
  if (!db) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set");
    }

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    db = drizzle(pool, { schema });
  }

  return db;
}

export async function testConnection() {
  try {
    const db = getDb();
    // Simple test query
    const result = await db.query.users.findFirst();
    return true;
  } catch (error) {
    console.error("Database connection test failed:", error);
    throw error;
  }
}
