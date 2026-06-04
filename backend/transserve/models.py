from typing import Union

from sqlalchemy import Column, Integer, String, Text, DateTime, UniqueConstraint, Index
from sqlalchemy.sql import func

from transserve import db


class DictionaryEntry(db.Model):
    """A single source-word → target-word translation pair.

    The dictionary is intentionally generic (any `source_lang` → `target_lang`
    pair), but is seeded for English → Japanese and currently used to translate
    VNDB tag / trait names. Lookups are case/space-insensitive: every entry
    stores a normalized `source_key` (lower-cased, whitespace-collapsed) which
    is what queries and the uniqueness constraint key on, while `source_text`
    keeps the original display form.
    """

    __tablename__ = 'dictionary'

    id = Column(Integer, primary_key=True)
    source_lang = Column(String(8), nullable=False, default='en')
    target_lang = Column(String(8), nullable=False, default='ja')
    source_text = Column(String(512), nullable=False)   # original/display form
    source_key = Column(String(512), nullable=False)    # normalized lookup key
    target_text = Column(Text, nullable=False)          # translation
    # Provenance of the entry: 'tag' | 'trait' | 'general' | ... Lets a later
    # re-seed touch only its own rows and lets clients group results.
    category = Column(String(32), nullable=True)

    created_at = Column(DateTime(timezone=True), default=func.now())
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint('source_lang', 'target_lang', 'source_key',
                         name='uq_dictionary_langs_key'),
        Index('ix_dictionary_lookup', 'source_lang', 'target_lang', 'source_key'),
    )

    def __iter__(self):
        yield 'id', self.id
        yield 'source_lang', self.source_lang
        yield 'target_lang', self.target_lang
        yield 'source', self.source_text
        yield 'target', self.target_text
        yield 'category', self.category
        yield 'created_at', self.created_at.isoformat() if self.created_at else None
        yield 'updated_at', self.updated_at.isoformat() if self.updated_at else None

    def __repr__(self):
        return (f"DictionaryEntry(id={self.id!r}, {self.source_lang}->{self.target_lang}, "
                f"source={self.source_text!r}, target={self.target_text!r})")


ModelType = Union[DictionaryEntry]

MODEL_MAP = {
    'dictionary': DictionaryEntry,
}
