# BMSCE Smart Academic — Development Launcher
# Starts the Backend API, Frontend Vite Server, and Python Optimizer.

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  BMSCE Smart Academic Management & Timetable System" -ForegroundColor Cyan
Write-Host "  Launching Local Development Environment..." -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$root = Split-Path -Parent $PSScriptRoot

# 1. Start Python Optimizer
$optPath = Join-Path $root "apps\optimizer"
$uv = "C:\Users\Vansh Singh Rawat\.local\bin\uv.exe"
if (Test-Path $optPath) {
    Write-Host "[1/3] Starting Python Optimizer on http://localhost:8000..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$optPath'; & '$optPath\.venv\Scripts\uvicorn.exe' main:app --host 127.0.0.1 --port 8000"
}

# 2. Start API Server
Write-Host "[2/3] Starting Node.js API Server on http://localhost:3001..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root'; npx tsx apps/api/src/server.ts"

# 3. Start Frontend Web
Write-Host "[3/3] Starting Vite Frontend on http://localhost:5173..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root'; npm run dev --workspace=apps/web"

Write-Host ""
Write-Host "All services launching in dedicated terminal windows." -ForegroundColor Yellow
Write-Host "  Web UI:    http://localhost:5173" -ForegroundColor White
Write-Host "  API:       http://localhost:3001" -ForegroundColor White
Write-Host "  Optimizer: http://localhost:8000" -ForegroundColor White

