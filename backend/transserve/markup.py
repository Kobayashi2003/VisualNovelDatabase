"""VNDB description markup helpers.

VNDB descriptions are written in a small BBCode-like markup (see the frontend's
`BBCodeText` renderer, which is the source of truth for how they display):

  - paired formatting tags: ``[b] [i] [s] [spoiler]``
  - links: ``[url=HREF]text[/url]`` (HREF must NOT be translated; the inner text
    is) — note VNDB stores both ``[url=...]`` and ``[URL=...]`` casings
  - literal blocks: ``[raw]...[/raw]`` (content is shown verbatim, never translated)
  - bare database references such as ``g749`` / ``i3137`` / ``v17`` that VNDB
    auto-links — these are identifiers and must survive translation unchanged.

When we store a *translated* description in the passage translation memory, every
one of these "semantic tokens" must appear in the translation exactly as in the
source (only the human-readable text around them changes). This module extracts
those tokens so the ingest path can reject a translation that dropped, added or
accidentally translated one — directly guarding the "tags must not be translated"
invariant. The same token model is what a future masked-MT path would build on.
"""

import re

# Opening/closing BBCode tags. Tag name is matched case-insensitively; for url
# the href is captured so it participates in the token identity (the link target
# must be preserved verbatim).
_TAG_RE = re.compile(r'\[(/?)(url|b|i|s|spoiler|raw)(=[^\]]*)?\]', re.IGNORECASE)

# Bare VNDB database references (auto-linked identifiers): a type letter followed
# by digits, e.g. g749, i3137, v17, c45, r3, p12, s8, d2. A trailing ``.N`` (doc
# sections like d2.3) is kept as part of the token. Word-bounded so it doesn't
# fire inside larger alphanumerics.
_ID_RE = re.compile(r'\b([gicrpsvdw]\d+(?:\.\d+)?)\b')


def _normalize_token(opening: str, name: str, arg: str | None) -> str:
    """Canonical form of one BBCode tag token: lower-case tag name, '/' kept for
    closers, href (if any) preserved exactly so the link target is part of the
    identity. e.g. ``[URL=https://x]`` -> ``[url=https://x]``, ``[/B]`` -> ``[/b]``."""
    return f"[{opening}{name.lower()}{arg or ''}]"


def protected_tokens(text: str) -> list[str]:
    """Return the multiset (as a sorted list) of semantic tokens in `text`:
    every BBCode tag (normalized) plus every bare database id reference. Order is
    discarded because translation legitimately reorders text (and the tokens
    embedded in it); identity is "same tokens, same counts"."""
    if not text:
        return []
    tokens: list[str] = [
        _normalize_token(m.group(1), m.group(2), m.group(3))
        for m in _TAG_RE.finditer(text)
    ]
    tokens.extend(m.group(1) for m in _ID_RE.finditer(text))
    tokens.sort()
    return tokens


def validate_markup_preserved(source: str, target: str) -> tuple[bool, str | None]:
    """Check that `target` preserves exactly the semantic tokens of `source`.

    Returns (ok, message). On mismatch the message names what diverged (missing
    or extra tokens), so the ingest path can surface a precise error instead of
    silently storing a translation that mangled a link or an id reference."""
    src = protected_tokens(source)
    tgt = protected_tokens(target)
    if src == tgt:
        return True, None

    from collections import Counter
    cs, ct = Counter(src), Counter(tgt)
    missing = list((cs - ct).elements())   # in source, lost in translation
    extra = list((ct - cs).elements())     # invented by the translation
    parts = []
    if missing:
        parts.append(f"missing token(s): {missing}")
    if extra:
        parts.append(f"unexpected token(s): {extra}")
    return False, "; ".join(parts)
