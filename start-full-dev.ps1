# Load environment variables from .env.local
if (Test-Path ".env.local") {
    Write-Host "Loading environment variables from .env.local..." -ForegroundColor Green
    
    $envVars = Get-Content .env.local | Where-Object { $_ -notmatch '^\s*#' -and $_ -match '=' }
    
    foreach ($line in $envVars) {
        if ($line -match '^([^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            
            # Remove quotes if present
            if ($value -match '^"(.*)"$') {
                $value = $matches[1]
            }
            
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
            if ($name -eq "DATABASE_URL") {
                Write-Host "✓ DATABASE_URL loaded" -ForegroundColor Cyan
            }
        }
    }
}

Write-Host "Starting both backend server and Expo frontend..." -ForegroundColor Green
Write-Host "Backend: http://localhost:5000" -ForegroundColor Cyan
Write-Host "Frontend: Expo dev server" -ForegroundColor Cyan
Write-Host ""

npm run dev
