$projectDir = "C:\Users\Daniel\Downloads\mybestproject-main (9)\mybestproject-main"
$logFile = "$env:TEMP\socionet-status.txt"

Set-Location $projectDir

# Kill old processes
Get-Process -Name "node","cloudflared" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep 2

# Start backend
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = "node.exe"
$psi.Arguments = "server.cjs"
$psi.UseShellExecute = $true
$psi.WorkingDirectory = $projectDir
[System.Diagnostics.Process]::Start($psi) | Out-Null

Start-Sleep 3

# Start tunnel
$psi2 = New-Object System.Diagnostics.ProcessStartInfo
$psi2.FileName = "cloudflared.exe"
$psi2.Arguments = "tunnel --url http://localhost:4000 --no-autoupdate"
$psi2.UseShellExecute = $true
$psi2.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden
[System.Diagnostics.Process]::Start($psi2) | Out-Null

Start-Sleep 12

$tunnelUrl = "https://encouraged-fusion-whereas-images.trycloudflare.com"
$frontendUrl = "https://studio-6984102283-76014.web.app"

"SOCIONET IS LIVE!" | Out-File $logFile
"Frontend (permanent): $frontendUrl" | Out-File $logFile -Append
"Backend API: $tunnelUrl" | Out-File $logFile -Append
"Status: $(Get-Date)" | Out-File $logFile -Append

Write-Host "=================================="
Write-Host "SOCIONET IS LIVE!" -ForegroundColor Green
Write-Host "Frontend (PERMANENT): $frontendUrl" -ForegroundColor Cyan
Write-Host "=================================="
