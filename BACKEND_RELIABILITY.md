# Backend Reliability Enhancements

This document outlines the improvements made to ensure backend access is always available.

## Changes Made

### 1. **Health Check Endpoint** (`/health`)
- Added a lightweight health check endpoint on the backend
- Returns `{ status: "ok", timestamp: "..." }` when healthy
- Accessible at `http://localhost:5000/health`
- Used by the development server to verify backend readiness

### 2. **Enhanced dev-share.mjs Script**
The development startup script now includes:
- **Automatic backend verification**: Checks if backend is already running and healthy
- **Health check polling**: Waits up to 15 seconds for backend to become healthy before starting Expo
- **Better error messages**: Clear feedback on each startup step
- **Graceful failure**: Exits with helpful error if backend fails to start

**Start development with:**
```bash
npm run dev:share
```

### 3. **Improved Backend Server** (`server/index.ts`)
- Added proper error handling and graceful shutdown
- Server waits for database connection before declaring readiness
- Handles SIGTERM and SIGINT signals gracefully
- Logs all startup events for debugging

### 4. **Database Connection Pool** (`server/db.ts`)
Enhanced PostgreSQL connection pool with:
- **Min/Max connections**: 2-20 connections in the pool for stability
- **Timeout settings**: 10s connection timeout, 30s idle timeout
- **Error handlers**: Graceful handling of pool errors without crashing
- **Pool lifecycle logging**: Tracks when connections are established/removed

### 5. **CORS & API Configuration** (`server/app.ts`)
- Allows localhost connections for local development
- Supports Expo tunnel origins (`*.expo.dev`, `*.exp.direct`, `exp://`)
- Proper OPTIONS method handling for preflight requests

## How It Works

### Startup Flow
```
1. npm run dev:share
   ↓
2. Load environment from .env.local
   ↓
3. Check if backend port (5000) is in use
   ↓
4. If not running: Start backend with `npx tsx server/index.ts`
   ↓
5. Wait for backend to become healthy (polling /health endpoint)
   ↓
6. Once healthy: Start Expo with LAN mode
   ↓
7. Display QR code and Metro menu
```

### Health Monitoring
The development server monitors backend health through polling:
- Checks every 500ms
- Waits up to 15 seconds (30 attempts)
- Fails fast if backend cannot become healthy
- Provides clear error messages for debugging

## Troubleshooting

### Backend won't start
```bash
# 1. Check if database URL is set
echo $env:DATABASE_URL

# 2. Kill any existing processes on port 5000
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# 3. Try starting again
npm run dev:share
```

### Backend won't become healthy
```bash
# 1. Check backend logs for database connection errors
# 2. Verify .env.local has correct DATABASE_URL
# 3. Check database connectivity:
psql $env:DATABASE_URL -c "SELECT 1"

# 4. If database is unreachable, migrations may not have run:
npm run affirmations:seed
```

### Port 5000 already in use
```bash
# Kill the process using port 5000
$proc = Get-NetTCPConnection -LocalPort 5000 | Select-Object -ExpandProperty OwningProcess -Unique
Stop-Process -Id $proc -Force
```

## Manual Testing

### Test backend health
```bash
curl http://localhost:5000/health
# Response: { "status": "ok", "timestamp": "..." }
```

### Test API connection
```bash
curl http://localhost:5000/api/affirmations
# Should return affirmations data
```

### View backend logs
When running `npm run dev:share`, all backend output is displayed in the same terminal. Look for:
- `✓ Backend server ready on port 5000`
- `✓ Database connection initialized`
- API request logs with response times

## Architecture Benefits

1. **Reliability**: Connection pooling prevents connection exhaustion
2. **Performance**: Pool maintains idle connections for quick request handling
3. **Observability**: Health checks and logging provide visibility into service status
4. **Fail-fast**: Development startup fails immediately if backend isn't healthy
5. **Production-ready**: Configuration matches production best practices

## Notes

- The backend automatically initializes the database connection pool on startup
- Failed database queries are logged but don't crash the server
- The health endpoint is deliberately simple and fast (no database queries)
- All improvements maintain backward compatibility with existing code
