import time
from enum import Enum, auto
from typing import Any, Callable

import httpx
from sqlalchemy import inspect as sa_inspect
from sqlalchemy.dialects.postgresql import JSONB as PgJSONB, ARRAY as PgARRAY

from vndb.database import update as db_update, get as db_get
from vndb.database.models import MODEL_MAP
from vndb.search.local.search import search as local_search
from vndb.search.remote.search import (
    unpaginated_search,
    search_vn, search_character, search_release,
    search_producer, search_staff, search_tag, search_trait,
)
from vndb.search.remote.fields import get_remote_fields
from vndb.search.remote.filters import VNDBFilters, build_filters

# ─── Constants ────────────────────────────────────────────────────────────────

_DEFAULT_BATCH_SIZE     = 100
_DEFAULT_DELAY          = 2.0            # seconds between batch requests
_DEFAULT_OVERWRITE_NULL = False          # whether to write a null value obtained from a successful fetch
_RETRY_DELAYS           = [30, 60, 120]  # seconds to wait on successive 429 responses
TEST                    = False          # when True, log DB writes instead of executing them

_SEARCH_FUNCTIONS: dict[str, Callable] = {
    'vn':        search_vn,
    'character': search_character,
    'release':   search_release,
    'producer':  search_producer,
    'staff':     search_staff,
    'tag':       search_tag,
    'trait':     search_trait,
}

# ─── Private helpers ──────────────────────────────────────────────────────────

class _ColKind(Enum):
    SCALAR      = auto()  # String, Integer, Float, Boolean, Text, ARRAY(String/Integer/…)
    JSONB       = auto()  # JSONB — supports dotted-path partial merge
    ARRAY_JSONB = auto()  # ARRAY(JSONB)


def _nested_get(obj: Any, path: list[str]) -> Any:
    """Navigate nested dicts following a key path. Returns None if any step is missing."""
    for key in path:
        if not isinstance(obj, dict):
            return None
        obj = obj.get(key)
    return obj


def _set_nested(obj: dict, path: list[str], value: Any) -> dict:
    """Return a shallow-merged copy of obj with the key path set to value."""
    if len(path) == 1:
        return {**obj, path[0]: value}
    return {**obj, path[0]: _set_nested(obj.get(path[0]) or {}, path[1:], value)}


def _col_kind(resource_type: str, column_name: str) -> _ColKind:
    """Resolve the _ColKind for a column, raising ValueError if it doesn't exist."""
    model = MODEL_MAP.get(resource_type)
    if model is None:
        raise ValueError(f"Unknown resource type: {resource_type!r}")
    try:
        col_type = sa_inspect(model).columns[column_name].type
    except KeyError:
        raise ValueError(f"'{resource_type}' has no column '{column_name}'")
    if isinstance(col_type, PgARRAY):
        return _ColKind.ARRAY_JSONB if isinstance(col_type.item_type, PgJSONB) else _ColKind.SCALAR
    if isinstance(col_type, PgJSONB):
        return _ColKind.JSONB
    return _ColKind.SCALAR


def _resolve_field(resource_type: str, field: str) -> tuple[str, str, _ColKind]:
    """
    Parse and validate a field path against the model.
    Returns (column_name, json_tail, kind).
    Raises ValueError for unknown columns or dotted paths on non-JSONB columns.
    """
    column, _, json_tail = field.partition(".")
    kind = _col_kind(resource_type, column)
    if json_tail and kind is not _ColKind.JSONB:
        raise ValueError(
            f"Dotted path '{field}' is invalid: '{column}' is {kind.name}, only JSONB supports sub-key writes"
        )
    return column, json_tail, kind


def _build_db_write(
    resource_type: str,
    id_: str,
    column: str,
    json_tail: str,
    kind: _ColKind,
    value: Any,
) -> dict[str, Any]:
    """Build the data dict for db_update, with type validation."""
    if value is not None and not json_tail:
        if kind is _ColKind.ARRAY_JSONB and not isinstance(value, list):
            raise TypeError(f"Expected list for ARRAY_JSONB, got {type(value).__name__}")
        elif kind is _ColKind.JSONB and not isinstance(value, dict):
            raise TypeError(f"Expected dict for JSONB, got {type(value).__name__}")
    if not json_tail:
        return {column: value}
    current_record = db_get(resource_type, id_)
    current_jsonb  = (getattr(current_record, column, None) or {}) if current_record else {}
    return {column: _set_nested(current_jsonb, json_tail.split("."), value)}


def _id_filter_batches(resource_type: str, batch_size: int) -> tuple[list[list], int]:
    """Return all active records as batched VNDB ID filters and their total count."""
    result = unpaginated_search(local_search, resource_type=resource_type, params={}, response_size='small', limit=100, count=False)
    ids = [r['id'] for r in result['results']]
    filter_set = getattr(VNDBFilters, resource_type.upper())
    batches = [ids[i:i+batch_size] for i in range(0, len(ids), batch_size)]
    return [
        build_filters(filter_set, {"id": b[0]}) if len(b) == 1
        else build_filters(filter_set, {"or": [{"id": id_} for id_ in b]})
        for b in batches
    ], len(ids)


def _with_retry(fn: Callable, **kwargs) -> dict:
    last_exc = None
    for wait in [0, *_RETRY_DELAYS]:
        if wait:
            time.sleep(wait)
        try:
            return fn(**kwargs)
        except httpx.HTTPStatusError as e:
            if e.response.status_code != 429:
                raise
            last_exc = e
    raise last_exc


def _fetch_remote(
    resource_type: str,
    id_filters: list[list],
    fields: list[str],
    delay: float = _DEFAULT_DELAY,
) -> dict[str, dict[str, Any]]:
    """Fetch records from the VNDB API for pre-built ID filter batches. Returns {id: record}."""
    search_fn = _SEARCH_FUNCTIONS[resource_type]
    results: dict[str, dict[str, Any]] = {}

    for i, id_filter in enumerate(id_filters):
        if i:
            time.sleep(delay)
        try:
            response = _with_retry(search_fn, filters=id_filter, fields=fields, results=_DEFAULT_BATCH_SIZE, count=False)
            for item in response.get("results", []):
                results[item["id"]] = item
        except Exception as e:
            print(f"  fetch failed: {e}")

    return results


def _apply_remote(
    resource_type: str,
    field: str,
    column: str,
    json_tail: str,
    kind: _ColKind,
    remote: dict[str, dict[str, Any]],
    total: int,
    extract: Callable[[dict], Any],
    overwrite_null: bool,
) -> tuple[int, int]:
    """Write fetched remote values to the local DB. Returns (updated, total)."""
    updated = 0
    for id_, record in remote.items():
        value = extract(record)
        if value is None and not overwrite_null:
            continue
        try:
            write = _build_db_write(resource_type, id_, column, json_tail, kind, value)
        except TypeError as e:
            print(f"  type error {resource_type}/{id_} '{field}': {e}")
            continue
        if TEST:
            print(f"  [TEST] {resource_type}/{id_} {field} = {value!r}")
            updated += 1
        elif db_update(resource_type, id_, write) is not None:
            updated += 1
    print(f"[backfill] Done — {updated}/{total} updated.")
    return updated, total


# ─── Public API ───────────────────────────────────────────────────────────────

def backfill_column(
    resource_type: str,
    field: str,
    extract: Callable[[dict], Any] | None = None,
    overwrite_null: bool = _DEFAULT_OVERWRITE_NULL,
    batch_size: int = _DEFAULT_BATCH_SIZE,
    delay: float = _DEFAULT_DELAY,
) -> tuple[int, int]:
    """
    Re-fetch a field from the VNDB API for every active record and overwrite the local value.

    Parameters
    ----------
    resource_type   One of 'vn', 'release', 'character', 'producer', 'staff', 'tag', 'trait'.
    field           VNDBFields path string, e.g. ``VNDBFields.Staff.GENDER`` (``"gender"``) or
                    ``VNDBFields.VN.IMAGE.SEXUAL`` (``"image.sexual"``).
                    A plain name overwrites the column directly (scalar, ARRAY, or full JSONB).
                    A dotted path (only valid on JSONB columns) triggers a partial-merge write.
    extract         ``(remote_record) -> value``. Defaults to navigating the field path in
                    the remote record.
    overwrite_null  If True, write a null value returned by a successful fetch.
                    Records that failed to fetch are never written. Default False.
    batch_size      Records per API request (max 100).
    delay           Seconds to sleep between batch requests.

    Returns (updated, total).
    """
    column, json_tail, kind = _resolve_field(resource_type, field)  # validates early

    id_filters, total = _id_filter_batches(resource_type, batch_size)
    if not total:
        print(f"[backfill] '{resource_type}.{field}' — no active records.")
        return 0, 0

    fields = get_remote_fields(resource_type, 'large')
    remote = _fetch_remote(resource_type, id_filters, fields, delay=delay)
    _path = field.split(".")
    _extract = extract if extract is not None else (lambda r: _nested_get(r, _path))
    return _apply_remote(resource_type, field, column, json_tail, kind, remote, total, _extract, overwrite_null)
