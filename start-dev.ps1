# Start Global Affirmation Hub for development
# This script starts both backend and Expo servers

Write-Host "🚀 Starting Global Affirmation Hub..." -ForegroundColor Green
Write-Host ""
Write-Host "📍 Machine IP: 172.20.10.2" -ForegroundColor Cyan
Write-Host "🔧 Backend: http://172.20.10.2:5000" -ForegroundColor Cyan
Write-Host "📱 Expo App: Scan QR code or visit device on same network" -ForegroundColor Cyan
Write-Host ""

# Set environment variables
$env:DATABASE_URL = "postgresql://neondb_owner:npg_Yiv1nsjbkMW3@ep-snowy-paper-a4bi13ul-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
$env:NODE_ENV = "development"

# Kill any existing Node processes on ports 5000 and 8081
Write-Host "🧹 Cleaning up old processes..." -ForegroundColor Yellow
Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | ForEach-Object { 
  Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
}
Get-NetTCPConnection -LocalPort 8081 -ErrorAction SilentlyContinue | ForEach-Object { 
  Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
}

Start-Sleep -Milliseconds 500

# Start backend server
Write-Host "▶️  Starting backend server on port 5000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList {
  cd 'c:\Users\MY COMPUTER\Downloads\Global-Affirmation-Hub-1\Global-Affirmation-Hub-1'
  $env:DATABASE_URL = "postgresql://neondb_owner:npg_Yiv1nsjbkMW3@ep-snowy-paper-a4bi13ul-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
  $env:NODE_ENV = "development"
  npx tsx server/index.ts
}

# Wait for backend
Write-Host "⏳ Waiting for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Start Expo
Write-Host "▶️  Starting Expo dev server on port 8081..." -ForegroundColor Yellow
Write-Host ""
cd 'c:\Users\MY COMPUTER\Downloads\Global-Affirmation-Hub-1\Global-Affirmation-Hub-1'
npx expo start --port 8081

Write-Host ""
Write-Host "✨ All services are running!" -ForegroundColor Green
Write-Host "On your phone: Open Expo Go → Scan QR code above" -ForegroundColor Cyan
