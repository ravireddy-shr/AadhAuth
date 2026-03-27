# Aadhaar RTC System Startup Script
# Run from C:\Aadhar CSP directory
# Usage: powershell -ExecutionPolicy Bypass -File START_SYSTEM.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Aadhaar RTC Ticket Eligibility Verification System" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if MongoDB is running
Write-Host "[1/3] Checking MongoDB..." -ForegroundColor Yellow
$mongod = Get-Process mongod -ErrorAction SilentlyContinue
if ($mongod) {
    Write-Host "[OK] MongoDB is running (PID: $($mongod.Id))" -ForegroundColor Green
} else {
    Write-Host "[WARN] MongoDB is not running. Please start MongoDB first." -ForegroundColor Red
    Write-Host "   Command: mongod" -ForegroundColor Gray
}

Write-Host ""

# Start Backend
Write-Host "[2/3] Starting Backend (Flask on port 5000)..." -ForegroundColor Yellow
$backendPath = Join-Path $PSScriptRoot "backend"
$backendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; python app.py" -PassThru -WindowStyle Normal
Write-Host "[OK] Backend started (PID: $($backendProcess.Id))" -ForegroundColor Green

Start-Sleep -Seconds 3

# Start Frontend
Write-Host "[3/3] Starting Frontend (React on port 3000)..." -ForegroundColor Yellow
$frontendPath = Join-Path $PSScriptRoot "frontend"
$frontendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; npm.cmd start" -PassThru -WindowStyle Normal
Write-Host "[OK] Frontend started (PID: $($frontendProcess.Id))" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "[OK] System is starting!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Backend:  http://localhost:5000" -ForegroundColor Cyan
Write-Host "MongoDB:  mongodb://localhost:27017" -ForegroundColor Cyan
Write-Host ""
Write-Host "Keep the terminal windows open. Press Ctrl+C to stop." -ForegroundColor Yellow
Write-Host ""
Write-Host "Initial Setup (first time only):" -ForegroundColor Magenta
Write-Host "  1. Open http://localhost:3000 in browser" -ForegroundColor Gray
Write-Host "  2. Go to Conductor Login -> seed data first (optional)" -ForegroundColor Gray
Write-Host "  3. Use demo credentials:" -ForegroundColor Gray
Write-Host "     - Conductor: 999999999999 / cond1234" -ForegroundColor Gray
Write-Host "     - Government: 888888888888 / gov1234" -ForegroundColor Gray
