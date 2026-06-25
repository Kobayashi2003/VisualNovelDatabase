# Backend image — one image, many roles.
#
# Every backend process (the five Flask/Waitress services, the two Celery
# workers, and the one-shot init/migrate/seed job) runs THIS image with a
# different `command:` in docker-compose.yml. That mirrors backend/launch.py,
# which boots the same code as separate processes under a supervisor.
#
# postgresql-client gives us pg_isready (init wait-loop) and pg_restore
# (optional restore-db CLI). No C toolchain is installed: we swap the
# source-built psycopg2 for psycopg2-binary below, so there's nothing to compile
# (the ~90 MB gcc toolchain otherwise dominates this build).
FROM python:3.13-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app/backend

RUN apt-get update && apt-get install -y --no-install-recommends \
        postgresql-client \
        bash \
    && rm -rf /var/lib/apt/lists/*

# Install deps first so the layer caches across source edits. Swap the
# source-built `psycopg2` pin for the prebuilt `psycopg2-binary` wheel — same
# `psycopg2` import, no compiler needed. (Local/pixi still uses source psycopg2.)
COPY backend/requirements.txt ./
RUN sed -i 's/^psycopg2==/psycopg2-binary==/' requirements.txt \
    && pip install --no-cache-dir -r requirements.txt

# App source (includes transserve/data/init.json — the bundled translation seed).
COPY backend/ ./

# Default is a no-op; compose overrides `command:` for each role.
CMD ["python", "-c", "print('Set a command in docker-compose.yml')"]
