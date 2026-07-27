# Development startup script - Starts both backend and frontend

Write-Host "`n=== Starting Development Environment ===`n" -ForegroundColor Yellow

# Check if .env.local exists
if (-not (Test-Path ".env.local")) {
    Write-Host "WARNING: .env.local file not found!" -ForegroundColor Red
    Write-Host "Creating .env.local with default configuration..." -ForegroundColor Yellow
    
    $envContent = @"
# Backend API base URL (include /api/v1)
NEXT_PUBLIC_API_URL=http://localhost:5003/api/v1

# Optional: Specify allowed CORS origins (comma-separated)
# CORS_ORIGIN=http://localhost:3000

# Optional: Custom auth cookie name
# NEXT_PUBLIC_AUTH_COOKIE_NAME=warehouse_access_token
"@
    
    Set-Content -Path ".env.local" -Value $envContent
    Write-Host ".env.local created successfully!`n" -ForegroundColor Green
}

Write-Host "[1/2] Starting Backend (NestJS on port 5003)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '..\..\back\werehouse\backend-nest'; Write-Host 'Backend Starting...' -ForegroundColor Green; npm run start:dev"

Write-Host "Waiting 5 seconds for backend to initialize..." -ForegroundColor Gray
Start-Sleep -Seconds 5

Write-Host "[2/2] Starting Frontend (Next.js on port 3000)..." -ForegroundColor Cyan  
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; Write-Host 'Frontend Starting...' -ForegroundColor Cyan; npm run dev"

Write-Host "`n=== Services Starting ===`n" -ForegroundColor Yellow
Write-Host "Backend API:  http://localhost:5003" -ForegroundColor Green
Write-Host "Frontend App: http://localhost:3000" -ForegroundColor Cyan
Write-Host "`nIMPORTANT: If you see 500 errors in the browser:" -ForegroundColor Red
Write-Host "1. Make sure .env.local exists (should be created automatically)" -ForegroundColor Yellow
Write-Host "2. Restart the frontend terminal (close and run start-both.ps1 again)" -ForegroundColor Yellow
Write-Host "3. Check that backend is running on port 5003" -ForegroundColor Yellow
Write-Host "`nCheck the new terminal windows for logs." -ForegroundColor Gray
Write-Host "`nPress any key to close this window..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
