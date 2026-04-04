// Load env and run drizzle-kit push
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const envPath = path.join(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

console.log('Pushing migrations with DATABASE_URL:', process.env.DATABASE_URL ? '***' : 'NOT SET');

// Now run drizzle-kit push
try {
  execSync('npx drizzle-kit push --config drizzle.config.ts', {
    stdio: 'inherit',
    cwd: process.cwd(),
  });
} catch (err) {
  console.error('Error running drizzle-kit push:', err);
  process.exit(1);
}
