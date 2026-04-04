import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  // Connection pool configuration for reliability
  min: 2,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Error handling for pool
pool.on("error", (err) => {
  console.error("Unexpected error on idle client in pool:", err);
  // Keep the pool running, don't exit
});

pool.on("connect", () => {
  console.log("Database connection established");
});

pool.on("remove", () => {
  console.log("Database connection removed from pool");
});

export const db = drizzle(pool, { schema });
