from flask import Blueprint, jsonify, request

from .service import TranslationService, TranslationNotImplemented
from .operations import ValidationError

api_bp = Blueprint('api', __name__, url_prefix='/')


@api_bp.errorhandler(400)
def bad_request(e):
    return jsonify(error=str(e.description)), 400

@api_bp.errorhandler(404)
def not_found(e):
    return jsonify(error="Resource not found"), 404

@api_bp.errorhandler(500)
def server_error(e):
    return jsonify(error="An unexpected error occurred"), 500

@api_bp.errorhandler(ValidationError)
def handle_validation_error(e):
    return jsonify(error=e.error_code, message=e.message), e.http_status


def _service():
    """Build a TranslationService for the request, honouring optional
    ?source=/&target= overrides (defaults come from config)."""
    source = request.args.get('source')
    target = request.args.get('target')
    return TranslationService(source_lang=source, target_lang=target)


@api_bp.route('', methods=['GET', 'TRACE'])
def hello_world():
    return jsonify({"message": "TRANSSERVE"})


# ----------------------------------------
# Dictionary — lookup (implemented)
# ----------------------------------------

@api_bp.route('/dictionary/lookup', methods=['POST'])
def dictionary_lookup_batch():
    """Batch lookup. Body: {"words": ["School", "Maid", ...], "fallback"?: bool}.

    Returns {"results": {word: target, ...}, "matched": {word: bool, ...}}.

    `fallback` controls what an unknown word maps to in `results`:
      - false (default): null — lets a caller tell "known" from "unknown".
      - true: the original word itself — so a display caller (e.g. the frontend
        in original-text mode) can render tag/trait names through the
        dictionary and safely fall back to the source text when there is no
        translation yet. `matched` always reports which words were real hits.
    """
    body = request.get_json(silent=True) or {}
    words = body.get('words')
    if not isinstance(words, list):
        raise ValidationError("Body must include a 'words' list.")
    fallback = bool(body.get('fallback', False))

    found = _service().lookup_batch(words)  # {word: translation | None}
    matched = {word: found.get(word) is not None for word in words}
    if fallback:
        results = {word: (found[word] if found.get(word) is not None else word)
                   for word in words}
    else:
        results = found
    return jsonify({"results": results, "matched": matched})


@api_bp.route('/dictionary/<path:word>', methods=['GET'])
def dictionary_lookup(word):
    """Single lookup. Returns {source, target, matched}.

    Unknown word: 404 by default; with ?fallback=true returns 200 and echoes
    the source word as `target` (matched=false), for display call sites that
    always need something to show."""
    service = _service()
    translation = service.lookup(word)
    fallback = request.args.get('fallback', 'false').lower() in ('true', '1', 'yes')
    if translation is None and not fallback:
        return jsonify(error="not_found", source=word, target=None, matched=False), 404
    return jsonify({
        "source": word,
        "target": translation if translation is not None else word,
        "matched": translation is not None,
        "source_lang": service.source_lang,
        "target_lang": service.target_lang,
    })


@api_bp.route('/dictionary', methods=['GET'])
def dictionary_list():
    """Paginated listing. Query: ?category=&search=&page=&limit=&source=&target=."""
    from . import operations
    source = request.args.get('source', 'en')
    target = request.args.get('target', 'ja')
    return jsonify(operations.list_entries(
        source_lang=source,
        target_lang=target,
        category=request.args.get('category'),
        search=request.args.get('search'),
        page=int(request.args.get('page', 1)),
        limit=int(request.args.get('limit', 50)),
    ))


# ----------------------------------------
# Dictionary — initialization & append
# ----------------------------------------

@api_bp.route('/dictionary/init', methods=['POST'])
def dictionary_init():
    """Initialize the dictionary. Body:
        {"entries": [{"source","target","category"?}, ...],
         "category"?: default-category, "replace"?: bool}
    With replace=true the language pair is cleared first."""
    body = request.get_json(silent=True) or {}
    entries = body.get('entries')
    if not isinstance(entries, list) or not entries:
        raise ValidationError("Body must include a non-empty 'entries' list.")
    count = _service().init_dictionary(
        entries,
        default_category=body.get('category'),
        replace=bool(body.get('replace', False)),
    )
    return jsonify({"status": "ok", "submitted": count}), 201


@api_bp.route('/dictionary', methods=['POST'])
def dictionary_append():
    """Append/merge entries (upsert). Body:
        {"entries": [{"source","target","category"?}, ...], "category"?: default}"""
    body = request.get_json(silent=True) or {}
    entries = body.get('entries')
    if not isinstance(entries, list) or not entries:
        raise ValidationError("Body must include a non-empty 'entries' list.")
    count = _service().append(entries, default_category=body.get('category'))
    return jsonify({"status": "ok", "submitted": count}), 201


@api_bp.route('/dictionary/<path:word>', methods=['DELETE'])
def dictionary_delete(word):
    from . import operations
    service = _service()
    deleted = operations.delete_entry(word, service.source_lang, service.target_lang)
    if not deleted:
        return jsonify(error="not_found", source=word), 404
    return jsonify({"status": "ok", "deleted": word})


# ----------------------------------------
# Text translation (reserved — not implemented)
# ----------------------------------------

@api_bp.route('/translate', methods=['POST'])
def translate_text():
    """Reserved future interface: translate arbitrary input text (English →
    Japanese). Not implemented yet — returns 501."""
    body = request.get_json(silent=True) or {}
    text = body.get('text', '')
    try:
        result = _service().translate_text(text)
        return jsonify({"text": text, "translation": result})
    except TranslationNotImplemented as e:
        return jsonify(error="not_implemented", message=str(e)), 501
