const postgres = require("postgres");
const sql = postgres(process.env.DATABASE_URL, { ssl: "require" });
sql`DELETE FROM affirmations WHERE booklet_id = 297 AND day_number = 31`
  .then(() => { console.log("Deleted Day 31 from April 2026 booklet"); return sql.end(); })
  .catch(err => { console.error("Error:", err.message); process.exit(1); });
