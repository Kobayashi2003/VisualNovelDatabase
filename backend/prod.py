"""Production launcher.

Differences from run.py:
  - Flask servers always run under Waitress (no dev-server option).
  - No Flower (it's a dev-only celery dashboard).
  - Caddy is mandatory: missing `caddy` is a hard error rather than a
    soft warning, because in prod Caddy IS the public ingress.
  - Accepts --next-port so Caddy knows where to proxy / to the Next.js
    standalone server. start-prod.ps1 passes this in.

Postgres is NOT launched here — run it as a Windows service so its shutdown
is owned by the SCM (clean fast shutdown regardless of how the app dies).
See backend/pg-service.ps1.

What it still starts (all optional services are skipped with a prominent
warning if their binary is missing):
  - Redis      (skipped if `redis-server` not on PATH — run as a service too)
  - vndb / imgserve Celery workers
  - vndb / imgserve / userserve Waitress servers
  - Caddy      (required — see above)
"""

import argparse
import logging
import os
from logging.handlers import RotatingFileHandler

from dotenv import load_dotenv

from procserve import Supervisor
import _procspecs as ps


# Load backend/.env into the parent process *before* spec-makers run — they
# read PG_DATA, DATA_FOLDER, etc. from os.environ. The Flask children also
# load .env themselves, but that's too late for the launcher's decisions.
load_dotenv()

os.makedirs("logs", exist_ok=True)
os.environ["PYTHONUNBUFFERED"] = "1"

logger = logging.getLogger("prod")
logger.setLevel(logging.INFO)

file_handler = RotatingFileHandler("logs/prod.log", maxBytes=1024 * 1024 * 5)
file_handler.setLevel(logging.INFO)
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.ERROR)
formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
file_handler.setFormatter(formatter)
console_handler.setFormatter(formatter)
logger.addHandler(file_handler)
logger.addHandler(console_handler)

logging.getLogger("_procspecs").addHandler(file_handler)
logging.getLogger("_procspecs").setLevel(logging.INFO)


def build_specs(next_port: int):
    return ps.collect(
        ps.make_redis_spec(),
        ps.make_celery_spec("vndb"),
        ps.make_flask_spec("vndb", use_waitress=True),
        ps.make_celery_spec("imgserve"),
        ps.make_flask_spec("imgserve", use_waitress=True),
        ps.make_flask_spec("userserve", use_waitress=True),
        ps.make_caddy_spec(next_port=next_port, required=True),
    )


def main():
    parser = argparse.ArgumentParser(description="Production backend launcher")
    parser.add_argument(
        "--next-port", type=int, default=5003,
        help="Port the Next.js standalone server listens on; Caddy proxies "
             "/ to this port. (default: 5003)",
    )
    args = parser.parse_args()

    Supervisor(build_specs(next_port=args.next_port), logger=logger).run()


if __name__ == "__main__":
    main()
