"""Cheap access tracking for LRU bookkeeping.

Every cache hit ZADDs (key=type:id, score=unix_ts) into a Redis ZSET so the
request path never touches Postgres. A periodic Celery / APScheduler flush
drains the ZSET and writes the timestamps onto the corresponding rows.

Per-key ZADD overwrites the older score, so repeated hits on the same image
keep the ZSET small (one entry per distinct image since last flush)."""

import time
from collections import defaultdict
from datetime import datetime, timezone

from imgserve import db, redis_client

# imgserve.database.models is imported lazily inside flush_access() — it
# transitively re-enters imgserve.utils (models -> get_image_path), so a
# top-level import would create a cycle once utils/__init__.py re-exports
# this module.

ZSET_KEY = "imgserve:access:pending"
# Cap per flush — at 5-min cadence and one entry per distinct image, this is
# generous; if it's ever undersized the next flush picks up the remainder.
FLUSH_BATCH = 50_000


def record_access(type: str, id: int) -> None:
    """Stamp (type, id) as just-accessed. Best-effort: any Redis hiccup is
    swallowed so the hot path never fails on bookkeeping."""
    try:
        member = f"{type}:{id}".encode("utf-8")
        redis_client.zadd(ZSET_KEY, {member: time.time()})
    except Exception as exc:
        # Don't let access tracking ever break a successful image serve.
        print(f"[access] record_access failed: {exc}")


def flush_access() -> dict:
    """Drain the ZSET and write last_accessed_at on the matching rows.

    Returns a per-type count dict for logging. ZPOPMIN is atomic, so entries
    added concurrently are safe."""
    from imgserve.database.models import IMAGE_MODEL
    popped = redis_client.zpopmin(ZSET_KEY, count=FLUSH_BATCH)
    if not popped:
        return {}

    # popped is [(member, score), ...] with bytes members.
    by_type: dict[str, list[tuple[int, datetime]]] = defaultdict(list)
    for member, score in popped:
        try:
            key = member.decode("utf-8")
            type_str, id_str = key.rsplit(":", 1)
            if type_str not in IMAGE_MODEL:
                continue
            ts = datetime.fromtimestamp(float(score), tz=timezone.utc)
            by_type[type_str].append((int(id_str), ts))
        except (ValueError, UnicodeDecodeError):
            continue

    counts = {}
    for type_str, rows in by_type.items():
        model = IMAGE_MODEL[type_str]
        db.session.bulk_update_mappings(
            model,
            [{"id": image_id, "last_accessed_at": ts} for image_id, ts in rows],
        )
        counts[type_str] = len(rows)
    db.session.commit()
    return counts
