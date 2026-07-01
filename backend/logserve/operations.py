"""Query / mutation helpers over the `logs` table for the logserve API.

Thin data-access layer: routes stay declarative and all SQLAlchemy lives here.
Raises ValidationError (mapped to HTTP 400 in routes) for bad caller input.
"""

import uuid
from datetime import datetime

from sqlalchemy import func

from logserve import db
from .models import LogEntry


class ValidationError(Exception):
    def __init__(self, message, error_code='validation_error', http_status=400):
        super().__init__(message)
        self.message = message
        self.error_code = error_code
        self.http_status = http_status


SORT_FIELDS = {'timestamp', 'level', 'message'}
MAX_LIMIT = 500


def _parse_dt(value, field):
    """Parse an ISO-8601 timestamp from a query param; None passes through."""
    if value is None or value == '':
        return None
    try:
        return datetime.fromisoformat(value)
    except (TypeError, ValueError):
        raise ValidationError(f"'{field}' must be an ISO-8601 datetime (got {value!r}).")


def _apply_filters(query, *, level=None, source=None, resource_type=None,
                   search=None, start=None, end=None):
    if level:
        query = query.filter(LogEntry.level == level)
    if source:
        # `from` is a JSONB key; ->> extracts it as text for equality.
        query = query.filter(LogEntry.details['from'].astext == source)
    if resource_type:
        query = query.filter(LogEntry.details['resource_type'].astext == resource_type)
    if search:
        query = query.filter(LogEntry.message.ilike(f'%{search}%'))
    if start is not None:
        query = query.filter(LogEntry.timestamp >= start)
    if end is not None:
        query = query.filter(LogEntry.timestamp <= end)
    return query


def list_logs(*, level=None, source=None, resource_type=None, search=None,
              start=None, end=None, page=1, limit=50,
              sort='timestamp', reverse=True):
    """Paginated, filtered listing (newest first by default)."""
    start = _parse_dt(start, 'start')
    end = _parse_dt(end, 'end')

    query = _apply_filters(
        LogEntry.query,
        level=level, source=source, resource_type=resource_type,
        search=search, start=start, end=end,
    )

    total = query.count()

    sort = sort if sort in SORT_FIELDS else 'timestamp'
    sort_col = getattr(LogEntry, sort)
    query = query.order_by(sort_col.desc() if reverse else sort_col.asc())

    page = max(1, int(page))
    limit = min(max(1, int(limit)), MAX_LIMIT)
    entries = query.offset((page - 1) * limit).limit(limit).all()

    return {
        'results': [e.serialize(include_details=False) for e in entries],
        'total': total,
        'page': page,
        'limit': limit,
        'pages': (total + limit - 1) // limit if limit else 0,
    }


def get_log(log_id):
    return db.session.get(LogEntry, log_id)


def create_log(level, message, details=None):
    """Insert a manual entry — handy for exercising the pipeline or annotating
    a debugging session."""
    if not level or not message:
        raise ValidationError("Both 'level' and 'message' are required.")
    if details is not None and not isinstance(details, dict):
        raise ValidationError("'details' must be an object.")
    entry = LogEntry(
        id=str(uuid.uuid4()),
        level=level,
        message=message,
        details=details,
    )
    db.session.add(entry)
    db.session.commit()
    return entry


def delete_log(log_id):
    entry = db.session.get(LogEntry, log_id)
    if entry is None:
        return False
    db.session.delete(entry)
    db.session.commit()
    return True


def bulk_delete(*, ids=None, level=None, source=None, resource_type=None,
                search=None, start=None, end=None, all=False):
    """Delete by id list OR by the same filters as list_logs().

    Guardrail: at least one selector (ids / a filter) must be given, unless
    `all=True` is passed explicitly — so an empty body can't wipe the table.
    """
    if ids:
        deleted = LogEntry.query.filter(LogEntry.id.in_(ids)).delete(synchronize_session=False)
        db.session.commit()
        return deleted

    has_filter = any([level, source, resource_type, search, start, end])
    if not has_filter and not all:
        raise ValidationError(
            "Refusing to delete without a selector. Provide 'ids', at least one "
            "filter (level/source/resource_type/search/start/end), or 'all': true."
        )

    start = _parse_dt(start, 'start')
    end = _parse_dt(end, 'end')
    query = _apply_filters(
        LogEntry.query,
        level=level, source=source, resource_type=resource_type,
        search=search, start=start, end=end,
    )
    deleted = query.delete(synchronize_session=False)
    db.session.commit()
    return deleted


def stats():
    """Aggregate counts for a dashboard-style overview."""
    total = db.session.query(func.count(LogEntry.id)).scalar()
    # Coerce group keys to strings: a missing level or a missing details.from
    # comes back as SQL NULL -> Python None, and jsonify sorts dict keys (None
    # can't be ordered against str). 'unknown' stands in for those.
    by_level = {
        (level or 'unknown'): count
        for level, count in db.session.query(LogEntry.level, func.count())
        .group_by(LogEntry.level).all()
    }
    by_source = {
        (source or 'unknown'): count
        for source, count in db.session.query(LogEntry.details['from'].astext, func.count())
        .group_by(LogEntry.details['from'].astext).all()
    }
    latest = db.session.query(func.max(LogEntry.timestamp)).scalar()
    return {
        'total': total,
        'by_level': by_level,
        'by_source': by_source,
        'latest': latest.isoformat() if latest else None,
    }
