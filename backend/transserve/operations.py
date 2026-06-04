import re
from typing import Any, Iterable

from sqlalchemy import select, func
from sqlalchemy.dialects.postgresql import insert as pg_insert

from transserve import db
from .models import DictionaryEntry


class ValidationError(Exception):
    """Input-validation failure meant to be reported to the client as a 4xx."""
    error_code = "validation_error"
    message = "Invalid input."
    http_status = 400

    def __init__(self, message=None, error_code=None, http_status=None):
        if message is not None:
            self.message = message
        if error_code is not None:
            self.error_code = error_code
        if http_status is not None:
            self.http_status = http_status
        super().__init__(self.message)


def normalize_key(text: str) -> str:
    """Normalize a source word into its lookup key: trim, collapse internal
    whitespace, and lower-case. Matching is therefore case- and
    spacing-insensitive while the original form is preserved in `source_text`."""
    return re.sub(r'\s+', ' ', str(text)).strip().lower()


def _coerce_entries(entries: Iterable[dict], default_category: str | None,
                    source_lang: str, target_lang: str) -> list[dict]:
    """Validate and shape raw entry dicts into rows ready for bulk upsert.

    Each entry must provide a non-empty `source` and `target`. `category` is
    optional and falls back to `default_category`. Duplicate source keys within
    the same batch are de-duplicated (last one wins) so the upsert never tries
    to touch the same conflict target twice in one statement."""
    rows: dict[tuple, dict] = {}
    for entry in entries:
        source = (entry.get('source') or '').strip()
        target = (entry.get('target') or '').strip()
        if not source or not target:
            raise ValidationError("Each entry needs a non-empty 'source' and 'target'.")
        s_lang = (entry.get('source_lang') or source_lang).strip()
        t_lang = (entry.get('target_lang') or target_lang).strip()
        key = normalize_key(source)
        rows[(s_lang, t_lang, key)] = {
            'source_lang': s_lang,
            'target_lang': t_lang,
            'source_text': source,
            'source_key': key,
            'target_text': target,
            'category': entry.get('category') or default_category,
        }
    return list(rows.values())


def upsert_entries(entries: Iterable[dict], default_category: str | None = None,
                   source_lang: str = 'en', target_lang: str = 'ja') -> int:
    """Insert or update dictionary entries (append/merge semantics).

    Conflicts on (source_lang, target_lang, source_key) update the translation,
    display form and category in place. Returns the number of rows submitted."""
    rows = _coerce_entries(entries, default_category, source_lang, target_lang)
    if not rows:
        return 0

    stmt = pg_insert(DictionaryEntry).values(rows)
    stmt = stmt.on_conflict_do_update(
        constraint='uq_dictionary_langs_key',
        set_={
            'source_text': stmt.excluded.source_text,
            'target_text': stmt.excluded.target_text,
            'category': stmt.excluded.category,
            'updated_at': func.now(),
        },
    )
    db.session.execute(stmt)
    db.session.commit()
    return len(rows)


def init_dictionary(entries: Iterable[dict], default_category: str | None = None,
                    source_lang: str = 'en', target_lang: str = 'ja',
                    replace: bool = False) -> int:
    """Initialize the dictionary from a batch of entries.

    With `replace=True` the existing rows for the (source_lang, target_lang)
    pair are cleared first, so the dictionary becomes exactly the provided set.
    Otherwise this behaves like `upsert_entries` (merge into what's there)."""
    if replace:
        (db.session.query(DictionaryEntry)
         .filter(DictionaryEntry.source_lang == source_lang)
         .filter(DictionaryEntry.target_lang == target_lang)
         .delete(synchronize_session=False))
        db.session.commit()
    return upsert_entries(entries, default_category, source_lang, target_lang)


def lookup(word: str, source_lang: str = 'en', target_lang: str = 'ja') -> str | None:
    """Return the target translation for a single source word, or None."""
    key = normalize_key(word)
    if not key:
        return None
    row = db.session.execute(
        select(DictionaryEntry.target_text)
        .where(DictionaryEntry.source_lang == source_lang)
        .where(DictionaryEntry.target_lang == target_lang)
        .where(DictionaryEntry.source_key == key)
    ).first()
    return row[0] if row else None


def lookup_batch(words: Iterable[str], source_lang: str = 'en',
                 target_lang: str = 'ja') -> dict[str, str | None]:
    """Look up several words at once. Returns a map keyed by the *original*
    input words; an unknown word maps to None. One query for the whole batch."""
    originals = list(words)
    keys = {normalize_key(w): w for w in originals if normalize_key(w)}
    found: dict[str, str] = {}
    if keys:
        rows = db.session.execute(
            select(DictionaryEntry.source_key, DictionaryEntry.target_text)
            .where(DictionaryEntry.source_lang == source_lang)
            .where(DictionaryEntry.target_lang == target_lang)
            .where(DictionaryEntry.source_key.in_(list(keys.keys())))
        ).all()
        found = {row[0]: row[1] for row in rows}
    return {w: found.get(normalize_key(w)) for w in originals}


def get_entry(word: str, source_lang: str = 'en', target_lang: str = 'ja') -> DictionaryEntry | None:
    key = normalize_key(word)
    if not key:
        return None
    return (db.session.query(DictionaryEntry)
            .filter(DictionaryEntry.source_lang == source_lang)
            .filter(DictionaryEntry.target_lang == target_lang)
            .filter(DictionaryEntry.source_key == key)
            .first())


def list_entries(source_lang: str = 'en', target_lang: str = 'ja',
                 category: str | None = None, search: str | None = None,
                 page: int = 1, limit: int = 50) -> dict[str, Any]:
    """Paginated listing of dictionary entries with optional category/search."""
    query = (db.session.query(DictionaryEntry)
             .filter(DictionaryEntry.source_lang == source_lang)
             .filter(DictionaryEntry.target_lang == target_lang))
    if category:
        query = query.filter(DictionaryEntry.category == category)
    if search:
        like = f"%{normalize_key(search)}%"
        query = query.filter(DictionaryEntry.source_key.ilike(like))

    total = query.count()
    page = max(1, page)
    limit = min(max(1, limit), 200)
    items = (query.order_by(DictionaryEntry.source_key)
             .offset((page - 1) * limit).limit(limit).all())
    return {
        'results': [dict(item) for item in items],
        'count': total,
        'page': page,
        'limit': limit,
    }


def count_entries(source_lang: str | None = None, target_lang: str | None = None) -> int:
    query = db.session.query(DictionaryEntry)
    if source_lang:
        query = query.filter(DictionaryEntry.source_lang == source_lang)
    if target_lang:
        query = query.filter(DictionaryEntry.target_lang == target_lang)
    return query.count()


def delete_entry(word: str, source_lang: str = 'en', target_lang: str = 'ja') -> bool:
    item = get_entry(word, source_lang, target_lang)
    if not item:
        return False
    db.session.delete(item)
    db.session.commit()
    return True
