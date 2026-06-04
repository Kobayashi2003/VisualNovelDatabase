"""Translation service.

Two capabilities live behind this service:

  1. Dictionary  — a persistent word/phrase lookup backed by Postgres. This is
     fully implemented: `lookup`, `lookup_batch`, plus `init_dictionary` /
     `append` for loading data. It is what currently translates VNDB tag and
     trait names from English to Japanese.

  2. Text translation (`translate_text`) — the reserved, not-yet-implemented
     interface for translating arbitrary input text (English → Japanese). The
     method signature and route are in place so callers can be wired up now;
     the implementation (an MT backend) is intentionally deferred. Calling it
     raises `TranslationNotImplemented`.
"""

from typing import Iterable
from flask import current_app

from . import operations


class TranslationNotImplemented(NotImplementedError):
    """Raised by the reserved text-translation interface until it is built."""


class TranslationService:
    def __init__(self, source_lang: str | None = None, target_lang: str | None = None):
        self.source_lang = source_lang or current_app.config.get('SOURCE_LANG', 'en')
        self.target_lang = target_lang or current_app.config.get('TARGET_LANG', 'ja')

    # ------------------------------------------------------------------
    # Dictionary (implemented)
    # ------------------------------------------------------------------

    def lookup(self, word: str) -> str | None:
        """Translate one source word via the local dictionary, or None."""
        return operations.lookup(word, self.source_lang, self.target_lang)

    def lookup_batch(self, words: Iterable[str]) -> dict[str, str | None]:
        """Translate several source words at once via the local dictionary."""
        return operations.lookup_batch(words, self.source_lang, self.target_lang)

    def init_dictionary(self, entries: Iterable[dict], default_category: str | None = None,
                        replace: bool = False) -> int:
        """Initialize the dictionary from `entries`. With `replace=True` the
        existing entries for this language pair are cleared first."""
        return operations.init_dictionary(
            entries, default_category, self.source_lang, self.target_lang, replace)

    def append(self, entries: Iterable[dict], default_category: str | None = None) -> int:
        """Append/merge `entries` into the dictionary (upsert by source word)."""
        return operations.upsert_entries(
            entries, default_category, self.source_lang, self.target_lang)

    def count(self) -> int:
        return operations.count_entries(self.source_lang, self.target_lang)

    # ------------------------------------------------------------------
    # Text translation (reserved — not implemented yet)
    # ------------------------------------------------------------------

    def translate_text(self, text: str) -> str:
        """Reserved interface: translate arbitrary input text (English →
        Japanese). Not implemented yet — a machine-translation backend will be
        wired in here later. The signature and route exist so clients can be
        built against the contract now.
        """
        raise TranslationNotImplemented(
            "Text translation is not implemented yet; only dictionary lookup is available."
        )
