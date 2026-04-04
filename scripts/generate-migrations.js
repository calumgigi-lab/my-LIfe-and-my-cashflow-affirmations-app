// Load env and run drizzle-kit generate
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const envPath = path.join(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

console.log('Generated database URL:', process.env.DATABASE_URL ? '***' : 'NOT SET');

// Now run drizzle-kit generate
try {
  execSync('npx drizzle-kit generate --config drizzle.config.ts', {
    stdio: 'inherit',
    cwd: process.cwd(),
  });
} catch (err) {
  console.error('Error running drizzle-kit generate:', err);
  process.exit(1);
}
