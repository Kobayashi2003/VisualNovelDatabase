import os
from dotenv import load_dotenv
from datetime import timedelta

load_dotenv()

class Config:

    # Flask configurations
    DEBUG = os.environ.get('DEBUG', 'False').lower() in ('true', '1', 'yes')
    USE_RELOADER = os.environ.get('USE_RELOADER', 'False').lower() in ('true', '1', 'yes')
    SECRET_KEY = os.environ['SECRET_KEY']
    APP_HOST = os.environ['USERSERVE_HOST']
    APP_PORT = int(os.environ['USERSERVE_PORT'])

    JWT_SECRET_KEY = os.environ['JWT_SECRET_KEY']
    JWT_VERIFY_SUB = False
    JWT_ALGORITHM = 'HS256'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=int(os.environ.get('JWT_ACCESS_TOKEN_MINUTES', 30)))
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=int(os.environ.get('JWT_REFRESH_TOKEN_DAYS', 30)))

    # Rate limiting (Flask-Limiter). Defaults to in-process memory storage; set
    # USERSERVE_RATELIMIT_STORAGE_URI to a redis:// URL for multi-worker setups.
    RATELIMIT_STORAGE_URI = os.environ.get('USERSERVE_RATELIMIT_STORAGE_URI', 'memory://')
    RATELIMIT_HEADERS_ENABLED = True

    # Mail (SMTP). Leave MAIL_SERVER empty to log reset links instead of sending
    # them — lets the password-reset flow work in dev without a real SMTP account.
    MAIL_SERVER = os.environ.get('MAIL_SERVER', '')
    MAIL_PORT = int(os.environ.get('MAIL_PORT', 587))
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'True').lower() in ('true', '1', 'yes')
    MAIL_USE_SSL = os.environ.get('MAIL_USE_SSL', 'False').lower() in ('true', '1', 'yes')
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME', '')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD', '')
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER', '')
    MAIL_SUPPRESS_SEND = os.environ.get('MAIL_SUPPRESS_SEND', 'False').lower() in ('true', '1', 'yes')

    # Password reset & email verification
    FRONTEND_BASE_URL = os.environ.get('FRONTEND_BASE_URL', 'http://localhost')
    RESET_TOKEN_MAX_AGE = int(os.environ.get('RESET_TOKEN_MAX_AGE_SECONDS', 1800))
    VERIFICATION_CODE_MAX_AGE = int(os.environ.get('VERIFICATION_CODE_MAX_AGE_SECONDS', 600))
    USERSERVE_REDIS_URL = os.environ.get('USERSERVE_REDIS_URL', 'redis://localhost:6379/7')

    # Database configuration
    SQLALCHEMY_DATABASE_URI = os.environ['USERSERVE_DB_URL']
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
    }

    # Scheduler configuration
    SCHEDULER_API_ENABLED = True
    # SCHEDULER_TIMEZONE = "UTC"

    # Data folder configuration
    DATA_FOLDER = os.environ['DATA_FOLDER']
    TEMP_FOLDER = os.path.join(DATA_FOLDER, 'tmp')
    BACKUP_FOLDER = os.path.join(DATA_FOLDER, 'backups')