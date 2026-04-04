#!/usr/bin/env bash
# Start affirmations app with all services

echo "🚀 Starting Global Affirmation Hub..."
echo ""
echo "📍 Local IP: 172.20.10.2"
echo "🔧 Backend: http://172.20.10.2:5000"
echo "📱 Expo: http://172.20.10.2:8081"
echo ""

# Set environment variables
export DATABASE_URL="postgresql://neondb_owner:npg_Yiv1nsjbkMW3@ep-snowy-paper-a4bi13ul-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
export NODE_ENV="development"

# Start backend in background (if not already running)
if ! lsof -i :5000 > /dev/null; then
  echo "▶️  Starting backend server on port 5000..."
  npx tsx server/index.ts &
fi

# Wait for backend to be ready
echo "⏳ Waiting for backend..."
sleep 3

# Start Expo
echo "▶️  Starting Expo dev server on port 8081..."
npx expo start --port 8081

echo ""
echo "✨ Done! Devices on the same network can now access the app"
