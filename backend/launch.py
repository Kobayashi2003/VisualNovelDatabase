"""Backend process launcher (dev + prod).

Merges the former run.py (dev), prod.py (prod) and _procspecs.py (shared
spec-makers) into a single entry point with two subcommands:

    python launch.py dev [--waitress]
    python launch.py prod [--next-port N]

(usually invoked via `pixi run dev` / `pixi run prod` — see pixi.toml).

It builds a ProcSpec list for the chosen stack and hands it to
procserve.Supervisor, which does the topological start, log aggregation and
signal-driven reverse-topological shutdown (see procserve/__init__.py).

Stacks:
  - dev : Redis + vndb/imgserve Celery workers + Flower dashboards
          + vndb/imgserve/userserve/transserve/musicserve Flask servers
            (Flask dev or Waitress)
          + Caddy edge (opt-in via USE_CADDY=true; missing binary is a warning)
  - prod: Redis + vndb/imgserve Celery workers
          + vndb/imgserve/userserve/transserve/musicserve Waitress servers
          + Caddy (mandatory public ingress; missing binary is a hard error)
          No Flower (it's a dev-only celery dashboard).

Postgres is intentionally NOT launched here — it runs as a Windows service
(see backend/scripts/pg-service.ps1) so the SCM owns its shutdown (clean fast
shutdown regardless of how the app dies). The flask/celery specs still declare
depends_on=["postgres"]; since no postgres spec is in the list, Supervisor's
topo sort treats that edge as already-satisfied.

Knowledge that lives in the spec-makers below:
  - which binaries each service needs (so the missing-binary warning is
    centralized);
  - the dependency graph (redis before celery/flask, flask before caddy,
    etc.; postgres is external, see above);
  - the per-service env wiring (mostly relevant to Caddy);
  - the `python -c "..."` bootstrap strings for Celery/Flask/Waitress.
"""

from __future__ import annotations

import argparse
import logging
import os
import shutil
import sys
from logging.handlers import RotatingFileHandler
from typing import List, Optional

from dotenv import load_dotenv

from procserve import ProcSpec, Supervisor


# Load backend/.env into the parent process *before* the spec-makers run —
# they read PG_DATA, USE_CADDY, DATA_FOLDER, the celery broker / flower ports,
# etc. from os.environ. The Flask children also load .env themselves (see
# vndb/config.py), but that's too late for the launcher's own decisions.
load_dotenv()

os.makedirs("logs", exist_ok=True)
os.environ["PYTHONUNBUFFERED"] = "1"

logger = logging.getLogger("launch")


def _setup_logging(mode: str) -> None:
    """Log INFO+ to logs/<mode>.log and ERROR+ to the console. The spec-makers
    below log through this same logger, so their missing-binary warnings land
    in the file too."""
    logger.setLevel(logging.INFO)
    file_handler = RotatingFileHandler(f"logs/{mode}.log", maxBytes=1024 * 1024 * 5)
    file_handler.setLevel(logging.INFO)
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.ERROR)
    formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
    file_handler.setFormatter(formatter)
    console_handler.setFormatter(formatter)
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)


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
    env["TRANSSERVE_PORT"] = os.environ.get("TRANSSERVE_PORT", "5003")
    env["MUSICSERVE_PORT"] = os.environ.get("MUSICSERVE_PORT", "5004")
    if next_port is not None:
        env["NEXT_PORT"] = str(next_port)
    env.setdefault("CADDY_BIND", ":30709")

    backend_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(backend_dir)
    caddyfile = os.path.join(project_root, "Caddyfile")

    print(
        f"[CADDY] bind={env['CADDY_BIND']} image_folder={image_folder} "
        f"upstreams=imgserve::{env['IMGSERVE_PORT']}, "
        f"userserve::{env['USERSERVE_PORT']}, "
        f"vndb::{env['VNDB_PORT']}, "
        f"transserve::{env['TRANSSERVE_PORT']}, "
        f"musicserve::{env['MUSICSERVE_PORT']}"
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
    # Flower only needs the broker URL and its port. Those map straight from
    # env (see each app's config.py: CELERY_BROKER_URL / FLOWER_PORT are read
    # verbatim from {APP}_CELERY_BROKER_URL / {APP}_FLOWER_PORT), so read them
    # directly instead of paying a full create_app() just to look them up.
    upper = app_name.upper()
    broker = os.environ[f"{upper}_CELERY_BROKER_URL"]
    port = os.environ[f"{upper}_FLOWER_PORT"]
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


# ---------- spec assembly ----------------------------------------------------


def build_specs(mode: str, *, use_waitress: bool,
                next_port: Optional[int]) -> List[ProcSpec]:
    """Assemble the stack for `mode` ("dev" | "prod"). Nones (missing-binary
    skips) are filtered out at the end. The only divergences between the two
    stacks: Flower (dev only), Waitress-vs-Flask-dev for the Flask trio, and
    Caddy's hard-fail-vs-opt-in.
    """
    specs: List[Optional[ProcSpec]] = [make_redis_spec()]
    for app in ("vndb", "imgserve"):
        specs.append(make_celery_spec(app))
        if mode == "dev":
            specs.append(make_flower_spec(app))
        specs.append(make_flask_spec(app, use_waitress=use_waitress))
    specs.append(make_flask_spec("userserve", use_waitress=use_waitress))
    specs.append(make_flask_spec("transserve", use_waitress=use_waitress))
    specs.append(make_flask_spec("musicserve", use_waitress=use_waitress))

    if mode == "prod":
        specs.append(make_caddy_spec(next_port=next_port, required=True))
    else:
        specs.append(make_caddy_spec(required=False))

    return [s for s in specs if s is not None]


def main():
    parser = argparse.ArgumentParser(description="VNDB backend process launcher")
    sub = parser.add_subparsers(dest="mode", required=True)

    p_dev = sub.add_parser("dev", help="Dev stack (Flask dev server + Flower)")
    p_dev.add_argument(
        "--waitress", action="store_true",
        help="Use Waitress WSGI server instead of the Flask dev server",
    )

    p_prod = sub.add_parser("prod", help="Prod stack (Waitress + mandatory Caddy)")
    p_prod.add_argument(
        "--next-port", type=int, default=5010,
        help="Port the Next.js standalone server listens on; Caddy proxies / "
             "to this port. (default: 5010)",
    )

    args = parser.parse_args()
    _setup_logging(args.mode)

    if args.mode == "prod":
        specs = build_specs("prod", use_waitress=True, next_port=args.next_port)
    else:
        specs = build_specs("dev", use_waitress=args.waitress, next_port=None)

    Supervisor(specs, logger=logger).run()


if __name__ == "__main__":
    main()
