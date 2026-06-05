# ============================================================================
# Production launcher.
#
# Boots two child processes and forwards Ctrl+C to both:
#   1. backend/launch.py prod — launched via `pixi run prod` so it runs inside
#      the reproducible pixi env (Python 3.13 + postgresql + psycopg2 + all PyPI
#      deps). Run backend/scripts/pixi-setup.ps1 once to materialize the env.
#      Spawns: Redis + 3 Waitress backends + 2 Celery workers + Caddy
#   2. Next.js standalone — node frontend/.next/standalone/server.js
#
# Postgres is NOT spawned by launch.py — it must already be running as a Windows
# service (backend/scripts/pg-service.ps1). Before launching the children this
# script verifies that service is registered + Running and that the cluster is
# accepting TCP connections, auto-starting the service if it's merely stopped.
#
# Caddy is the only public ingress; frp should forward to CADDY_BIND
# (default :30709, set in backend/.env). All four paths live behind it:
#   /            -> Next.js (NextPort, default 5004)
#   /vndb/*      -> Flask vndb
#   /imgserve/*  -> Flask imgserve
#   /userserve/* -> Flask userserve
#   /transserve/* -> Flask transserve
#
# Usage:
#   .\start-prod.ps1                     # start with whatever is already built
#   .\start-prod.ps1 -Build              # `npm run build` first, then start
#   .\start-prod.ps1 -Dev                # dev-mode startup (pixi run dev + next dev,
#                                        #   no Caddy/standalone) instead of prod
#   .\start-prod.ps1 -Clean              # delete frontend/.next first, then start
#                                        #   (prod: forces a rebuild; dev: next dev rebuilds)
#   .\start-prod.ps1 -NextPort 5005      # override the Next.js port (prod + dev)
#   .\start-prod.ps1 -SkipPgCheck        # skip the Postgres service/readiness check
#   .\start-prod.ps1 -PgServiceName foo  # check a differently-named PG service
# ============================================================================

[CmdletBinding()]
param(
    [switch]$Build,
    # Dev-mode startup: boot the dev stack (`pixi run dev` — Flask dev
    # servers + Flower, no mandatory Caddy) plus `next dev`, instead of the prod
    # stack (Waitress + Caddy + Next.js standalone). No build/standalone needed.
    [switch]$Dev,
    # Delete frontend/.next (old build output) before starting. In prod this
    # forces a fresh `npm run build`; in dev `next dev` recompiles from scratch.
    [switch]$Clean,
    [int]$NextPort = 5004,
    # Postgres runs as a Windows service (backend/scripts/pg-service.ps1); this
    # is its service name (matches that script's default).
    [string]$PgServiceName = 'postgresql-vndb',
    # Bypass the Postgres check entirely — for when Postgres is run some other
    # way (different service name, container, remote host, etc.).
    [switch]$SkipPgCheck
)

$ErrorActionPreference = 'Stop'

$root             = $PSScriptRoot
$backendDir       = Join-Path $root 'backend'
$frontendDir      = Join-Path $root 'frontend'
$standaloneRoot   = Join-Path $frontendDir '.next\standalone'
$standaloneServer = Join-Path $standaloneRoot 'server.js'
# Dev mode runs `next dev` straight through node (same as the prod standalone
# server) rather than via npm/cmd, so Ctrl+C reaches it cleanly and taskkill /T
# can walk its tree on the backstop path.
$nextBin          = Join-Path $frontendDir 'node_modules\next\dist\bin\next'

# Pixi is required — we launch the backend through `pixi run` so it uses
# the env declared in backend/pixi.toml rather than whatever `python` on
# PATH happens to be. The env is materialized by backend/scripts/pixi-setup.ps1.
if (-not (Get-Command pixi -ErrorAction SilentlyContinue)) {
    throw "pixi is not on PATH. Install it (scoop install pixi) and run backend\scripts\pixi-setup.ps1 once before start-prod.ps1."
}
if (-not (Test-Path (Join-Path $backendDir '.pixi'))) {
    Write-Host "[WARN] backend\.pixi not found — running backend\scripts\pixi-setup.ps1 to install the env." -ForegroundColor Yellow
    & (Join-Path $backendDir 'scripts\pixi-setup.ps1')
    if ($LASTEXITCODE -ne 0) { throw "backend\scripts\pixi-setup.ps1 failed (exit $LASTEXITCODE)" }
}

# ---------- Postgres preflight ----------------------------------------------
# launch.py does NOT launch Postgres; it expects the cluster to be up. The
# canonical way is the Windows service (backend/scripts/pg-service.ps1), but
# Postgres might equally be run another way (a differently-named service, a
# container, a foreground postmaster, a remote host). So reachability is the
# source of truth here: probe the port first, and only fall back to managing
# the named service when nothing is answering on it.
#
#   - port reachable                       -> proceed (warn if the managed
#                                             service looks abnormal, but a
#                                             reachable DB is all the children
#                                             actually need)
#   - port dead + service Stopped          -> auto-start the service, re-probe
#   - port dead + service missing/unstartable -> fail fast with guidance
#     (every Flask/Celery child would otherwise die on its first connect)

function Test-PgPortOpen {
    param([string]$TargetHost, [int]$Port, [int]$TimeoutMs = 1000)
    $client = [System.Net.Sockets.TcpClient]::new()
    try {
        $iar = $client.BeginConnect($TargetHost, $Port, $null, $null)
        if ($iar.AsyncWaitHandle.WaitOne($TimeoutMs) -and $client.Connected) {
            $client.EndConnect($iar)
            return $true
        }
        return $false
    } catch {
        return $false
    } finally {
        $client.Dispose()
    }
}

function Resolve-PgHostPort {
    # Pull host:port out of VNDB_DB_URL in backend/.env so the readiness probe
    # hits the same cluster the app connects to. Defaults to localhost:5432.
    $result = @{ TargetHost = 'localhost'; Port = 5432 }
    $envFile = Join-Path $backendDir '.env'
    if (Test-Path $envFile) {
        foreach ($line in Get-Content $envFile) {
            if ($line -match '^\s*VNDB_DB_URL\s*=\s*(.+?)\s*$') {
                $url = $Matches[1].Trim().Trim('"').Trim("'")
                if ($url -match '@([^:/@]+):(\d+)/') {
                    $result.TargetHost = $Matches[1]
                    $result.Port = [int]$Matches[2]
                }
                break
            }
        }
    }
    return $result
}

function Ensure-Postgres {
    $pg = Resolve-PgHostPort
    $probeHost = if ($pg.TargetHost -in @('0.0.0.0', '::')) { 'localhost' } else { $pg.TargetHost }
    $svc = Get-Service -Name $PgServiceName -ErrorAction SilentlyContinue

    # 1. Reachability first — if the cluster already accepts connections we're
    #    done, regardless of how it's being run.
    Write-Host "[PG] Probing ${probeHost}:$($pg.Port) ..." -ForegroundColor Cyan
    if (Test-PgPortOpen -TargetHost $probeHost -Port $pg.Port) {
        if (-not $svc) {
            Write-Host "[PG] Reachable on ${probeHost}:$($pg.Port) (service '$PgServiceName' not registered — Postgres is running another way). Proceeding." -ForegroundColor Green
        } elseif ($svc.Status -ne 'Running') {
            Write-Host "[PG][WARN] Reachable on ${probeHost}:$($pg.Port), but the managed service '$PgServiceName' is '$($svc.Status)' — something else is serving this port. Proceeding anyway." -ForegroundColor Yellow
        } else {
            Write-Host "[PG] Reachable on ${probeHost}:$($pg.Port) (service '$PgServiceName' Running)." -ForegroundColor Green
        }
        return
    }

    # 2. Nothing answering on the port — fall back to the managed service.
    Write-Host "[PG] Not reachable; checking service '$PgServiceName'." -ForegroundColor Cyan
    if (-not $svc) {
        Write-Host "[PG][ERROR] Nothing listening on ${probeHost}:$($pg.Port) and service '$PgServiceName' is not registered." -ForegroundColor Red
        Write-Host "            Register it once from an elevated PowerShell:" -ForegroundColor Red
        Write-Host "              backend\scripts\pg-service.ps1 register" -ForegroundColor Red
        Write-Host "            Or pass -SkipPgCheck if you run Postgres another way." -ForegroundColor Red
        throw "PostgreSQL not reachable on ${probeHost}:$($pg.Port) and service '$PgServiceName' not found."
    }

    if ($svc.Status -ne 'Running') {
        Write-Host "[PG] Service is '$($svc.Status)'; attempting Start-Service ..." -ForegroundColor Yellow
        try {
            Start-Service -Name $PgServiceName -ErrorAction Stop
            (Get-Service -Name $PgServiceName).WaitForStatus('Running', '00:00:30')
            Write-Host "[PG] Service started." -ForegroundColor Green
        } catch {
            Write-Host "[PG][ERROR] Could not start '$PgServiceName': $($_.Exception.Message)" -ForegroundColor Red
            Write-Host "            Start it from an elevated PowerShell:" -ForegroundColor Red
            Write-Host "              backend\scripts\pg-service.ps1 start" -ForegroundColor Red
            throw "PostgreSQL service '$PgServiceName' is not running."
        }
    }

    # 3. Service is Running now (or already was) but the port wasn't answering
    #    a moment ago — a 'Running' service can briefly precede the postmaster
    #    accepting TCP connections, so re-probe with a short retry window.
    Write-Host "[PG] Waiting for ${probeHost}:$($pg.Port) to accept connections ..." -ForegroundColor Cyan
    $deadline = (Get-Date).AddSeconds(30)
    while ((Get-Date) -lt $deadline) {
        if (Test-PgPortOpen -TargetHost $probeHost -Port $pg.Port) {
            Write-Host "[PG] Accepting connections on ${probeHost}:$($pg.Port)." -ForegroundColor Green
            return
        }
        Start-Sleep -Milliseconds 500
    }
    Write-Host "[PG][ERROR] '$PgServiceName' is Running but ${probeHost}:$($pg.Port) never accepted a connection within 30s." -ForegroundColor Red
    Write-Host "            Inspect the cluster: backend\scripts\pg-service.ps1 status" -ForegroundColor Red
    throw "PostgreSQL not accepting connections on ${probeHost}:$($pg.Port)."
}

if ($SkipPgCheck) {
    Write-Host "[PG] -SkipPgCheck set; skipping PostgreSQL service/readiness check." -ForegroundColor Yellow
} else {
    Ensure-Postgres
}

# ---------- optional clean step ---------------------------------------------
# Wipe the previous build output so a rebuild can't pick up stale chunks. In
# prod this makes a fresh build mandatory (forced below); in dev `next dev`
# simply recompiles into a clean .next.
if ($Clean) {
    $nextDir = Join-Path $frontendDir '.next'
    if (Test-Path $nextDir) {
        Write-Host "[CLEAN] Removing old build output: $nextDir" -ForegroundColor Cyan
        Remove-Item -Recurse -Force $nextDir
    } else {
        Write-Host "[CLEAN] No existing .next to remove." -ForegroundColor Cyan
    }
}

# Use Start-Process for the children so we get real Process objects back and can
# Wait/Stop them individually. Both inherit the console, so their stdout
# interleaves into this terminal — same UX as `pixi run dev`.

if ($Dev) {
    # ======================= DEV STARTUP ===========================
    # Dev stack: `pixi run dev` (Flask dev servers + Flower; Caddy is opt-in via
    # USE_CADDY and skipped by default) plus `next dev`. The browser hits Next.js
    # directly on :$NextPort, whose rewrites (frontend/next.config.ts) proxy
    # /vndb, /imgserve, /userserve to the Flask dev ports — so neither Caddy nor
    # the standalone build is involved.
    if ($Build) {
        Write-Host "[WARN] -Build is ignored in -Dev mode; next dev compiles on demand." -ForegroundColor Yellow
    }
    if (-not (Test-Path $nextBin)) {
        throw "next CLI not found at $nextBin. Run 'npm install' in frontend/ first."
    }

    Write-Host "[START] backend/launch.py dev via pixi (Flask dev + Flower)" -ForegroundColor Green
    $backend = Start-Process `
        -FilePath 'pixi' `
        -ArgumentList @('run', 'dev') `
        -WorkingDirectory $backendDir `
        -NoNewWindow `
        -PassThru

    Write-Host "[START] Next.js dev server on http://localhost:$NextPort" -ForegroundColor Green
    $frontend = Start-Process `
        -FilePath 'node' `
        -ArgumentList @($nextBin, 'dev', '--port', $NextPort) `
        -WorkingDirectory $frontendDir `
        -NoNewWindow `
        -PassThru
} else {
    # ========================== PROD STARTUP ================================
    # ---------- build step --------------------------------------------------
    # -Clean wiped .next, so a build is mandatory after it; -Build requests one
    # explicitly.
    if ($Build -or $Clean) {
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
        throw "Standalone build not found at $standaloneServer. Run with -Build (or -Clean) first."
    }

    # ---------- mirror static + public into the standalone tree -------------
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
        throw "Source .next/static not found at $srcStatic. Run with -Build (or -Clean) first."
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

    # ---------- launch children ---------------------------------------------
    Write-Host "[START] backend/launch.py prod via pixi (Caddy will proxy / to :$NextPort)" -ForegroundColor Green
    # `pixi run prod -- --next-port N` -> `python launch.py prod --next-port N`
    # inside the pixi env. The `--` separator keeps pixi from claiming
    # `--next-port` as one of its own flags.
    $backend = Start-Process `
        -FilePath 'pixi' `
        -ArgumentList @('run', 'prod', '--', '--next-port', $NextPort) `
        -WorkingDirectory $backendDir `
        -NoNewWindow `
        -PassThru

    Write-Host "[START] Next.js standalone on :$NextPort" -ForegroundColor Green
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
}

# ---------- shutdown handling -----------------------------------------------
$children = @($backend, $frontend)

function Stop-Children {
    # The graceful path is Ctrl+C in the terminal: Windows fans a CTRL_C_EVENT
    # out to the whole console process group (this script, launch.py, node, and
    # all of their grandchildren), and launch.py's signal_handler tears down
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
            Write-Host "[EXIT] backend/launch.py exited with $($backend.ExitCode); stopping frontend" -ForegroundColor Yellow
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
