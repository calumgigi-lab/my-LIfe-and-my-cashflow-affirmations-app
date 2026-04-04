const { Client } = require("pg");
const dotenv = require("dotenv");

// Load .env.local
dotenv.config({ path: ".env.local" });

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log("Connected to database");

    // 1. Add missing columns to users table
    console.log("\n1️⃣ Adding missing columns to users table...");
    const userColumns = [
      'ALTER TABLE "users" ADD COLUMN "profile_picture_url" text',
      'ALTER TABLE "users" ADD COLUMN "is_admin" boolean DEFAULT false NOT NULL',
    ];

    for (const sql of userColumns) {
      try {
        await client.query(sql);
        console.log("✓ " + sql.split(" ADD COLUMN ")[1]);
      } catch (e) {
        if (e.message.includes("already exists")) {
          console.log(`⚠ Column already exists`);
        } else {
          throw e;
        }
      }
    }

    // 2. Add missing columns to monthly_purchases table
    console.log("\n2️⃣ Adding missing columns to monthly_purchases table...");
    const purchaseColumns = [
      'ALTER TABLE "monthly_purchases" ADD COLUMN "amount_naira" integer DEFAULT 0 NOT NULL',
      'ALTER TABLE "monthly_purchases" ADD COLUMN "status" varchar(20) DEFAULT \'pending\' NOT NULL',
      'ALTER TABLE "monthly_purchases" ADD COLUMN "approved_by" integer',
      'ALTER TABLE "monthly_purchases" ADD COLUMN "approved_at" timestamp',
    ];

    for (const sql of purchaseColumns) {
      try {
        await client.query(sql);
        console.log("✓ " + sql.split(" ADD COLUMN ")[1]);
      } catch (e) {
        if (e.message.includes("already exists")) {
          console.log(`⚠ Column already exists`);
        } else {
          throw e;
        }
      }
    }

    // 3. Create new tables that don't exist
    console.log("\n3️⃣ Creating new tables...");

    const adminSettingsSql = `
      CREATE TABLE IF NOT EXISTS "admin_settings" (
        "id" serial PRIMARY KEY NOT NULL,
        "key" text NOT NULL UNIQUE,
        "value" text NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `;
    await client.query(adminSettingsSql);
    console.log("✓ admin_settings table");

    const paymentAuditLogSql = `
      CREATE TABLE IF NOT EXISTS "payment_audit_log" (
        "id" serial PRIMARY KEY NOT NULL,
        "payment_id" integer NOT NULL,
        "user_id" integer NOT NULL,
        "action" text NOT NULL,
        "details" text,
        "created_at" timestamp DEFAULT now() NOT NULL
      )
    `;
    await client.query(paymentAuditLogSql);
    console.log("✓ payment_audit_log table");

    // 4. Add unique constraint on transaction_id if it doesn't exist
    console.log("\n4️⃣ Adding constraints...");
    try {
      await client.query(`
        ALTER TABLE "monthly_purchases" 
        ADD CONSTRAINT "monthly_purchases_transaction_id_unique" 
        UNIQUE("transaction_id")
      `);
      console.log("✓ transaction_id unique constraint");
    } catch (e) {
      if (e.message.includes("already exists")) {
        console.log("⚠ transaction_id unique constraint already exists");
      } else {
        throw e;
      }
    }

    // 5. Add foreign keys
    console.log("\n5️⃣ Adding foreign key constraints...");

    const fks = [
      {
        name: "monthly_purchases_user_id_fk",
        sql: 'ALTER TABLE "monthly_purchases" ADD CONSTRAINT "monthly_purchases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")',
      },
      {
        name: "monthly_purchases_booklet_id_fk",
        sql: 'ALTER TABLE "monthly_purchases" ADD CONSTRAINT "monthly_purchases_booklet_id_booklets_id_fk" FOREIGN KEY ("booklet_id") REFERENCES "public"."booklets"("id")',
      },
      {
        name: "monthly_purchases_approved_by_fk",
        sql: 'ALTER TABLE "monthly_purchases" ADD CONSTRAINT "monthly_purchases_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id")',
      },
      {
        name: "payment_audit_log_payment_id_fk",
        sql: 'ALTER TABLE "payment_audit_log" ADD CONSTRAINT "payment_audit_log_payment_id_monthly_purchases_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."monthly_purchases"("id")',
      },
      {
        name: "payment_audit_log_user_id_fk",
        sql: 'ALTER TABLE "payment_audit_log" ADD CONSTRAINT "payment_audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")',
      },
    ];

    for (const fk of fks) {
      try {
        await client.query(fk.sql);
        console.log("✓ " + fk.name);
      } catch (e) {
        if (
          e.message.includes("already exists") ||
          e.message.includes("duplicate key")
        ) {
          console.log(`⚠ ${fk.name} already exists`);
        } else {
          throw e;
        }
      }
    }

    console.log("\n✅ All migrations applied successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
