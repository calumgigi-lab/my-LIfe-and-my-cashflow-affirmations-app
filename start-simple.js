#!/usr/bin/env node

const { spawn } = require('child_process');

console.log('\n🚀 Starting Expo Dev Server...\n');

// Just start Expo with --clear to skip doctor checks
const expo = spawn('npx', ['expo', 'start', '--clear'], {
  stdio: 'inherit',
  cwd: process.cwd(),
  shell: true,
});

process.on('SIGINT', () => {
  console.log('\n\nShutting down...');
  expo.kill();
  process.exit(0);
});
