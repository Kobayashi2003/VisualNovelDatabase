"""Dev launcher.

Builds a ProcSpec list for the dev stack and hands it to procserve.Supervisor:
  - Postgres   (skipped if `postgres` not on PATH or PG_DATA unset)
  - Redis      (skipped if `redis-server` not on PATH)
  - vndb / imgserve Celery workers + Flower dashboards
  - vndb / imgserve / userserve Flask servers (Flask dev or Waitress)
  - Caddy edge (opt-in via USE_CADDY=true)

The actual process management (topological start, log aggregation,
signal-driven reverse-topological shutdown) lives in procserve/. See
procserve/__init__.py for the rationale.
"""

import argparse
import logging
import os
from logging.handlers import RotatingFileHandler

from dotenv import load_dotenv

from procserve import Supervisor
import _procspecs as ps


# Load backend/.env into the parent process *before* spec-makers run — they
# read PG_DATA, USE_CADDY, DATA_FOLDER, etc. from os.environ. The Flask
# children also load .env themselves (see vndb/config.py), but that's too
# late for the launcher's own decisions.
load_dotenv()

os.makedirs("logs", exist_ok=True)
os.environ["PYTHONUNBUFFERED"] = "1"

logger = logging.getLogger("run")
logger.setLevel(logging.INFO)

file_handler = RotatingFileHandler("logs/run.log", maxBytes=1024 * 1024 * 5)
file_handler.setLevel(logging.INFO)
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.ERROR)
formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
file_handler.setFormatter(formatter)
console_handler.setFormatter(formatter)
logger.addHandler(file_handler)
logger.addHandler(console_handler)

# Propagate the spec-maker module's warnings into the same log file.
logging.getLogger("_procspecs").addHandler(file_handler)
logging.getLogger("_procspecs").setLevel(logging.INFO)


def build_specs(use_waitress: bool):
    return ps.collect(
        ps.make_postgres_spec(),
        ps.make_redis_spec(),
        ps.make_celery_spec("vndb"),
        ps.make_flower_spec("vndb"),
        ps.make_flask_spec("vndb", use_waitress=use_waitress),
        ps.make_celery_spec("imgserve"),
        ps.make_flower_spec("imgserve"),
        ps.make_flask_spec("imgserve", use_waitress=use_waitress),
        ps.make_flask_spec("userserve", use_waitress=use_waitress),
        ps.make_caddy_spec(required=False),
    )


def main():
    parser = argparse.ArgumentParser(description="Run dev servers")
    parser.add_argument(
        "--waitress", action="store_true",
        help="Use Waitress WSGI server instead of the Flask dev server",
    )
    args = parser.parse_args()

    Supervisor(build_specs(use_waitress=args.waitress), logger=logger).run()


if __name__ == "__main__":
    main()
