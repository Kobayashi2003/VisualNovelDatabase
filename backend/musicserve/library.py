"""Music-library lookups: vnid → audio file / cover image / tag metadata.

The library is a flat user-managed folder. A vnid like "v17" matches files
stemmed "v17" or "17" (first hit wins, audio extensions in preference order).
Covers resolve in two steps:
  1. a sibling image file with the same stem;
  2. album art embedded in the audio file (ID3 APIC, MP4 covr, FLAC picture,
     or a Vorbis METADATA_BLOCK_PICTURE comment), extracted once via mutagen
     and cached on disk keyed by the audio file's mtime.
"""

from __future__ import annotations

import base64
import os
import re
from typing import Optional, Tuple

from mutagen import File as MutagenFile
from mutagen.flac import Picture
from mutagen.mp4 import MP4Cover

from .logger import logger


# Preference order doubles as the lookup order when several formats coexist.
AUDIO_EXTS = ('.mp3', '.m4a', '.flac', '.ogg', '.opus', '.wav')
IMAGE_EXTS = ('.jpg', '.jpeg', '.png', '.webp')

AUDIO_MIME = {
    '.mp3':  'audio/mpeg',
    '.m4a':  'audio/mp4',
    '.flac': 'audio/flac',
    '.ogg':  'audio/ogg',
    '.opus': 'audio/ogg',
    '.wav':  'audio/wav',
}

IMAGE_MIME = {
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png':  'image/png',
    '.webp': 'image/webp',
}

_MIME_EXT = {
    'image/jpeg': '.jpg',
    'image/png':  '.png',
    'image/webp': '.webp',
}

_VNID_RE = re.compile(r'^v?(\d+)$')


def normalize_vnid(raw: str) -> Optional[str]:
    """Validate a client-supplied vnid and normalize to the "v123" form.
    Returns None for anything that isn't a plain (optionally v-prefixed)
    number — which also makes path traversal impossible downstream."""
    m = _VNID_RE.match(raw.strip().lower())
    return f"v{m.group(1)}" if m else None


def _find(folder: str, vnid: str, exts: Tuple[str, ...]) -> Optional[str]:
    """First existing `<folder>/<stem><ext>` over stems ("v17", "17") × exts."""
    num = vnid[1:]
    for stem in (vnid, num):
        for ext in exts:
            path = os.path.join(folder, stem + ext)
            if os.path.isfile(path):
                return path
    return None


def find_audio(folder: str, vnid: str) -> Optional[str]:
    return _find(folder, vnid, AUDIO_EXTS)


def find_cover_file(folder: str, vnid: str) -> Optional[str]:
    return _find(folder, vnid, IMAGE_EXTS)


# ---------- embedded album art ------------------------------------------------


def _embedded_picture(audio_path: str) -> Optional[Tuple[bytes, str]]:
    """Return (bytes, mime) of the first embedded cover, or None."""
    audio = MutagenFile(audio_path)
    if audio is None:
        return None

    # FLAC (and anything else exposing .pictures)
    pictures = getattr(audio, 'pictures', None)
    if pictures:
        return pictures[0].data, pictures[0].mime or 'image/jpeg'

    tags = audio.tags
    if tags is None:
        return None

    # ID3 (mp3 / wav-with-ID3 / aiff)
    if hasattr(tags, 'getall'):
        apics = tags.getall('APIC')
        if apics:
            return apics[0].data, apics[0].mime or 'image/jpeg'

    if hasattr(tags, 'get'):
        # MP4 / M4A
        covr = tags.get('covr')
        if covr:
            cover = covr[0]
            mime = 'image/png' if cover.imageformat == MP4Cover.FORMAT_PNG else 'image/jpeg'
            return bytes(cover), mime

        # Vorbis comments (ogg / opus): base64-encoded FLAC picture block
        block = tags.get('metadata_block_picture')
        if block:
            pic = Picture(base64.b64decode(block[0]))
            return pic.data, pic.mime or 'image/jpeg'

    return None


def extract_cover(audio_path: str, cache_folder: str, vnid: str) -> Optional[str]:
    """Path to the embedded-art cover for `audio_path`, extracting (and
    caching) it on first sight. The cache entry is keyed to the audio file's
    mtime: a swapped audio file invalidates the cached cover. Returns None
    when the audio has no embedded art (a zero-byte negative-cache marker
    avoids re-parsing the audio on every request)."""
    mtime = int(os.path.getmtime(audio_path))
    stem = os.path.join(cache_folder, f"{vnid}.{mtime}")

    for ext in ('.jpg', '.png', '.webp', '.none'):
        cached = stem + ext
        if os.path.isfile(cached):
            return None if ext == '.none' else cached

    os.makedirs(cache_folder, exist_ok=True)
    # Drop stale entries for this vnid (older mtimes).
    prefix = f"{vnid}."
    for name in os.listdir(cache_folder):
        if name.startswith(prefix) and not name.startswith(f"{prefix}{mtime}"):
            try:
                os.remove(os.path.join(cache_folder, name))
            except OSError:
                pass

    try:
        found = _embedded_picture(audio_path)
    except Exception as e:
        logger.warning(f"embedded-art parse failed for {audio_path}: {e}")
        found = None

    if not found or not found[0]:
        open(stem + '.none', 'wb').close()
        return None

    data, mime = found
    path = stem + _MIME_EXT.get(mime, '.jpg')
    tmp = path + '.tmp'
    with open(tmp, 'wb') as f:
        f.write(data)
    os.replace(tmp, path)
    return path


# ---------- tag metadata -------------------------------------------------------


# Per-container tag keys for title / artist / album: easy-mode (mp3/flac/ogg),
# raw ID3 frames (wav/aiff, where mutagen has no easy wrapper), and MP4 atoms.
_TAG_KEYS = {
    'title':  ('title', 'TIT2', '\xa9nam'),
    'artist': ('artist', 'TPE1', '\xa9ART'),
    'album':  ('album', 'TALB', '\xa9alb'),
}


def _first_tag(tags, keys) -> Optional[str]:
    for key in keys:
        try:
            val = tags.get(key)
        except Exception:
            val = None
        if not val:
            continue
        item = val[0] if isinstance(val, (list, tuple)) else val
        # ID3 frames stringify to their text; everything else already is text.
        text = str(item).strip()
        if text:
            return text
    return None


def read_meta(audio_path: str) -> dict:
    """Duration + basic tags (best effort; missing tags come back None)."""
    duration = None
    title = artist = album = None
    try:
        audio = MutagenFile(audio_path, easy=True)
        if audio is not None:
            if audio.info is not None:
                duration = round(float(audio.info.length), 2)
            tags = audio.tags
            if tags is not None:
                title = _first_tag(tags, _TAG_KEYS['title'])
                artist = _first_tag(tags, _TAG_KEYS['artist'])
                album = _first_tag(tags, _TAG_KEYS['album'])
    except Exception as e:
        logger.warning(f"meta parse failed for {audio_path}: {e}")
    return {
        'duration': duration,
        'title': title,
        'artist': artist,
        'album': album,
        'format': os.path.splitext(audio_path)[1].lstrip('.').lower(),
    }
