import time
from abc import ABC, abstractmethod
from functools import wraps

from flask import request
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_apscheduler import APScheduler
from flask_limiter import Limiter
from sqlalchemy import text

from .logger import logger

def error_handler(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            print(f"Error: {str(e)}")
            logger.error(str(e))
            return None
    return wrapper

def wait_for_db(db, app, initial_delay=1.0, max_delay=30.0):
    delay = initial_delay
    attempt = 0
    while True:
        attempt += 1
        try:
            with app.app_context():
                with db.engine.connect() as conn:
                    conn.execute(text("SELECT 1"))
            if attempt > 1:
                msg = f"Database connection established after {attempt} attempts"
                logger.info(msg)
                print(msg)
            return
        except Exception as e:
            msg = f"Database not ready (attempt {attempt}): {e}; retrying in {delay:.1f}s"
            logger.warning(msg)
            print(msg)
            time.sleep(delay)
            delay = min(delay * 2, max_delay)

def ratelimit_key():
    """Rate-limit bucket key: the real client IP. The Next.js proxy forwards the
    original address in X-Forwarded-For; fall back to the socket address."""
    forwarded = request.headers.get('X-Forwarded-For', '')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.remote_addr or '127.0.0.1'

class Extension(ABC):
    def __init__(self, app):
        self._app = app
        self._instance = self.create(app)

    @error_handler
    def __getattr__(self, name):
        if not self._instance:
            raise AttributeError(f"{self.__class__.__name__} has not been initialized")
        return getattr(self._instance, name)

    @abstractmethod
    def create(self, app):
        pass

class ExtSQLAchemy(Extension):
    def create(self, app):
        db = SQLAlchemy(app)
        wait_for_db(db, app)
        with app.app_context():
            db.create_all()
        return db

class ExtJWT(Extension):
    def create(self, app):
        jwt = JWTManager(app)
        return jwt

class ExtAPScheduler(Extension):
    def __getattr__(self, name):
        if name == 'task':
            return self.scheduled_task
        return super().__getattr__(name)

    def create(self, app):
        scheduler = APScheduler()
        scheduler.init_app(app)
        scheduler.start()
        return scheduler

    def scheduled_task(self, *args, **kwargs):
        def decorator(func):
            @wraps(func)
            @self._instance.task(*args, **kwargs)
            def wrapper(*a, **kw):
                with self._app.app_context():
                    return func(*a, **kw)
            return wrapper
        return decorator

class ExtLimiter(Extension):
    def create(self, app):
        limiter = Limiter(
            key_func=ratelimit_key,
            app=app,
            storage_uri=app.config.get('RATELIMIT_STORAGE_URI', 'memory://'),
            strategy='fixed-window',
            default_limits=[],
            swallow_errors=True,
        )
        return limiter