const postgres = require("postgres");
const fs = require("fs");
const path = require("path");

// Load .env.local manually
const envPath = path.join(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    let val = match[2].trim().replace(/^["']|["']$/g, "");
    process.env[key] = val;
  }
}

async function migrate() {
  const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1 });

  // 1. Add image_data column if not exists
  console.log("Adding image_data column...");
  await sql`ALTER TABLE affirmations ADD COLUMN IF NOT EXISTS image_data TEXT`;
  console.log("Column added.");

  // 2. Get all distinct image_url values
  const rows = await sql`SELECT DISTINCT image_url FROM affirmations WHERE image_url IS NOT NULL AND image_url != ''`;
  console.log(`Found ${rows.length} distinct image paths.`);

  const imgDir = path.join(__dirname, "..", "public", "page-images");

  for (const row of rows) {
    const imgUrl = row.image_url;
    // Extract filename from path like "/page-images/IMG_0061.JPG.jpeg"
    const fileName = imgUrl.replace("/page-images/", "").replace("/page-images\\", "");
    const filePath = path.join(imgDir, fileName);

    if (!fs.existsSync(filePath)) {
      console.log(`  SKIP (not found): ${fileName}`);
      continue;
    }

    const ext = path.extname(fileName).toLowerCase().replace(".", "");
    const mime = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp" }[ext] || "image/jpeg";
    const fileData = fs.readFileSync(filePath);
    const base64 = fileData.toString("base64");
    const dataUri = `data:${mime};base64,${base64}`;

    // Update all affirmations that reference this image
    const result = await sql`UPDATE affirmations SET image_data = ${dataUri} WHERE image_url = ${imgUrl}`;
    console.log(`  OK: ${fileName} -> ${result.count} rows updated (${(fileData.length / 1024).toFixed(0)}KB)`);
  }

  console.log("Migration complete.");
  await sql.end();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
