import base64
from flask import jsonify, send_file, Response

def execute_task(task, sync=False, *args, **kwargs):
    if sync:
        result = task(*args, **kwargs)
        return jsonify(result)
    else:
        task_result = task.delay(*args, **kwargs)
        return jsonify({"task_id": task_result.id}), 202

# 1x1 transparent PNG, served while a not-yet-cached image is fetched in the
# background so the browser shows a clean blank instead of a broken-image icon.
_PLACEHOLDER_PNG = base64.b64decode(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNk+A8A'
    'AQUBAScY42YAAAAASUVORK5CYII='
)

def send_cached_image(path):
    """Serve a cached image file. VNDB images are immutable, so the response
    is marked publicly cacheable for a year — a cache hit never goes back to
    the server."""
    response = send_file(path, mimetype='image/jpeg')
    response.headers['Cache-Control'] = 'public, max-age=31536000, immutable'
    return response

def send_placeholder():
    """Serve the transparent placeholder for an image still being fetched.
    202 signals "accepted, processing"; no-store makes the browser re-request
    on the next visit, by which point the background download has landed."""
    response = Response(_PLACEHOLDER_PNG, status=202, mimetype='image/png')
    response.headers['Cache-Control'] = 'no-store'
    return response
