#!/usr/bin/env node
require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");
const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1 });

(async () => {
  const r = await sql`UPDATE users SET email_verified = TRUE WHERE email_verified = FALSE RETURNING id`;
  console.log("Marked verified:", r.length);
  await sql.end();
})().catch((e) => { console.error(e); process.exit(1); });
