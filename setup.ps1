param(
    [switch]$DevOnly,
    [switch]$SkipDeploy
)

$ErrorActionPreference = 'Stop'
$Root = $PSScriptRoot
$EnvJsonPath = Join-Path $Root 'src\frontend\env.json'
$LocalHost = 'http://localhost:8081'
$StorageGatewayUrl = 'http://localhost:6188'
$IIUrl = 'http://rdmx6-jaaaa-aaaaa-aaadq-cai.localhost:8081'

function Write-EnvJson {
    param([string]$CanisterId)
    $obj = [ordered]@{
        backend_host = $LocalHost
        backend_canister_id = $CanisterId
        project_id = 'undefined'
        ii_derivation_origin = 'undefined'
        storage_gateway_url = $StorageGatewayUrl
    }
    $obj | ConvertTo-Json -Depth 2 | Set-Content -Path $EnvJsonPath -Encoding UTF8
    Write-Host "Written env.json: $CanisterId" -ForegroundColor Green
}

Write-Host 'SOCIONET Local Dev Setup' -ForegroundColor Cyan

if (-not $DevOnly -and -not $SkipDeploy) {

    Write-Host 'Starting ICP local network...' -ForegroundColor Yellow
    try { icp network start -d } catch { Write-Host 'Network may already be running.' -ForegroundColor Yellow }

    Write-Host 'Creating canisters...' -ForegroundColor Yellow
    try { icp canister create --environment local frontend } catch { Write-Host 'frontend may exist.' -ForegroundColor Yellow }
    try { icp canister create --environment local backend } catch { Write-Host 'backend may exist.' -ForegroundColor Yellow }

    Write-Host 'Getting backend canister ID...' -ForegroundColor Yellow
    $CanisterInfo = icp canister settings show --environment local backend
    $BackendCanisterId = $CanisterInfo | Select-String "Canister ID:" | ForEach-Object { $_.Line -replace '.*:\s*', '' }
    if (-not $BackendCanisterId) {
        Write-Host 'ERROR: Could not get backend canister ID.' -ForegroundColor Red
        exit 1
    }

    Write-EnvJson -CanisterId $BackendCanisterId

    Write-Host 'Deploying canisters...' -ForegroundColor Yellow
    $env:BACKEND_CANISTER_ID = $BackendCanisterId
    $env:STORAGE_GATEWAY_URL = $StorageGatewayUrl
    $env:II_URL = $IIUrl
    icp deploy --environment local backend frontend
}

Write-Host 'Starting Vite dev server at http://localhost:5173' -ForegroundColor Cyan

$env:DFX_NETWORK = 'local'
$env:STORAGE_GATEWAY_URL = $StorageGatewayUrl
$env:II_URL = $IIUrl

npm run dev --prefix src/frontend
