#!/usr/bin/env node
// Setup script to load .env and run database operations

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local
const envPath = path.join(__dirname, '..', '.env');
const envLocalPath = path.join(__dirname, '..', '.env.local');

try {
  // Load .env.local first (highest priority)
  if (fs.existsSync(envLocalPath)) {
    const envLocal = fs.readFileSync(envLocalPath, 'utf-8');
    envLocal.split('\n').forEach(line => {
      if (line.trim() && !line.startsWith('#')) {
        const [key, ...rest] = line.split('=');
        const value = rest.join('=').trim();
        if (key) process.env[key.trim()] = value;
      }
    });
    console.log('✅ Loaded .env.local');
  }

  // Verify DATABASE_URL
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not found in .env.local');
  }

  console.log('🌐 Using database:', process.env.DATABASE_URL.split('@')[1]?.split('/')[0] || 'unknown host');
  
  // Now run the seed
  console.log('\n📊 Starting database seed...\n');
  
  const seedProcess = execSync('npx tsx server/seed-new.ts', {
    cwd: path.join(__dirname, '..'),
    env: process.env,
    stdio: 'inherit'
  });

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
