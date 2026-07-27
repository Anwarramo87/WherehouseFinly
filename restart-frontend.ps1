# Restart Frontend Script - Kills running dev server and starts fresh

Write-Host "`n=== Restarting Frontend ===`n" -ForegroundColor Yellow

# Kill any running Node processes on port 3000
Write-Host "Checking for processes on port 3000..." -ForegroundColor Gray
$port = 3000
$processes = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | 
             Select-Object -ExpandProperty OwningProcess -Unique

if ($processes) {
    foreach ($pid in $processes) {
        try {
            Write-Host "Stopping process $pid on port $port..." -ForegroundColor Yellow
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            Write-Host "[OK] Process stopped" -ForegroundColor Green
        } catch {
            Write-Host "[WARN] Could not stop process $pid" -ForegroundColor Yellow
        }
    }
    Start-Sleep -Seconds 2
} else {
    Write-Host "[OK] No process running on port $port" -ForegroundColor Green
}

# Verify .env.local exists
if (-not (Test-Path ".env.local")) {
    Write-Host "[ERROR] .env.local not found!" -ForegroundColor Red
    Write-Host "Creating it now..." -ForegroundColor Yellow
    
    $envContent = @"
# Backend API base URL (include /api/v1)
NEXT_PUBLIC_API_URL=http://localhost:5003/api/v1

# Optional: Specify allowed CORS origins (comma-separated)
# CORS_ORIGIN=http://localhost:3000

# Optional: Custom auth cookie name
# NEXT_PUBLIC_AUTH_COOKIE_NAME=warehouse_access_token
"@
    
    Set-Content -Path ".env.local" -Value $envContent
    Write-Host "[OK] .env.local created" -ForegroundColor Green
} else {
    Write-Host "[OK] .env.local exists" -ForegroundColor Green
}

Write-Host ""
Write-Host "Starting fresh Next.js dev server..." -ForegroundColor Cyan
Write-Host "This will open in a NEW terminal window." -ForegroundColor Gray
Write-Host ""

# Start new dev server in new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; Write-Host 'Frontend Starting with fresh environment...' -ForegroundColor Cyan; npm run dev"

Write-Host "[OK] Frontend server starting..." -ForegroundColor Green
Write-Host ""
Write-Host "Open http://localhost:3000 in your browser" -ForegroundColor Cyan
Write-Host "Check the new terminal window for logs" -ForegroundColor Gray
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
