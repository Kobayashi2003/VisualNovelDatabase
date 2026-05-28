# ============================================================================
# Register / unregister PostgreSQL as a Windows service.
#
# Why this exists: the app launchers (run.py / prod.py) no longer spawn
# postgres themselves. A foreground postgres under the Python supervisor only
# gets a clean shutdown on the narrow "Ctrl+C in the terminal" path — close
# the console window, log off, or let start-prod.ps1's taskkill /F /T backstop
# fire, and the postmaster is killed abruptly (crash recovery + "database was
# not properly shut down" on the next boot). Run as a Windows service instead
# and the SCM owns its lifecycle: a service stop is a real fast shutdown
# (WAL flushed, txns rolled back) no matter how the app dies, and the DB is
# always up so the app just connects.
#
# Usage (run from an elevated PowerShell — service create/delete needs admin):
#   .\pg-service.ps1 register      # create the service, grant ACLs, start it
#   .\pg-service.ps1 unregister    # stop (clean) + delete the service
#   .\pg-service.ps1 status        # service state + pg_ctl cluster status
#   .\pg-service.ps1 start         # Start-Service wrapper
#   .\pg-service.ps1 stop          # Stop-Service wrapper (clean fast shutdown)
#
# Data dir resolution (first hit wins): -PgData arg > PG_DATA in backend/.env
# > $env:PGDATA. pg_ctl is taken from -PgCtl > PATH.
# ============================================================================

[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet('register', 'unregister', 'status', 'start', 'stop')]
    [string]$Action = 'status',

    [string]$ServiceName = 'postgresql-vndb',
    [string]$PgData,
    [string]$PgCtl,
    [ValidateSet('auto', 'demand')]
    [string]$StartType = 'auto',

    # Low-privilege account the service runs under. NetworkService needs no
    # password; register grants it Full Control on the data dir (initdb ran as
    # your user, so the service account can't read it otherwise). Override with
    # a domain/local account + -Password if you'd rather not touch the ACLs.
    [string]$Account = 'NT AUTHORITY\NetworkService',
    [string]$Password
)

$ErrorActionPreference = 'Stop'

function Write-Step($msg) { Write-Host $msg -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host $msg -ForegroundColor Green }
function Write-Warn2($msg) { Write-Host $msg -ForegroundColor Yellow }
function Write-Err($msg)  { Write-Host $msg -ForegroundColor Red }

function Test-Admin {
    $id = [Security.Principal.WindowsIdentity]::GetCurrent()
    return ([Security.Principal.WindowsPrincipal]$id).IsInRole(
        [Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Resolve-PgCtl {
    if ($PgCtl) {
        if (-not (Test-Path $PgCtl)) { throw "pg_ctl not found at -PgCtl path: $PgCtl" }
        return $PgCtl
    }
    $cmd = Get-Command pg_ctl -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    throw "pg_ctl not on PATH. Add PostgreSQL's bin/ to PATH or pass -PgCtl <path>."
}

function Resolve-PgData {
    if ($PgData) { return $PgData }

    $envFile = Join-Path $PSScriptRoot '.env'
    if (Test-Path $envFile) {
        foreach ($line in Get-Content $envFile) {
            if ($line -match '^\s*PG_DATA\s*=\s*(.+?)\s*$') {
                $val = $Matches[1].Trim().Trim('"').Trim("'")
                if ($val) { return $val }
            }
        }
    }
    if ($env:PGDATA) { return $env:PGDATA }

    throw "Could not determine the data directory. Set PG_DATA in backend/.env, " +
          "set the PGDATA env var, or pass -PgData <dir>."
}

function Require-Admin {
    if (-not (Test-Admin)) {
        Write-Err "[ADMIN] '$Action' needs administrator rights (service create/delete/control)."
        Write-Err "        Re-run this from an elevated PowerShell:"
        Write-Err "          Start-Process pwsh -Verb RunAs"
        Write-Err "          then:  .\pg-service.ps1 $Action"
        exit 1
    }
}

function Invoke-Register {
    Require-Admin
    $pgctl = Resolve-PgCtl
    $data  = Resolve-PgData

    if (-not (Test-Path $data)) {
        throw "Data directory does not exist: $data (run initdb first)."
    }
    if (Get-Service -Name $ServiceName -ErrorAction SilentlyContinue) {
        Write-Warn2 "[SKIP] Service '$ServiceName' already exists. Use 'unregister' first to recreate it."
        return
    }

    # A postmaster already holding this data dir would block the service from
    # starting (data dir lock). Catch it early rather than failing at Start-Service.
    & $pgctl status -D $data *> $null
    if ($LASTEXITCODE -eq 0) {
        Write-Warn2 "[WARN] A postgres instance is already running on $data."
        Write-Warn2 "       Stop it first, then re-run register (or run 'start' after registering)."
    }

    Write-Step "[ACL] Granting '$Account' Full Control on $data"
    & icacls $data /grant "${Account}:(OI)(CI)F" /T /C /Q | Out-Null

    Write-Step "[REGISTER] Creating service '$ServiceName' ($StartType start) under '$Account'"
    $regArgs = @('register', '-N', $ServiceName, '-D', $data, '-S', $StartType, '-U', $Account)
    if ($Password) { $regArgs += @('-P', $Password) }
    & $pgctl @regArgs
    if ($LASTEXITCODE -ne 0) { throw "pg_ctl register failed (exit $LASTEXITCODE)" }

    Write-Step "[START] Starting service '$ServiceName'"
    try {
        Start-Service -Name $ServiceName
        Write-Ok "[OK] '$ServiceName' registered and running. Stop it cleanly any time with: .\pg-service.ps1 stop"
    } catch {
        Write-Warn2 "[WARN] Service registered but failed to start: $($_.Exception.Message)"
        Write-Warn2 "       Check that '$Account' can access $data, then: .\pg-service.ps1 start"
    }
}

function Invoke-Unregister {
    Require-Admin
    $pgctl = Resolve-PgCtl

    $svc = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if (-not $svc) {
        Write-Warn2 "[SKIP] Service '$ServiceName' is not registered."
        return
    }
    if ($svc.Status -ne 'Stopped') {
        # SCM stop -> postgres service control handler -> fast shutdown (clean).
        Write-Step "[STOP] Stopping '$ServiceName' (clean fast shutdown via SCM)"
        Stop-Service -Name $ServiceName
        (Get-Service -Name $ServiceName).WaitForStatus('Stopped', '00:00:30')
    }

    Write-Step "[UNREGISTER] Removing service '$ServiceName'"
    & $pgctl unregister -N $ServiceName
    if ($LASTEXITCODE -ne 0) { throw "pg_ctl unregister failed (exit $LASTEXITCODE)" }
    Write-Ok "[OK] '$ServiceName' unregistered."
}

function Invoke-Status {
    $svc = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if ($svc) {
        Write-Host "Service '$ServiceName': $($svc.Status) (StartType: $($svc.StartType))"
    } else {
        Write-Warn2 "Service '$ServiceName' is not registered."
    }
    try {
        $pgctl = Resolve-PgCtl
        $data  = Resolve-PgData
        Write-Host "Data dir: $data"
        & $pgctl status -D $data
    } catch {
        Write-Warn2 $_.Exception.Message
    }
}

function Invoke-Start {
    Require-Admin
    Write-Step "[START] Starting '$ServiceName'"
    Start-Service -Name $ServiceName
    Write-Ok "[OK] '$ServiceName' started."
}

function Invoke-Stop {
    Require-Admin
    Write-Step "[STOP] Stopping '$ServiceName' (clean fast shutdown via SCM)"
    Stop-Service -Name $ServiceName
    (Get-Service -Name $ServiceName).WaitForStatus('Stopped', '00:00:30')
    Write-Ok "[OK] '$ServiceName' stopped."
}

switch ($Action) {
    'register'   { Invoke-Register }
    'unregister' { Invoke-Unregister }
    'status'     { Invoke-Status }
    'start'      { Invoke-Start }
    'stop'       { Invoke-Stop }
}
