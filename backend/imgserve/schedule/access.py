"""Periodic flush of the request-hot Redis access ZSET to Postgres.

Cache hits ZADD into a Redis ZSET (constant memory: one entry per distinct
image since last flush), and this job drains the ZSET into the rows'
last_accessed_at column. Keeps the hot path off the database while still
preserving an LRU-ordering signal for any future eviction policy."""

from imgserve import scheduler
from imgserve.utils import flush_access


@scheduler.task(
    trigger='cron',
    id='imgserve_access_flush',
    minute='*/5',
    max_instances=1,
    coalesce=True,
)
def flush_access_schedule():
    counts = flush_access()
    if counts:
        print(f"[ImgServe] access flush: {counts}")
