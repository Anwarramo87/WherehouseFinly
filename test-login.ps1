$body = @{
    username = "superadmin@warehouse.local"
    password = "SuperAdmin@2026!"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:5001/api/v1/auth/login" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 10
    Write-Host "SUCCESS:"
    $response | ConvertTo-Json
} catch {
    Write-Host "ERROR: $($_.Exception.Message)"
    Write-Host "Status: $($_.Exception.Response.StatusCode)"
}