import os
from flask import Blueprint, abort, request
from imgserve.tasks.images import (
    ensure_image_task, create_image_task, update_image_task,
    delete_image_task, download_images_task
)
from imgserve.utils import get_image_path
from .common import execute_task, send_cached_image, send_placeholder

image_bp = Blueprint('images', __name__, url_prefix='/')

def get_sync_param():
    return request.args.get('sync', 'true').lower() == 'true'

@image_bp.route('', methods=['POST'])
def download_images():
    urls = request.json.get('urls', [])
    if not urls:
        abort(400)
    sync = get_sync_param()
    return execute_task(download_images_task, sync, urls)

@image_bp.route('/<string:type>/<int:_>/<int:id>.jpg', methods=['GET'])
@image_bp.route('/<string:type>/<int:_>/<int:id>', methods=['GET'])
@image_bp.route('/<string:type>/<int:id>', methods=['GET'])
def get_image(type, id, _=None):
    image_path = get_image_path(type, id)
    if os.path.exists(image_path):
        return send_cached_image(image_path)
    # Cache miss: fetch in the background and serve a placeholder meanwhile, so
    # the request never blocks on a download from t.vndb.org.
    ensure_image_task.delay(type, id)
    return send_placeholder()

@image_bp.route('/<string:type>/<int:_>/<int:id>.jpg', methods=['POST'])
@image_bp.route('/<string:type>/<int:_>/<int:id>', methods=['POST'])
@image_bp.route('/<string:type>/<int:id>', methods=['POST'])
def create_image(type, id, _=None):
    sync = get_sync_param()
    return execute_task(create_image_task, sync, type, id)

@image_bp.route('/<string:type>/<int:_>/<int:id>.jpg', methods=['PUT'])
@image_bp.route('/<string:type>/<int:_>/<int:id>', methods=['PUT'])
@image_bp.route('/<string:type>/<int:id>', methods=['PUT'])
def update_image(type, id, _=None):
    sync = get_sync_param()
    return execute_task(update_image_task, sync, type, id)

@image_bp.route('/<string:type>/<int:_>/<int:id>.jpg', methods=['DELETE'])
@image_bp.route('/<string:type>/<int:_>/<int:id>', methods=['DELETE'])
@image_bp.route('/<string:type>/<int:id>', methods=['DELETE'])
def delete_image(type, id, _=None):
    sync = get_sync_param()
    return execute_task(delete_image_task, sync, type, id)