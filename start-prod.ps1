# ============================================================================
# Production launcher.
#
# Boots two child processes and forwards Ctrl+C to both:
#   1. backend/prod.py — launched via `pixi run prod` so it runs inside the
#      reproducible pixi env (Python 3.13 + postgresql + psycopg2 + all PyPI
#      deps). Run backend/setup.ps1 once to materialize the env.
#      Spawns: Postgres + Redis + 3 Waitress backends + 2 Celery workers + Caddy
#   2. Next.js standalone — node frontend/.next/standalone/server.js
#
# Caddy is the only public ingress; frp should forward to CADDY_BIND
# (default :30709, set in backend/.env). All four paths live behind it:
#   /            -> Next.js (NextPort, default 5003)
#   /vndb/*      -> Flask vndb
#   /imgserve/*  -> Flask imgserve
#   /userserve/* -> Flask userserve
#
# Usage:
#   .\start-prod.ps1                # start with whatever is already built
#   .\start-prod.ps1 -Build         # `npm run build` first, then start
#   .\start-prod.ps1 -NextPort 5004 # override the Next.js port
# ============================================================================

[CmdletBinding()]
param(
    [switch]$Build,
    [int]$NextPort = 5003
)

$ErrorActionPreference = 'Stop'

$root             = $PSScriptRoot
$backendDir       = Join-Path $root 'backend'
$frontendDir      = Join-Path $root 'frontend'
$standaloneRoot   = Join-Path $frontendDir '.next\standalone'
$standaloneServer = Join-Path $standaloneRoot 'server.js'

# Pixi is required — we launch the backend through `pixi run` so it uses
# the env declared in backend/pixi.toml rather than whatever `python` on
# PATH happens to be. The env is materialized by backend/setup.ps1.
if (-not (Get-Command pixi -ErrorAction SilentlyContinue)) {
    throw "pixi is not on PATH. Install it (scoop install pixi) and run backend\setup.ps1 once before start-prod.ps1."
}
if (-not (Test-Path (Join-Path $backendDir '.pixi'))) {
    Write-Host "[WARN] backend\.pixi not found — running backend\setup.ps1 to install the env." -ForegroundColor Yellow
    & (Join-Path $backendDir 'setup.ps1')
    if ($LASTEXITCODE -ne 0) { throw "backend\setup.ps1 failed (exit $LASTEXITCODE)" }
}

# ---------- optional build step ---------------------------------------------
if ($Build) {
    Write-Host "[BUILD] Running npm run build in frontend/" -ForegroundColor Cyan
    Push-Location $frontendDir
    try {
        npm run build
        if ($LASTEXITCODE -ne 0) { throw "npm run build failed (exit $LASTEXITCODE)" }
    } finally {
        Pop-Location
    }
}

if (-not (Test-Path $standaloneServer)) {
    throw "Standalone build not found at $standaloneServer. Run with -Build first."
}

# ---------- mirror static + public into the standalone tree -----------------
# Next.js standalone emits a self-contained server.js but does NOT copy the
# static asset folders. Without this sync, browser requests for
# /_next/static/* return 404 and the SPA shows "This page couldn't load".
#
# Runs every launch (not just with -Build) so a manual `npm run build`
# outside this script — or any rebuild that changes chunk filenames — is
# always reflected in the standalone tree. The destination folders are
# wiped first so old chunk filenames don't linger and shadow fresh ones.
$srcStatic = Join-Path $frontendDir '.next\static'
if (-not (Test-Path $srcStatic)) {
    throw "Source .next/static not found at $srcStatic. Run with -Build first."
}
Write-Host "[SYNC] Mirroring .next/static and public into standalone tree" -ForegroundColor Cyan

$destStatic = Join-Path $standaloneRoot '.next\static'
if (Test-Path $destStatic) { Remove-Item -Recurse -Force $destStatic }
Copy-Item -Recurse -Force $srcStatic $destStatic

$srcPublic  = Join-Path $frontendDir 'public'
$destPublic = Join-Path $standaloneRoot 'public'
if (Test-Path $destPublic) { Remove-Item -Recurse -Force $destPublic }
if (Test-Path $srcPublic) {
    Copy-Item -Recurse -Force $srcPublic $destPublic
}

# ---------- launch children -------------------------------------------------
# Use Start-Process so we get a proper Process object back and can Wait/Stop
# them individually. Both children inherit the console, so their stdout
# interleaves into this terminal — same UX as run.py.

Write-Host "[START] backend/prod.py via pixi (Caddy will proxy / to :$NextPort)" -ForegroundColor Green
# `pixi run prod -- --next-port N` -> `python prod.py --next-port N` inside
# the pixi env. The `--` separator keeps pixi from claiming `--next-port`
# as one of its own flags.
$backend = Start-Process `
    -FilePath 'pixi' `
    -ArgumentList @('run', 'prod', '--', '--next-port', $NextPort) `
    -WorkingDirectory $backendDir `
    -NoNewWindow `
    -PassThru

Write-Host "[START] Next.js standalone on :$NextPort" -ForegroundColor Green
$nextEnv = @{ PORT = "$NextPort"; HOSTNAME = '127.0.0.1' }
# Start-Process doesn't take an env hashtable, so set process-scoped env
# vars before launching and unset after — server.js reads PORT/HOSTNAME at
# startup.
$prevPort = $env:PORT; $prevHost = $env:HOSTNAME
$env:PORT = "$NextPort"; $env:HOSTNAME = '127.0.0.1'
try {
    $frontend = Start-Process `
        -FilePath 'node' `
        -ArgumentList @($standaloneServer) `
        -WorkingDirectory (Split-Path $standaloneServer) `
        -NoNewWindow `
        -PassThru
} finally {
    $env:PORT = $prevPort; $env:HOSTNAME = $prevHost
}

# ---------- shutdown handling -----------------------------------------------
$children = @($backend, $frontend)

function Stop-Children {
    # The graceful path is Ctrl+C in the terminal: Windows fans a CTRL_C_EVENT
    # out to the whole console process group (this script, prod.py, node, and
    # all of their grandchildren), and prod.py's signal_handler tears down
    # Redis/Celery/Flask/Caddy in order. This function is the *backstop* for
    # the case where Ctrl+C didn't reach the children — e.g. the script was
    # killed externally. taskkill /T walks the whole process tree so grand-
    # children aren't orphaned; Stop-Process is per-process and would leak.
    foreach ($p in $children) {
        if ($p -and -not $p.HasExited) {
            try {
                Start-Process -FilePath 'taskkill' -ArgumentList @('/F', '/T', '/PID', $p.Id) `
                    -NoNewWindow -Wait -ErrorAction SilentlyContinue | Out-Null
            } catch {}
        }
    }
}

# Trap Ctrl+C inside the polling loop so we can clean up both children
# before exiting. Without this, Ctrl+C kills the ps1 but leaves the
# grandchild Python/Node procs orphaned.
try {
    while ($true) {
        Start-Sleep -Seconds 1
        if ($backend.HasExited) {
            Write-Host "[EXIT] backend/prod.py exited with $($backend.ExitCode); stopping frontend" -ForegroundColor Yellow
            break
        }
        if ($frontend.HasExited) {
            Write-Host "[EXIT] Next.js exited with $($frontend.ExitCode); stopping backend" -ForegroundColor Yellow
            break
        }
    }
} finally {
    Stop-Children
}
