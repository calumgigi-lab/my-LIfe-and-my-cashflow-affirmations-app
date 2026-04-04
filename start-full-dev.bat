@echo off
echo.
echo [*] Loading environment from .env.local...
echo.

REM Parse .env.local and set environment variables
for /f "tokens=1,2 delims==" %%A in ('findstr /R "^[A-Za-z_]" .env.local') do (
    set "%%A=%%B"
)

echo [*] Starting backend server and Expo frontend...
echo [*] Backend: http://localhost:5000
echo [*] Frontend: Expo dev server
echo.

REM Run concurrently
npx concurrently "npx tsx server/index.ts" "npx expo start"

REM Uncomment below to prevent window from closing
REM pause

