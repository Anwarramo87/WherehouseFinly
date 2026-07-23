# Development startup script - Starts both backend and frontend

Write-Host "`n=== Starting Development Environment ===`n" -ForegroundColor Yellow

Write-Host "[1/2] Starting Backend (NestJS on port 5003)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '..\..\back\werehouse\backend-nest'; Write-Host 'Backend Starting...' -ForegroundColor Green; npm run start:dev"

Write-Host "Waiting 5 seconds for backend to initialize..." -ForegroundColor Gray
Start-Sleep -Seconds 5

Write-Host "[2/2] Starting Frontend (Next.js on port 3000)..." -ForegroundColor Cyan  
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; Write-Host 'Frontend Starting...' -ForegroundColor Cyan; npm run dev"

Write-Host "`n=== Services Starting ===`n" -ForegroundColor Yellow
Write-Host "Backend API:  http://localhost:5003" -ForegroundColor Green
Write-Host "Frontend App: http://localhost:3000" -ForegroundColor Cyan
Write-Host "`nCheck the new terminal windows for logs." -ForegroundColor Gray
Write-Host "`nPress any key to close this window..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
