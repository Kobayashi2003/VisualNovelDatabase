# ============================================================================
# One-shot bootstrap for the backend's pixi environment.
#
# Run this once after cloning, and again whenever pixi.toml or pixi.lock
# changes. After that, `pixi run dev` / `pixi run prod` (or start-prod.ps1)
# reuse the cached env without re-resolving.
#
# Usage:
#   .\scripts\pixi-setup.ps1     (or from scripts/: .\pixi-setup.ps1)
# ============================================================================

[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

if (-not (Get-Command pixi -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] pixi is not on PATH." -ForegroundColor Red
    Write-Host "        Install it via scoop:  scoop install pixi" -ForegroundColor Red
    Write-Host "        Or see:                https://pixi.sh"   -ForegroundColor Red
    exit 1
}

# pixi.toml lives in the backend root, one level up from this scripts/ folder.
$backendRoot = Split-Path $PSScriptRoot -Parent
Push-Location $backendRoot
try {
    Write-Host "[PIXI] Resolving and installing backend environment from pixi.toml ..." -ForegroundColor Cyan
    pixi install
    if ($LASTEXITCODE -ne 0) { throw "pixi install failed (exit $LASTEXITCODE)" }

    Write-Host ""
    Write-Host "[PIXI] Done. The env lives under backend/.pixi/envs/default/." -ForegroundColor Green
    Write-Host "       Next steps:" -ForegroundColor Green
    Write-Host "         pixi run dev        # Flask dev server"        -ForegroundColor Green
    Write-Host "         pixi run prod       # Production launcher"     -ForegroundColor Green
    Write-Host "         ..\..\start-prod.ps1   # Full prod (Caddy + Next)" -ForegroundColor Green
} finally {
    Pop-Location
}
