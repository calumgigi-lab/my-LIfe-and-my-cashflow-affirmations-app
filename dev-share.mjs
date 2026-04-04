#!/usr/bin/env node

import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import * as net from "net";
import { spawn } from "child_process";

const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const result = dotenv.config({ path: envPath });
  if (result.parsed) {
    console.log("\n✓ Environment loaded from .env.local");
  }
}

const isWindows = process.platform === "win32";
const shellCmd = isWindows ? "cmd" : "sh";
const shellArgs = isWindows ? ["/c"] : ["-c"];

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isPortOpen(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => {
      resolve(false);
    });
    socket.connect(port, "127.0.0.1");
  });
}

async function checkBackendHealth() {
  try {
    const response = await fetch("http://localhost:5000/health", {
      method: "GET",
      timeout: 2000,
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForBackendReady(maxAttempts = 30) {
  let attempts = 0;
  while (attempts < maxAttempts) {
    const isHealthy = await checkBackendHealth();
    if (isHealthy) {
      console.log("✓ Backend is healthy and ready");
      return true;
    }
    attempts++;
    if (attempts < maxAttempts) {
      process.stdout.write(".");
      await wait(500);
    }
  }
  return false;
}

async function main() {
  // Check if tunnel mode is requested
  const useTunnelMode = process.env.EXPO_TUNNEL === "true" || process.argv.includes("--tunnel");
  
  if (useTunnelMode) {
    console.log("\n🚀 Starting Backend + Expo TUNNEL MODE");
    console.log("==============================================");
    console.log("✓ Backend: localhost:5000");
    console.log("✓ Expo: EXTERNAL Tunnel Mode (cross-network)");
    console.log("✓ Health checks: Enabled");
    console.log("==============================================\n");
  } else {
    console.log("\n🚀 Starting Backend + Expo Development Server");
    console.log("==============================================");
    console.log("✓ Backend: localhost:5000");
    console.log("✓ Expo: LAN mode");
    console.log("✓ Health checks: Enabled");
    console.log("==============================================\n");
  }

  const baseEnv = { ...process.env, NODE_ENV: "development" };
  const backendAlreadyRunning = await isPortOpen(5000);
  let backend = null;

  if (backendAlreadyRunning) {
    console.log("⏳ Checking existing backend health...");
    const isHealthy = await checkBackendHealth();
    if (isHealthy) {
      console.log("✓ Backend already running and healthy on port 5000");
    } else {
      console.warn("⚠️  Backend port in use but not responding. Please restart.");
      process.exit(1);
    }
  } else {
    console.log("⏳ Starting backend server...");
    backend = spawn(shellCmd, [...shellArgs, "npx tsx server/index.ts"], {
      stdio: "inherit",
      env: baseEnv,
    });

    // Wait for backend to be ready
    console.log("⏳ Waiting for backend initialization");
    const isReady = await waitForBackendReady();
    console.log("");

    if (!isReady) {
      console.error("\n✗ Backend failed to start or become healthy");
      if (backend) {
        backend.kill("SIGTERM");
      }
      process.exit(1);
    }
  }

  // Detect the machine's IP for LAN mode
  const os = await import("os");
  const getLocalIP = () => {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      const iface = interfaces[name];
      for (const addr of iface) {
        if (addr.family === "IPv4" && !addr.internal && !addr.address.startsWith("127.")) {
          return addr.address;
        }
      }
    }
    return "127.0.0.1";
  };

  const expoEnv = {
    ...baseEnv,
  };

  if (useTunnelMode) {
    // Tunnel mode: use tunnel for cross-network access
    expoEnv.EXPO_PUBLIC_API_URL = "http://localhost:5000";
    console.log("📡 Starting Expo in TUNNEL MODE (external access)...\n");
  } else {
    // LAN mode: use machine IP
    const machineIP = getLocalIP();
    expoEnv.EXPO_PUBLIC_API_URL = `http://${machineIP}:5000`;
    console.log(`📡 API URL for app: http://${machineIP}:5000`);
    console.log(`📡 Make sure device is on network: ${machineIP.split(".").slice(0, 3).join(".")}.x\n`);
  }

  const expoCmd = useTunnelMode 
    ? `npx expo start --tunnel --clear`
    : `npx expo start --clear`;

  const expo = spawn(shellCmd, [...shellArgs, expoCmd], {
    stdio: "inherit",
    env: expoEnv,
  });

  const shutdown = () => {
    console.log("\n\n⏹️  Shutting down...");
    if (backend) {
      backend.kill("SIGTERM");
    }
    expo.kill("SIGTERM");
    setTimeout(() => process.exit(0), 1500);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  expo.on("exit", () => shutdown());
}

main().catch((error) => {
  console.error("\n✗ Failed to start:", error.message);
  process.exit(1);
});

