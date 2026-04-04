#!/usr/bin/env node

import localtunnel from 'localtunnel';
import { spawn } from 'child_process';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

async function main() {
  console.log('\n🚀 Setting up tunnels for cross-network access');
  console.log('==============================================\n');

  // Start backend and Expo
  console.log('⏳ Starting backend and Expo servers...\n');
  
  const childProcess = spawn('npm', ['run', 'dev:share'], {
    stdio: 'inherit',
    shell: true,
  });

  // Wait for servers to start
  await new Promise(resolve => setTimeout(resolve, 15000));

  // Create tunnel for backend
  console.log('\n📡 Creating localtunnel for backend (5000)...');
  try {
    const backendTunnel = await localtunnel({ 
      port: 5000,
      subdomain: 'affirmation-backend'
    });

    console.log(`✓ Backend tunnel: ${backendTunnel.url}`);
    console.log(`✓ Backend public URL: ${backendTunnel.url}\n`);

    backendTunnel.on('close', () => {
      console.log('Backend tunnel closed');
    });

    backendTunnel.on('error', (err) => {
      console.error('Backend tunnel error:', err);
    });

    // Create tunnel for Expo
    console.log('📡 Creating localtunnel for Expo (8081)...');
    const expoTunnel = await localtunnel({ 
      port: 8081,
      subdomain: 'affirmation-expo'
    });

    console.log(`✓ Expo tunnel: ${expoTunnel.url}`);
    console.log(`✓ Expo public URL: ${expoTunnel.url}\n`);

    expoTunnel.on('close', () => {
      console.log('Expo tunnel closed');
    });

    expoTunnel.on('error', (err) => {
      console.error('Expo tunnel error:', err);
    });

    console.log('\n✅ Cross-network setup complete!');
    console.log('================================================');
    console.log('📱 Share this Expo URL with friends (any network):');
    console.log(`   ${expoTunnel.url}`);
    console.log('\n📡 Backend API (for your friends devices):');
    console.log(`   ${backendTunnel.url}`);
    console.log('================================================\n');

    // Keep process alive
    process.on('SIGINT', () => {
      console.log('\n\nShutting down tunnels...');
      childProcess.kill();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Failed to create tunnels:', error.message);
    childProcess.kill();
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
