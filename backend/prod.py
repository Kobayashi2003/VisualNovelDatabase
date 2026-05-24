"""Production backend launcher.

Differences vs. run.py:
  - Always uses Waitress (no Flask dev server option).
  - No Flower (dev-only celery dashboard).
  - Caddy is mandatory: USE_CADDY is forced True. The frontend is reached
    through the same Caddy bind, so a missing caddy binary is a hard error
    here (in run.py it's just a warning).
  - Accepts --next-port so the launched Caddy knows where to proxy the
    Next.js standalone server. start-prod.ps1 passes this in.

What it still starts:
  - Redis (local). Comment out run_redis_server() below if you've installed
    Redis as a Windows service / WSL daemon.
  - Celery workers for vndb and imgserve.
  - Waitress servers for vndb, imgserve, userserve.
  - Caddy unified edge.
"""

import os
import sys
import time
import signal
import shutil
import subprocess
import threading
import argparse
import logging
from logging.handlers import RotatingFileHandler
from typing import List, Optional

os.makedirs('logs', exist_ok=True)
os.environ['PYTHONUNBUFFERED'] = '1'

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

file_handler = RotatingFileHandler('logs/prod.log', maxBytes=1024 * 1024 * 5)
file_handler.setLevel(logging.INFO)
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.ERROR)
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
file_handler.setFormatter(formatter)
console_handler.setFormatter(formatter)
logger.addHandler(file_handler)
logger.addHandler(console_handler)


def run_caddy(next_port: int) -> subprocess.Popen:
    """Launch Caddy. Hard-fail if the binary is missing — in prod the edge
    is the only public ingress, so silently skipping it would expose the
    Flask backends directly on their dev ports."""
    caddy_bin = shutil.which('caddy')
    if not caddy_bin:
        raise RuntimeError(
            "caddy not on PATH. Install Caddy (https://caddyserver.com/download) "
            "and make sure `caddy` resolves before running prod.py."
        )

    data_folder = os.environ.get('DATA_FOLDER', './DATA')
    image_folder = os.path.abspath(os.path.join(data_folder, 'images'))
    os.makedirs(image_folder, exist_ok=True)

    env = os.environ.copy()
    env['IMGSERVE_IMAGE_FOLDER'] = image_folder
    env['IMGSERVE_PORT']  = os.environ.get('IMGSERVE_PORT',  '5001')
    env['USERSERVE_PORT'] = os.environ.get('USERSERVE_PORT', '5002')
    env['VNDB_PORT']      = os.environ.get('VNDB_PORT',      '5000')
    env['NEXT_PORT']      = str(next_port)
    env.setdefault('CADDY_BIND', ':7090')

    backend_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(backend_dir)
    caddyfile = os.path.join(project_root, 'Caddyfile')

    print(f"Starting Caddy on {env['CADDY_BIND']} "
          f"(next={next_port}, image_folder={image_folder}, "
          f"upstreams=imgserve::{env['IMGSERVE_PORT']}, "
          f"userserve::{env['USERSERVE_PORT']}, "
          f"vndb::{env['VNDB_PORT']})")
    caddy_process = subprocess.Popen(
        [caddy_bin, 'run', '--config', caddyfile, '--adapter', 'caddyfile'],
        cwd=project_root, env=env,
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
    )

    def log_caddy():
        for line in caddy_process.stdout:
            logger.info(f"[CADDY] {line.strip()}")
            print(f"[CADDY] {line.strip()}")

    threading.Thread(target=log_caddy, daemon=True).start()
    return caddy_process


def run_redis_server() -> subprocess.Popen:
    print("Starting Redis server")
    redis_process = subprocess.Popen([
        'redis-server',
        '--save', '""',
        '--appendonly', 'no',
    ], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)

    def log_redis():
        for line in redis_process.stdout:
            logger.info(f"[REDIS] {line.strip()}")
            print(f"[REDIS] {line.strip()}")

    threading.Thread(target=log_redis, daemon=True).start()
    return redis_process


def run_celery_worker(app_name: str) -> subprocess.Popen:
    concurrency = int(os.environ.get('CELERY_CONCURRENCY', os.cpu_count() or 4))
    print(f"Starting Celery worker for {app_name} (threads pool, concurrency={concurrency})")
    celery_process = subprocess.Popen([
        'python', '-c',
        f"from {app_name} import create_app;"
        f"app = create_app(enable_scheduler=False);"
        f"config = app.config;"
        f"celery = app.celery;"
        f"celery.Worker(pool='threads', concurrency={concurrency}, loglevel='info', quiet=False).start();"
    ], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)

    def log_celery():
        for line in celery_process.stdout:
            logger.info(f"[{app_name.upper()} CELERY] {line}")
            print(f"[{app_name.upper()} CELERY] {line}", end='')

    threading.Thread(target=log_celery, daemon=True).start()
    return celery_process


def run_flask_waitress(app_name: str) -> subprocess.Popen:
    print(f"Starting Waitress server for {app_name}")
    process = subprocess.Popen([
        'python', '-c',
        f"from waitress import serve;"
        f"import {app_name};"
        f"app = {app_name}.create_app();"
        f"config = app.config;"
        f"serve(app, host=config['APP_HOST'], port=config['APP_PORT'],"
        f"      threads=config.get('WAITRESS_THREADS', 4));"
    ], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)

    def log_waitress():
        for line in process.stdout:
            logger.info(f"[{app_name.upper()} WAITRESS] {line}")
            print(f"[{app_name.upper()} WAITRESS] {line}", end='')

    threading.Thread(target=log_waitress, daemon=True).start()
    return process


def terminate_processes(processes: List[subprocess.Popen]):
    for proc in processes:
        try:
            if proc.poll() is None:
                proc.terminate()
                proc.wait(timeout=3)
        except subprocess.TimeoutExpired:
            proc.kill()
        except Exception as e:
            print(f"Error terminating process: {str(e)}")


def main():
    parser = argparse.ArgumentParser(description='Production backend launcher')
    parser.add_argument('--next-port', type=int, default=5003,
                        help='Port the Next.js standalone server listens on; '
                             'Caddy proxies / to this port. (default: 5003)')
    args = parser.parse_args()

    processes: List[subprocess.Popen] = []

    # Comment out the next two lines if Redis is already running as a
    # Windows service / WSL daemon / separate process.
    redis_process = run_redis_server()
    processes.append(redis_process)

    processes.append(run_celery_worker('vndb'))
    processes.append(run_flask_waitress('vndb'))

    processes.append(run_celery_worker('imgserve'))
    processes.append(run_flask_waitress('imgserve'))

    processes.append(run_flask_waitress('userserve'))

    # Caddy last — its upstream probes need Flask already accepting.
    processes.append(run_caddy(args.next_port))

    def signal_handler(signum, frame):
        print("\nReceived interrupt signal. Terminating processes...")
        terminate_processes(processes)
        sys.exit(0)

    if sys.platform == 'win32':
        signal.signal(signal.SIGBREAK, signal_handler)
    signal.signal(signal.SIGINT, signal_handler)
    if sys.platform != 'win32':
        signal.signal(signal.SIGTERM, signal_handler)

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        signal_handler(signal.SIGINT, None)


if __name__ == '__main__':
    main()
