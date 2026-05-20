"""Minimal SMTP email sending, configured entirely via env vars (see config.py).

When MAIL_SERVER is unset (typical in development), emails are logged instead of
sent so the password-reset flow still works without a real SMTP account.
"""

import smtplib
from email.message import EmailMessage

from flask import current_app

def send_email(to: str, subject: str, body: str) -> bool:
    cfg = current_app.config
    server = cfg.get('MAIL_SERVER')

    # Dev fallback: no SMTP configured → log the message instead of sending.
    if not server or cfg.get('MAIL_SUPPRESS_SEND'):
        current_app.logger.info(f"[mail suppressed] to={to} subject={subject!r}\n{body}")
        print(f"[UserServe] [mail suppressed] to={to} subject={subject!r}\n{body}")
        return True

    message = EmailMessage()
    message['Subject'] = subject
    message['From'] = cfg.get('MAIL_DEFAULT_SENDER') or cfg.get('MAIL_USERNAME')
    message['To'] = to
    message.set_content(body)

    try:
        port = cfg.get('MAIL_PORT', 587)
        if cfg.get('MAIL_USE_SSL'):
            client = smtplib.SMTP_SSL(server, port, timeout=10)
        else:
            client = smtplib.SMTP(server, port, timeout=10)
        with client:
            if cfg.get('MAIL_USE_TLS'):
                client.starttls()
            if cfg.get('MAIL_USERNAME'):
                client.login(cfg['MAIL_USERNAME'], cfg['MAIL_PASSWORD'])
            client.send_message(message)
        return True
    except Exception as e:
        current_app.logger.error(f"Failed to send email to {to}: {e}")
        return False

def send_password_reset_email(user, reset_url: str) -> bool:
    subject = "Reset your VNDB account password"
    body = (
        f"Hi {user.username},\n\n"
        f"We received a request to reset your password. Open the link below to "
        f"choose a new one:\n\n"
        f"{reset_url}\n\n"
        f"If you didn't request this, you can safely ignore this email — your "
        f"password won't change.\n"
    )
    return send_email(user.email, subject, body)

def send_verification_code_email(email: str, code: str) -> bool:
    subject = "Your VNDB sign-up verification code"
    body = (
        f"Your verification code is:\n\n"
        f"    {code}\n\n"
        f"Enter it on the sign-up form to finish creating your account. "
        f"The code expires in 10 minutes.\n\n"
        f"If you didn't request this, you can safely ignore this email.\n"
    )
    return send_email(email, subject, body)
