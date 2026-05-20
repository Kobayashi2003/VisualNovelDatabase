"""Signed, self-expiring tokens for the password-reset flow.

Uses itsdangerous so no token table is needed: the token carries the user id
and a fingerprint of their current password hash. Once the password changes the
fingerprint no longer matches, so a used (or stale) reset link stops working.
"""

import hashlib

from flask import current_app
from itsdangerous import URLSafeTimedSerializer, BadData

_RESET_SALT = 'userserve-password-reset'

def _serializer() -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(current_app.config['SECRET_KEY'], salt=_RESET_SALT)

def password_fingerprint(user) -> str:
    """Short digest of the user's password hash. It changes whenever the
    password changes, which is what makes a reset token effectively single-use."""
    return hashlib.sha256((user.password_hash or '').encode()).hexdigest()[:16]

def generate_reset_token(user) -> str:
    return _serializer().dumps({'uid': user.id, 'fp': password_fingerprint(user)})

def verify_reset_token(token: str, max_age: int) -> dict | None:
    """Return the token payload `{uid, fp}` if the signature is valid and the
    token has not expired, otherwise None."""
    try:
        return _serializer().loads(token, max_age=max_age)
    except BadData:
        return None
