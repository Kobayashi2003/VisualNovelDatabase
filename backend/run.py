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

file_handler = RotatingFileHandler(
    'logs/run.log',
    maxBytes=1024 * 1024 * 5,
    # backupCount=5
)
file_handler.setLevel(logging.INFO)

console_handler = logging.StreamHandler()
console_handler.setLevel(logging.ERROR)

formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
file_handler.setFormatter(formatter)
console_handler.setFormatter(formatter)

logger.addHandler(file_handler)
logger.addHandler(console_handler)

def run_caddy() -> Optional[subprocess.Popen]:
    """Launch Caddy as the unified backend edge, if enabled and available.

    Opt-in via USE_CADDY=true. Caddy fronts all three Flask backends behind a
    single bind address (default :7090) using path-prefix routing:
        /imgserve/*  -> imgserve  (with file_server fast path)
        /userserve/* -> userserve
        /vndb/*      -> vndb
    The imgserve image folder is derived from DATA_FOLDER (mirroring
    imgserve.config) so the file_server fast path resolves to the same disk
    location Flask writes to."""
    if os.environ.get('USE_CADDY', 'false').lower() not in ('true', '1', 'yes'):
        return None
    caddy_bin = shutil.which('caddy')
    if not caddy_bin:
        msg = "[CADDY] USE_CADDY is set but `caddy` is not on PATH; skipping."
        logger.warning(msg)
        print(msg)
        return None

    data_folder = os.environ.get('DATA_FOLDER', './DATA')
    image_folder = os.path.abspath(os.path.join(data_folder, 'images'))
    os.makedirs(image_folder, exist_ok=True)

    env = os.environ.copy()
    env['IMGSERVE_IMAGE_FOLDER'] = image_folder
    env['IMGSERVE_PORT']  = os.environ.get('IMGSERVE_PORT',  '5001')
    env['USERSERVE_PORT'] = os.environ.get('USERSERVE_PORT', '5002')
    env['VNDB_PORT']      = os.environ.get('VNDB_PORT',      '5000')
    env.setdefault('CADDY_BIND', ':7090')

    backend_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(backend_dir)
    caddyfile = os.path.join(project_root, 'Caddyfile')

    print(f"Starting Caddy on {env['CADDY_BIND']} "
          f"(image_folder={image_folder}, "
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


def run_redis_server():
    print("Starting Redis server")
    redis_process = subprocess.Popen([
        'redis-server',
        '--save', '""',  # Disable RDB snapshots
        '--appendonly', 'no',  # Disable AOF persistence
    ], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)

    def log_redis():
        for line in redis_process.stdout:
            logger.info(f"[REDIS] {line.strip()}")
            print(f"[REDIS] {line.strip()}")

    threading.Thread(target=log_redis, daemon=True).start()
    return redis_process

def run_celery_worker(app_name):
    # `pool='threads'` (vs the old `solo`) lets I/O-bound tasks — image
    # fetches and the VNDB Kana API calls — run concurrently on Windows,
    # where the prefork pool is unavailable. Concurrency defaults to the CPU
    # count; tune via CELERY_CONCURRENCY if needed.
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

def run_flower(app_name: str):
    print(f"Starting Flower for {app_name}")
    import celery_worker
    config = getattr(celery_worker, f"{app_name}_config")
    broker = config['CELERY_BROKER_URL']
    port = config['FLOWER_PORT']
    flower_process = subprocess.Popen([
        'celery', f'--broker={broker}', 'flower', f"--port={port}"
        # 'celery', '-A', f"celery_worker:{app_name}_celery", 'flower', f"--port={port}"
    ], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)

    def log_flower():
        for line in flower_process.stdout:
            logger.info(f"[{app_name.upper()} FLOWER] {line}")
            print(f"[{app_name.upper()} FLOWER] {line}", end='')

    threading.Thread(target=log_flower, daemon=True).start()
    return flower_process

def run_flask(app_name: str):
    print(f"Starting Flask server for {app_name}")
    process = subprocess.Popen([
        'python', '-c',
        f"from {app_name} import create_app;"
        f"app = create_app();"
        f"config = app.config;"
        f"app.run(host=config['APP_HOST'],"
        f"port=config['APP_PORT'],"
        f"debug=config['DEBUG'],"
        f"use_reloader=config['USE_RELOADER']);"
    ], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)

    def log_flask():
        for line in process.stdout:
            logger.info(f"[{app_name.upper()} FLASK] {line}")
            print(f"[{app_name.upper()} FLASK] {line}", end='')

    threading.Thread(target=log_flask, daemon=True).start()
    return process

def run_flask_waitress(app_name: str):
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
    """Gracefully terminate debug processes"""
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

    parser = argparse.ArgumentParser(description='Run debug servers with options')
    parser.add_argument('--waitress', action='store_true',
                        help='Use Waitress WSGI server instead of Flask development server')
    args = parser.parse_args()

    processes = []

    # Start redis server
    redis_process = run_redis_server()
    processes.append(redis_process)


    # Start vndb celery worker
    vndb_celery_process = run_celery_worker('vndb')
    processes.append(vndb_celery_process)

    # Start vndb flower
    vndb_flower_process = run_flower('vndb')
    processes.append(vndb_flower_process)

    # Start vndb flask
    if args.waitress:
        vndb_flask_process = run_flask_waitress('vndb')
    else:
        vndb_flask_process = run_flask('vndb')
    processes.append(vndb_flask_process)


    # Start imgserve celery worker
    imgserve_celery_process = run_celery_worker('imgserve')
    processes.append(imgserve_celery_process)

    # Start imgserve flower
    imgserve_flower_process = run_flower('imgserve')
    processes.append(imgserve_flower_process)

    # Start imgserve flask
    if args.waitress:
        imgserve_flask_process = run_flask_waitress('imgserve')
    else:
        imgserve_flask_process = run_flask('imgserve')
    processes.append(imgserve_flask_process)


    # Start userserve flask
    if args.waitress:
        userserve_flask_process = run_flask_waitress('userserve')
    else:
        userserve_flask_process = run_flask('userserve')
    processes.append(userserve_flask_process)


    # Optional Caddy edge for imgserve. Started after Flask so the upstream
    # is up by the time Caddy probes it.
    caddy_process = run_caddy()
    if caddy_process is not None:
        processes.append(caddy_process)


    def signal_handler(signum, frame):
        print("\nReceived interrupt signal. Terminating processes...")
        terminate_processes(processes)
        sys.exit(0)

    if sys.platform == 'win32':
        signal.signal(signal.SIGBREAK, signal_handler)
    else:
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        signal_handler(signal.SIGINT, None)

if __name__ == '__main__':
    main()