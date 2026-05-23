"""Redis-backed single-flight: when N callers ask for the same key
concurrently, exactly one does the work, the rest wait and re-check.

Used by the GET image handler so a stampede of requests for the same
not-yet-cached image collapses into a single upstream fetch."""

import time
from typing import Callable

from imgserve import redis_client


def with_single_flight(
    key: str,
    work_fn: Callable[[], bool],
    post_check: Callable[[], bool],
    *,
    wait_timeout: float = 15.0,
    lock_ttl: int = 60,
    poll_interval: float = 0.25,
) -> bool:
    """Coalesce concurrent invocations on `key`.

    The first arrival wins the lock and runs `work_fn`; everyone else waits
    for the pub/sub completion signal (or `post_check` going truthy, which
    covers the case where the publish happened before they subscribed).

    `work_fn`: actually does the work; returns success bool.
    `post_check`: cheap re-check (e.g. "file now on disk?"). Called by waiters
        on entry, after timed-out polls, and by the worker before doing work
        (so a duplicate fetch isn't done if someone else just finished).
    Returns True iff the post-condition holds (work succeeded, or someone
    else's work succeeded). False on timeout / failure.
    """
    lock_key = f"imgserve:inflight:{key}"
    channel = f"imgserve:inflight:{key}:done"

    got_lock = redis_client.set(lock_key, b"1", nx=True, ex=lock_ttl)

    if got_lock:
        try:
            # Someone may have finished between our miss check and acquiring
            # the lock; re-check so we don't redo the work.
            if post_check():
                redis_client.publish(channel, b"ok")
                return True
            success = bool(work_fn())
            redis_client.publish(channel, b"ok" if success else b"fail")
            return success
        finally:
            redis_client.delete(lock_key)

    # Lost the race — wait for the worker to publish, while polling
    # post_check in case the publish slipped past our subscribe.
    if post_check():
        return True

    pubsub = redis_client.pubsub(ignore_subscribe_messages=True)
    try:
        pubsub.subscribe(channel)
        deadline = time.monotonic() + wait_timeout
        # Check once more after subscribing — the publish might have happened
        # between our last post_check and subscribe().
        if post_check():
            return True
        while time.monotonic() < deadline:
            remaining = deadline - time.monotonic()
            msg = pubsub.get_message(timeout=min(poll_interval, max(remaining, 0)))
            if msg is None:
                # Periodic re-check as a belt-and-braces guard against
                # missed pub/sub deliveries (rare but possible on reconnect).
                if post_check():
                    return True
                continue
            # Worker published — re-check the on-disk truth rather than
            # trusting the payload, since the work could have failed.
            return post_check()
        return post_check()
    finally:
        try:
            pubsub.close()
        except Exception:
            pass
