import time
from typing import Any

import httpx

from vndb import db
from vndb.database import MODEL_MAP, update as db_update
from vndb.search.remote.search import api, VNDBEndpoint

_RETRY_DELAYS = [30, 60, 120]  # seconds to wait on successive 429 responses


def _query_with_retry(endpoint: VNDBEndpoint, filters: list, fields: list[str], batch_size: int) -> list[dict]:
    """Execute one API batch request, retrying up to 3 times on 429 rate-limit responses."""
    for attempt, retry_wait in enumerate([0] + _RETRY_DELAYS):
        if retry_wait:
            print(f"Rate limited (429). Waiting {retry_wait}s before retry {attempt}/{len(_RETRY_DELAYS)}...")
            time.sleep(retry_wait)
        try:
            response = api.query(
                endpoint=endpoint,
                filters=filters,
                fields=fields,
                results=batch_size,
                count=False
            )
            return response.get('results', [])
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429 and attempt < len(_RETRY_DELAYS):
                continue
            raise
    return []


def batch_query_remote(resource_type: str, ids: list[str],
                       fields: list[str],
                       batch_size: int = 100,
                       delay: float = 2.0) -> dict[str, dict[str, Any]]:
    """Batch query VNDB API by IDs, returning {id: data}."""
    if not ids:
        return {}

    batch_size = min(batch_size, 100)
    endpoint = VNDBEndpoint(resource_type)
    results: dict[str, dict[str, Any]] = {}

    for i in range(0, len(ids), batch_size):
        batch = ids[i:i + batch_size]
        filters = ["id", "=", batch[0]] if len(batch) == 1 else ["or"] + [["id", "=", id_] for id_ in batch]

        try:
            for item in _query_with_retry(endpoint, filters, fields, batch_size):
                results[item['id']] = item
        except Exception as e:
            print(f"Error querying {resource_type} batch {i // batch_size + 1}: {e}")

        if i + batch_size < len(ids):
            time.sleep(delay)

    return results


def backfill_column(resource_type: str, column: str,
                    remote_fields: list[str],
                    batch_size: int = 100,
                    delay: float = 2.0) -> dict[str, bool]:
    """
    For existing DB records where `column` is NULL, fetch `remote_fields` from
    the VNDB API and write the value of `column` back to the local DB.
    """
    model = MODEL_MAP[resource_type]
    col_attr = getattr(model, column, None)
    if col_attr is None:
        raise ValueError(f"Column '{column}' not found on model for '{resource_type}'")

    ids = [r.id for r in (
        db.session.query(model.id)
        .filter(model.deleted_at == None)
        .filter(col_attr == None)
        .all()
    )]

    if not ids:
        print(f"No records with NULL '{column}' for {resource_type}")
        return {}

    print(f"Backfilling '{column}' for {len(ids)} {resource_type} record(s)...")

    remote_data = batch_query_remote(
        resource_type=resource_type,
        ids=ids,
        fields=remote_fields,
        batch_size=batch_size,
        delay=delay
    )

    results: dict[str, bool] = {}
    for id_ in ids:
        if id_ in remote_data:
            value = remote_data[id_].get(column)
            results[id_] = db_update(resource_type, id_, {column: value}) is not None if value is not None else False
        else:
            results[id_] = False

    succeeded = sum(1 for v in results.values() if v)
    print(f"Done: {succeeded}/{len(ids)} records updated")
    return results
