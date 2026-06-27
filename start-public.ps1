# SOCIONET — Public Cloudflare Tunnel Launcher
# Builds frontend, starts backend + public server, then creates tunnel

$ErrorActionPreference = "Stop"
$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontendDir = Join-Path $projectDir "src\frontend"

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     SOCIONET — Public Cloudflare Tunnel Setup       ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Step 1: Build frontend
Write-Host "📦 Building frontend for production..." -ForegroundColor Yellow
Set-Location $frontendDir
$env:VITE_USE_MOCK = "true"
$env:VITE_API_URL = "/api"
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "❌ Build failed!" -ForegroundColor Red; exit 1 }
Set-Location $projectDir
Write-Host "✅ Frontend built!" -ForegroundColor Green
Write-Host ""

# Step 2: Start backend API server (port 4000) in background
Write-Host "🗄️  Starting backend API server on port 4000..." -ForegroundColor Yellow
$backendJob = Start-Job -ScriptBlock {
    Set-Location $using:projectDir
    node server.cjs
}
Start-Sleep -Seconds 2

# Step 3: Start public frontend server (port 3000)
Write-Host "🌐 Starting public frontend server on port 3000..." -ForegroundColor Yellow
$frontendJob = Start-Job -ScriptBlock {
    Set-Location $using:projectDir
    node serve-public.cjs
}
Start-Sleep -Seconds 2

# Step 4: Start Cloudflare Tunnel
Write-Host ""
Write-Host "🚇 Starting Cloudflare Tunnel..." -ForegroundColor Cyan
Write-Host "   Look for a URL like: https://xxxx-xxxx.trycloudflare.com" -ForegroundColor Green
Write-Host ""
cloudflared tunnel --url http://localhost:3000 --no-autoupdate
