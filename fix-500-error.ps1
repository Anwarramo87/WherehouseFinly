# Fix 500 Error - Complete Automated Solution

Write-Host "`n╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Fix 500 Error - Automated Script    ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝`n" -ForegroundColor Cyan

$ErrorActionPreference = "SilentlyContinue"

# Step 1: Stop all running services
Write-Host "[Step 1/6] Stopping existing services..." -ForegroundColor Yellow

$ports = @(3000, 5003)
foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connections) {
        $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($pid in $pids) {
            try {
                Stop-Process -Id $pid -Force
                Write-Host "  [OK] Stopped process on port $port" -ForegroundColor Green
            } catch {
                Write-Host "  [WARN] Could not stop process $pid" -ForegroundColor Yellow
            }
        }
    }
}
Start-Sleep -Seconds 2

# Step 2: Check/Create .env.local
Write-Host "`n[Step 2/6] Checking .env.local..." -ForegroundColor Yellow

$envContent = @"
# Backend API base URL (include /api/v1)
NEXT_PUBLIC_API_URL=http://localhost:5003/api/v1

# Optional: Specify allowed CORS origins (comma-separated)
# CORS_ORIGIN=http://localhost:3000

# Optional: Custom auth cookie name
# NEXT_PUBLIC_AUTH_COOKIE_NAME=warehouse_access_token
"@

if (Test-Path ".env.local") {
    $existing = Get-Content ".env.local" -Raw
    if ($existing -match "NEXT_PUBLIC_API_URL") {
        Write-Host "  [OK] .env.local exists and configured" -ForegroundColor Green
    } else {
        Write-Host "  [WARN] .env.local exists but missing NEXT_PUBLIC_API_URL" -ForegroundColor Yellow
        Set-Content -Path ".env.local" -Value $envContent
        Write-Host "  [OK] .env.local updated" -ForegroundColor Green
    }
} else {
    Set-Content -Path ".env.local" -Value $envContent
    Write-Host "  [OK] .env.local created" -ForegroundColor Green
}

# Step 3: Clean Next.js cache
Write-Host "`n[Step 3/6] Cleaning Next.js cache..." -ForegroundColor Yellow

if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next"
    Write-Host "  [OK] .next folder deleted" -ForegroundColor Green
} else {
    Write-Host "  [OK] .next folder not found (already clean)" -ForegroundColor Green
}

# Step 4: Check Backend directory
Write-Host "`n[Step 4/6] Checking backend..." -ForegroundColor Yellow

$backendPath = "..\..\back\werehouse\backend-nest"
if (Test-Path $backendPath) {
    Write-Host "  [OK] Backend directory found" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] Backend directory not found at $backendPath" -ForegroundColor Red
    Write-Host "  Please check the path" -ForegroundColor Yellow
}

# Step 5: Start Backend
Write-Host "`n[Step 5/6] Starting Backend..." -ForegroundColor Yellow

if (Test-Path $backendPath) {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
cd '$PSScriptRoot\$backendPath'
Write-Host '╔════════════════════════════════════════╗' -ForegroundColor Green
Write-Host '║        Backend Server (NestJS)         ║' -ForegroundColor Green
Write-Host '║        Port: 5003                       ║' -ForegroundColor Green
Write-Host '╚════════════════════════════════════════╝' -ForegroundColor Green
Write-Host ''
npm run start:dev
"@
    Write-Host "  [OK] Backend starting..." -ForegroundColor Green
    Write-Host "  Waiting 8 seconds for backend to initialize..." -ForegroundColor Gray
    Start-Sleep -Seconds 8
} else {
    Write-Host "  [SKIP] Backend directory not found, skipping..." -ForegroundColor Yellow
}

# Step 6: Start Frontend
Write-Host "`n[Step 6/6] Starting Frontend..." -ForegroundColor Yellow

Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
cd '$PSScriptRoot'
Write-Host '╔════════════════════════════════════════╗' -ForegroundColor Cyan
Write-Host '║       Frontend Server (Next.js)        ║' -ForegroundColor Cyan
Write-Host '║        Port: 3000                       ║' -ForegroundColor Cyan
Write-Host '╚════════════════════════════════════════╝' -ForegroundColor Cyan
Write-Host ''
Write-Host 'Loading environment variables from .env.local...' -ForegroundColor Gray
Write-Host ''
npm run dev
"@

Write-Host "  [OK] Frontend starting..." -ForegroundColor Green

# Summary
Write-Host "`n╔════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║          Setup Complete! ✓             ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════╝`n" -ForegroundColor Green

Write-Host "Services are starting in new terminal windows:" -ForegroundColor White
Write-Host "  → Backend:  http://localhost:5003" -ForegroundColor Green
Write-Host "  → Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "To verify everything is working:" -ForegroundColor Yellow
Write-Host "  1. Wait 10 seconds for services to start" -ForegroundColor Gray
Write-Host "  2. Open: http://localhost:3000" -ForegroundColor Gray
Write-Host "  3. Check: http://localhost:3000/api/debug" -ForegroundColor Gray
Write-Host ""
Write-Host "If you still see 500 errors:" -ForegroundColor Red
Write-Host "  → Read: TROUBLESHOOTING-500-AR.md" -ForegroundColor Yellow
Write-Host ""
Write-Host "Launching browser in 5 seconds..." -ForegroundColor Gray
Start-Sleep -Seconds 5

Start-Process "http://localhost:3000"
Start-Sleep -Seconds 2
Start-Process "http://localhost:3000/api/debug"

Write-Host ""
Write-Host "Press any key to close this window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
