import time
from typing import Any

from vndb import db
from vndb.database import MODEL_MAP, update as db_update, create as db_create, exists as db_exists, updatable as db_updatable
from vndb.search.remote.search import api, VNDBEndpoint
from vndb.search.remote.fields import get_remote_fields
from vndb.search.common import convert_remote_to_local


def batch_query_remote(resource_type: str, ids: list[str],
                       fields: list[str] | None = None,
                       response_size: str = 'large',
                       batch_size: int = 100,
                       delay: float = 2) -> dict[str, dict[str, Any]]:
    """
    Batch query VNDB remote API for given IDs.

    Args:
        resource_type: Resource type (vn, character, release, producer, staff, tag, trait)
        ids: List of formatted IDs (e.g. ['v1', 'v2', ...])
        fields: Remote API field names to request. If None, uses get_remote_fields(response_size).
        response_size: 'small' or 'large', used when fields is None.
        batch_size: Number of IDs per API request (clamped to max 100).
        delay: Seconds to sleep between batches.

    Returns:
        Dict mapping id -> remote API response data.
    """
    if not ids:
        return {}

    if fields is None:
        fields = get_remote_fields(resource_type, response_size)

    batch_size = min(batch_size, 100)
    endpoint = VNDBEndpoint(resource_type)
    results = {}

    for i in range(0, len(ids), batch_size):
        batch = ids[i:i + batch_size]

        if len(batch) == 1:
            filters = ["id", "=", batch[0]]
        else:
            filters = ["or"] + [["id", "=", id_] for id_ in batch]

        try:
            response = api.query(
                endpoint=endpoint,
                filters=filters,
                fields=fields,
                results=batch_size,
                count=False
            )
            for item in response.get('results', []):
                results[item['id']] = item
        except Exception as e:
            print(f"Error querying {resource_type} batch {i // batch_size + 1}: {e}")

        if i + batch_size < len(ids):
            time.sleep(delay)

    return results


def backfill_column(resource_type: str, column: str,
                    remote_fields: list[str] | None = None,
                    batch_size: int = 100,
                    delay: float = 2) -> dict[str, bool]:
    """
    For existing DB records where `column` is NULL,
    batch query remote API and fill in the column.

    Args:
        resource_type: Resource type (vn, character, release, producer, staff, tag, trait)
        column: Local DB column name to backfill.
        remote_fields: Remote API field names to request. If None, uses [column].
        batch_size: Number of IDs per API request (max 100).
        delay: Seconds to sleep between batches.

    Returns:
        Dict mapping id -> success boolean.
    """
    model = MODEL_MAP[resource_type]

    col_attr = getattr(model, column, None)
    if col_attr is None:
        raise ValueError(f"Column '{column}' not found on model for '{resource_type}'")

    records = (
        db.session.query(model.id)
        .filter(model.deleted_at == None)
        .filter(col_attr == None)
        .all()
    )
    ids = [r.id for r in records]

    if not ids:
        print(f"No records with NULL '{column}' found for {resource_type}")
        return {}

    print(f"Found {len(ids)} records with NULL '{column}' for {resource_type}")

    if remote_fields is None:
        remote_fields = [column]

    remote_data = batch_query_remote(
        resource_type=resource_type,
        ids=ids,
        fields=remote_fields,
        batch_size=batch_size,
        delay=delay
    )

    results = {}
    for id_ in ids:
        if id_ in remote_data:
            value = remote_data[id_].get(column)
            if value is not None:
                results[id_] = db_update(resource_type, id_, {column: value}) is not None
            else:
                results[id_] = False
        else:
            results[id_] = False

    succeeded = sum(1 for v in results.values() if v)
    print(f"Backfill complete: {succeeded}/{len(ids)} records updated")

    return results


def batch_fetch_update(resource_type: str, ids: list[str],
                       response_size: str = 'large',
                       batch_size: int = 100,
                       delay: float = 2) -> tuple[dict[str, bool], dict[str, bool]]:
    """
    Batch fetch from remote API and create/update local records.

    Args:
        resource_type: Resource type (vn, character, release, producer, staff, tag, trait)
        ids: List of formatted IDs to fetch.
        response_size: 'small' or 'large' field set.
        batch_size: Number of IDs per API request (max 100).
        delay: Seconds to sleep between batches.

    Returns:
        (created, updated): Dicts mapping id -> success boolean.
    """
    remote_data = batch_query_remote(
        resource_type=resource_type,
        ids=ids,
        response_size=response_size,
        batch_size=batch_size,
        delay=delay
    )

    created = {}
    updated = {}

    for id_ in ids:
        if id_ not in remote_data:
            continue
        try:
            data = convert_remote_to_local(resource_type, remote_data[id_])
            if not db_exists(resource_type, id_):
                created[id_] = db_create(resource_type, id_, data) is not None
            elif db_updatable(resource_type, id_):
                updated[id_] = db_update(resource_type, id_, data) is not None
        except Exception as e:
            print(f"Error processing {resource_type} {id_}: {e}")

    return created, updated
