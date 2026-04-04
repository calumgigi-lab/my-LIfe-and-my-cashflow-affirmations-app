#!/usr/bin/env node

import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import { spawn } from "child_process";

// Load environment from .env.local
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const result = dotenv.config({ path: envPath });
  if (result.parsed) {
    console.log("\n✓ Environment loaded from .env.local");
  }
}

console.log("\n🚀 Starting Development Environment");
console.log("=====================================");
 
function getLocalIPv4() {
  const interfaces = os.networkInterfaces();

  for (const iface of Object.values(interfaces)) {
    if (!iface) continue;
    for (const address of iface) {
      if (address.family === "IPv4" && !address.internal) {
        return address.address;
      }
    }
  }

  return null;
}

// Determine the command based on OS
const isWindows = process.platform === "win32";
const shellCmd = isWindows ? "cmd" : "sh";
const shellArgs = isWindows ? ["/c"] : ["-c"];

// Check if tunnel mode is requested
const useTunnel = process.env.EXPO_TUNNEL === "true" || process.argv.includes("--tunnel");
const useCfTunnel = process.env.EXPO_CF_TUNNEL === "true" || process.argv.includes("--cf-tunnel");
const expoHostMode = useTunnel || useCfTunnel ? "localhost" : (process.env.EXPO_DEV_HOST || "lan");

// Start both processes
const localIp = getLocalIPv4();
const defaultApiDomain = localIp ? `${localIp}:5000` : "localhost:5000";
const apiDomain = process.env.EXPO_PUBLIC_DOMAIN || defaultApiDomain;
const explicitApiUrl = process.env.EXPO_PUBLIC_API_URL;
const useRemoteApi = Boolean(explicitApiUrl);

const env = {
  ...process.env,
  NODE_ENV: "development",
  EXPO_PUBLIC_DOMAIN: apiDomain,
};

if (useRemoteApi) {
  console.log(`✓ Backend API URL: ${explicitApiUrl}`);
} else {
  console.log(`✓ Backend API domain: ${apiDomain}`);
}

if (useTunnel) {
  console.log(`✓ Frontend: Expo ngrok tunnel (cross-network sharing enabled)`);
} else if (useCfTunnel) {
  console.log(`✓ Frontend: Cloudflare tunnel (cross-network sharing enabled)`);
} else {
  console.log(`✓ Frontend: Expo dev server (${expoHostMode} mode)`);
}
console.log("=====================================\n");

const backend = useRemoteApi
  ? null
  : spawn(shellCmd, [...shellArgs, "tsx server/index.ts"], {
      stdio: "inherit",
      env,
    });

const expoPort = process.env.EXPO_PORT || 8081;
const expoCommand = useTunnel 
  ? `npx expo start --tunnel --clear`
  : `npx expo start --host localhost --port ${expoPort}`;

const frontend = spawn(shellCmd, [...shellArgs, expoCommand], {
  stdio: "inherit",
  env,
});

// Start Cloudflare tunnel if requested
let cloudflare = null;
if (useCfTunnel) {
  // Wait a moment for localhost:8081 to be ready
  setTimeout(() => {
    console.log("\n📡 Starting localtunnel for localhost:8081...\n");
    cloudflare = spawn(shellCmd, [...shellArgs, "npx localtunnel --port 8081"], {
      stdio: "inherit",
    });
  }, 3000);
}

// Handle cleanup on exit
process.on("SIGINT", () => {
  console.log("\n\nShutting down...");
  if (backend) {
    backend.kill("SIGTERM");
  }
  frontend.kill("SIGTERM");
  if (cloudflare) {
    cloudflare.kill("SIGTERM");
  }
  setTimeout(() => process.exit(0), 1000);
});

