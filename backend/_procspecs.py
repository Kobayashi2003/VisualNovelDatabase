"""Spec-makers for the backend's child processes.

Each function returns either a ProcSpec ready to hand to Supervisor, or
None when a prerequisite is missing (binary not on PATH, env var unset,
data directory absent). The caller is expected to filter Nones from the
list. This module is shared by run.py and prod.py — the only divergences
are which specs each launcher builds and a couple of per-spec flags
(Waitress vs Flask dev server, Caddy hard-fail vs opt-in).

Knowledge that lives here:
  - which binaries each service needs (so the missing-binary warning is
    centralized);
  - the dependency graph (postgres/redis before celery/flask, flask
    before caddy, etc.);
  - the per-service env wiring (mostly relevant to Caddy);
  - the `python -c "..."` bootstrap strings for Celery/Flask/Waitress.
"""

from __future__ import annotations

import logging
import os
import shutil
import subprocess  # noqa: F401  (re-exported for type hints in callers)
import sys
from typing import List, Optional

from procserve import ProcSpec

logger = logging.getLogger(__name__)


# ---------- shared binary-existence check ------------------------------------


def _check_binary(name: str, install_hint: str = "") -> Optional[str]:
    """Resolve `name` on PATH; on miss, log + print a prominent warning so
    the user notices before the subprocess silently fails to spawn."""
    path = shutil.which(name)
    if path is None:
        msg = f"`{name}` not found on PATH. {install_hint}".rstrip()
        logger.warning(f"[MISSING] {msg}")
        print(
            f"\n!!! [MISSING] {msg}\n"
            f"    Skipping the associated service; other services will still start.\n",
            file=sys.stderr,
        )
    return path


# ---------- external services -----------------------------------------------


def make_postgres_spec() -> Optional[ProcSpec]:
    """Foreground postgres server.

    PG_DATA in the env → passed as `-D <dir>`. Unset/empty → run `postgres`
    bare and let it pick up its own default (typically the PGDATA env var
    that the user's system install configured, e.g. via scoop). Postgres
    itself reports a much clearer error than we can if neither is set —
    we just hand it the binary and stand back.

    Returns None only when the binary itself is missing on PATH. If the
    user has postgres running as a service already, comment this maker
    out of run.py / prod.py's build_specs() — there's no auto-detect."""
    pg_bin = _check_binary(
        "postgres",
        "Install PostgreSQL (https://www.postgresql.org/download/) and add "
        "its `bin/` to PATH — or comment make_postgres_spec() out of "
        "run.py / prod.py if postgres is already running externally.",
    )
    if not pg_bin:
        return None

    pg_data = (os.environ.get("PG_DATA") or "").strip()
    cmd = [pg_bin]
    if pg_data:
        cmd += ["-D", pg_data]
    return ProcSpec(name="postgres", cmd=cmd)


def make_redis_spec() -> Optional[ProcSpec]:
    redis_bin = _check_binary(
        "redis-server",
        "Install Redis (Memurai/Redis-Windows, or via WSL) and make sure "
        "`redis-server` is on PATH — or run Redis as a service/daemon and "
        "remove this spec from the launcher.",
    )
    if not redis_bin:
        return None

    return ProcSpec(
        name="redis",
        cmd=[
            redis_bin,
            "--save", '""',          # disable RDB snapshots
            "--appendonly", "no",    # disable AOF persistence
        ],
        log_prefix="[REDIS]",
    )


def make_caddy_spec(next_port: Optional[int] = None,
                    *, required: bool = False) -> Optional[ProcSpec]:
    """Unified edge in front of the 3 Flask backends (and Next.js in prod).

    Two modes:
      - dev (`required=False`): opt-in via USE_CADDY=true; missing binary
        is a soft warning.
      - prod (`required=True`): hard-fail on missing binary. In prod Caddy
        IS the public ingress, so silently skipping it would expose the
        Flask backends directly on their dev ports.

    `next_port` is only relevant in prod (frontend lives behind /)."""
    if not required and os.environ.get("USE_CADDY", "false").lower() not in (
        "true", "1", "yes"
    ):
        return None

    caddy_bin = shutil.which("caddy")
    if not caddy_bin:
        if required:
            raise RuntimeError(
                "caddy not on PATH. Install Caddy (https://caddyserver.com/download) "
                "and make sure `caddy` resolves before launching prod."
            )
        _check_binary(
            "caddy",
            "Install Caddy (https://caddyserver.com/download) and make sure "
            "it resolves on PATH, or set USE_CADDY=false to skip the edge.",
        )
        return None

    data_folder = os.environ.get("DATA_FOLDER", "./DATA")
    image_folder = os.path.abspath(os.path.join(data_folder, "images"))
    os.makedirs(image_folder, exist_ok=True)

    env = os.environ.copy()
    env["IMGSERVE_IMAGE_FOLDER"] = image_folder
    env["IMGSERVE_PORT"]  = os.environ.get("IMGSERVE_PORT",  "5001")
    env["USERSERVE_PORT"] = os.environ.get("USERSERVE_PORT", "5002")
    env["VNDB_PORT"]      = os.environ.get("VNDB_PORT",      "5000")
    if next_port is not None:
        env["NEXT_PORT"] = str(next_port)
    env.setdefault("CADDY_BIND", ":7090")

    backend_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(backend_dir)
    caddyfile = os.path.join(project_root, "Caddyfile")

    print(
        f"[CADDY] bind={env['CADDY_BIND']} image_folder={image_folder} "
        f"upstreams=imgserve::{env['IMGSERVE_PORT']}, "
        f"userserve::{env['USERSERVE_PORT']}, "
        f"vndb::{env['VNDB_PORT']}"
        + (f", next::{next_port}" if next_port is not None else "")
    )

    # Depend on the Flask trio so caddy's upstream probes find them up.
    # `userserve_flask` etc. may not be in the final spec list if their
    # makers returned None — Supervisor's topo sort drops missing edges.
    return ProcSpec(
        name="caddy",
        cmd=[caddy_bin, "run", "--config", caddyfile, "--adapter", "caddyfile"],
        cwd=project_root,
        env=env,
        depends_on=["vndb_flask", "imgserve_flask", "userserve_flask"],
    )


# ---------- celery / flower / flask (python -c bootstraps) ------------------

# Using sys.executable instead of a bare 'python' so the child runs under
# the *exact* same interpreter as the parent — matters when the parent is
# launched via `pixi run` (parent's python is the pixi env's python, and
# we want the child to use that too rather than whatever 'python' on PATH
# happens to be).
_PY = sys.executable


def make_celery_spec(app_name: str) -> ProcSpec:
    concurrency = int(os.environ.get("CELERY_CONCURRENCY", os.cpu_count() or 4))
    bootstrap = (
        f"from {app_name} import create_app;"
        f"app = create_app(enable_scheduler=False);"
        f"config = app.config;"
        f"celery = app.celery;"
        f"celery.Worker(pool='threads', concurrency={concurrency}, "
        f"loglevel='info', quiet=False).start();"
    )
    return ProcSpec(
        name=f"{app_name}_celery",
        cmd=[_PY, "-c", bootstrap],
        depends_on=["redis", "postgres"],
        log_prefix=f"[{app_name.upper()} CELERY]",
    )


def make_flower_spec(app_name: str) -> ProcSpec:
    # celery_worker is imported here (not at module top) so the spec-maker
    # only triggers the app's heavyweight create_app() when the launcher
    # actually wants Flower — prod.py skips Flower entirely.
    import celery_worker
    config = getattr(celery_worker, f"{app_name}_config")
    broker = config["CELERY_BROKER_URL"]
    port = config["FLOWER_PORT"]
    return ProcSpec(
        name=f"{app_name}_flower",
        cmd=["celery", f"--broker={broker}", "flower", f"--port={port}"],
        depends_on=[f"{app_name}_celery"],
        log_prefix=f"[{app_name.upper()} FLOWER]",
    )


def make_flask_spec(app_name: str, *, use_waitress: bool) -> ProcSpec:
    if use_waitress:
        bootstrap = (
            f"from waitress import serve;"
            f"import {app_name};"
            f"app = {app_name}.create_app();"
            f"config = app.config;"
            f"serve(app, host=config['APP_HOST'], port=config['APP_PORT'],"
            f"      threads=config.get('WAITRESS_THREADS', 4));"
        )
        prefix = f"[{app_name.upper()} WAITRESS]"
    else:
        bootstrap = (
            f"from {app_name} import create_app;"
            f"app = create_app();"
            f"config = app.config;"
            f"app.run(host=config['APP_HOST'],"
            f"port=config['APP_PORT'],"
            f"debug=config['DEBUG'],"
            f"use_reloader=config['USE_RELOADER']);"
        )
        prefix = f"[{app_name.upper()} FLASK]"

    return ProcSpec(
        name=f"{app_name}_flask",
        cmd=[_PY, "-c", bootstrap],
        depends_on=["postgres", "redis"],
        log_prefix=prefix,
    )


# ---------- convenience: filter Nones out -----------------------------------


def collect(*maybe_specs: Optional[ProcSpec]) -> List[ProcSpec]:
    """Drop the Nones from a positional list of optional specs."""
    return [s for s in maybe_specs if s is not None]
