from flask import Flask, jsonify, render_template
from flask_cors import CORS
from flask_migrate import Migrate
from .config import Config
from .extensions import (
    ExtSQLAchemy, ExtJWT, ExtAPScheduler, ExtLimiter, ExtRedis
)

import os
import secrets
import string

def create_app(config_class=Config, enable_scheduler=True):
    app = Flask(__name__)

    # ---------------------------
    # Load configuration
    # ---------------------------
    app.url_map.strict_slashes = False
    app.config.from_object(config_class)

    # Global variable declarations
    global db
    global migrate
    global jwt
    global limiter
    global redis_client
    global scheduler

    # ----------------------------------------
    # Cors Initialization
    # This section sets up the CORS (Cross-Origin Resource Sharing) mechanism for cross-domain communication
    # ----------------------------------------
    CORS(app, resources={r"/*": {
        "origins": app.config['CORS_ORIGINS'],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "X-CSRF-TOKEN"],
        "expose_headers": ["Content-Type"],
        "max_age": 600
    }}, supports_credentials=True)

    # ----------------------------------------
    # Database Initialization
    # This section sets up the SQLAlchemy database connection and creates all tables
    # ----------------------------------------
    db = ExtSQLAchemy(app)

    # ----------------------------------------
    # Migrate Initialization
    # This section sets up the Flask-Migrate extension for database migration management
    # ----------------------------------------
    migrate = Migrate(app, db)

    # ----------------------------------------
    # JWT Initialization
    # This section sets up Flask-JWT-Extended for cookie-based authentication
    # ----------------------------------------
    jwt = ExtJWT(app)

    # ----------------------------------------
    # Limiter Initialization
    # This section sets up Flask-Limiter for request rate limiting
    # ----------------------------------------
    limiter = ExtLimiter(app)

    # ----------------------------------------
    # Redis Initialization
    # Ephemeral store for email verification codes (TTL handles expiry) and
    # the JWT blocklist. Strings auto-decoded.
    # ----------------------------------------
    redis_client = ExtRedis(app)

    # ----------------------------------------
    # Scheduler Initialization
    # This section sets up the APScheduler for running scheduled tasks
    # ----------------------------------------
    if enable_scheduler:
        scheduler = ExtAPScheduler(app)
        from .schedule import backup_database_schedule
    else:
        scheduler = None

    # ----------------------------------------
    # JWT Blocklist Registration
    # This section rejects tokens that have been revoked (logout) or issued
    # before a user's password-change cut-off
    # ----------------------------------------
    from .operations import is_token_invalidated

    @jwt.token_in_blocklist_loader
    def _token_revoked(jwt_header, jwt_payload):
        return is_token_invalidated(jwt_payload)

    # ----------------------------------------
    # Admin Password Configuration
    # This section loads the admin password from env or auto-generates one
    # ----------------------------------------
    admin_password = os.environ.get('ADMIN_PASSWORD')
    if not admin_password:
        alphabet = string.ascii_letters + string.digits
        admin_password = ''.join(secrets.choice(alphabet) for i in range(16))
    app.config['ADMIN_PASSWORD'] = admin_password
    app.logger.info(f"Admin password configured (auto-generated: {os.environ.get('ADMIN_PASSWORD') is None})")

    # ----------------------------------------
    # Blueprint Registration
    # This section registers all the blueprints (modular components) of the application
    # ----------------------------------------

    @app.errorhandler(Exception)
    def handle_exception(e):
        app.logger.error(f"Unhandled exception: {e}", exc_info=True)
        return jsonify(error="Internal server error"), 500

    from .routes import api_bp
    app.register_blueprint(api_bp)
    app.add_url_rule('/test', 'test', lambda: render_template('test.html'), methods=['GET'])

    # ----------------------------------------
    # CLI Command Registration
    # This section adds custom CLI commands for database operations
    # ----------------------------------------
    from .cli import register_commands

    register_commands(app)

    return app