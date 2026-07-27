# Environment Check Script - Verify local development setup

Write-Host "`n=== Development Environment Check ===`n" -ForegroundColor Yellow

# Check if .env.local exists
if (Test-Path ".env.local") {
    Write-Host "[OK] .env.local file exists" -ForegroundColor Green
    $envContent = Get-Content ".env.local" -Raw
    if ($envContent -match "NEXT_PUBLIC_API_URL") {
        Write-Host "[OK] NEXT_PUBLIC_API_URL is configured" -ForegroundColor Green
        
        # Extract the URL
        if ($envContent -match "NEXT_PUBLIC_API_URL=(.+)") {
            $apiUrl = $matches[1].Trim()
            Write-Host "     API URL: $apiUrl" -ForegroundColor Gray
        }
    } else {
        Write-Host "[ERROR] NEXT_PUBLIC_API_URL not found in .env.local" -ForegroundColor Red
    }
} else {
    Write-Host "[ERROR] .env.local file not found" -ForegroundColor Red
    Write-Host "        Run start-both.ps1 to create it automatically" -ForegroundColor Yellow
}

Write-Host ""

# Check if backend port is open
$backendPort = 5003
try {
    $tcpClient = New-Object System.Net.Sockets.TcpClient
    $tcpClient.Connect("localhost", $backendPort)
    $tcpClient.Close()
    Write-Host "[OK] Backend is running on port $backendPort" -ForegroundColor Green
} catch {
    Write-Host "[WARN] Backend not running on port $backendPort" -ForegroundColor Yellow
    Write-Host "       Start it with: cd ..\..\back\werehouse\backend-nest && npm run start:dev" -ForegroundColor Gray
}

Write-Host ""

# Check if frontend port is open
$frontendPort = 3000
try {
    $tcpClient = New-Object System.Net.Sockets.TcpClient
    $tcpClient.Connect("localhost", $frontendPort)
    $tcpClient.Close()
    Write-Host "[OK] Frontend is running on port $frontendPort" -ForegroundColor Green
} catch {
    Write-Host "[WARN] Frontend not running on port $frontendPort" -ForegroundColor Yellow
    Write-Host "       Start it with: npm run dev" -ForegroundColor Gray
}

Write-Host ""

# Check node_modules
if (Test-Path "node_modules") {
    Write-Host "[OK] node_modules folder exists" -ForegroundColor Green
} else {
    Write-Host "[ERROR] node_modules not found - run 'npm install' first" -ForegroundColor Red
}

Write-Host "`n=== Check Complete ===`n" -ForegroundColor Yellow
Write-Host "If everything is OK, open http://localhost:3000 in your browser" -ForegroundColor Cyan
Write-Host "`nPress any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
