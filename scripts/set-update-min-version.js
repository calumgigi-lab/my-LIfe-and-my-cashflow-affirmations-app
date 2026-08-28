require("dotenv").config({ path: ".env.local" });
const postgres = require("postgres");
const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1 });
(async () => {
  await sql`
    INSERT INTO admin_settings (key, value) VALUES ('update_min_version_code', '14')
    ON CONFLICT (key) DO UPDATE SET value = '14'
  `;
  console.log("Set update_min_version_code=14");
  await sql.end();
})().catch((e) => { console.error(e); process.exit(1); });
