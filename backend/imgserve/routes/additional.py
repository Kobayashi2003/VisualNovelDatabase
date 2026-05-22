import os
import random
from flask import Blueprint, send_file, abort, current_app

from imgserve.utils import get_image_path
from imgserve.tasks.images import ensure_image_task
from .common import send_cached_image, send_placeholder

additional_bp = Blueprint('additional', __name__, url_prefix='/')

# Covers and screenshots come in a full-size and a '.t' thumbnail variant;
# requesting either is a good signal to prefetch the other.
VARIANT_PAIR = {'cv': 'cv.t', 'cv.t': 'cv', 'sf': 'sf.t', 'sf.t': 'sf'}

@additional_bp.route('/bg', methods=['GET'])
def get_bg():
    BG_FOLDER = current_app.config['DATA_FOLDER'] + '/additional/bg'
    os.makedirs(BG_FOLDER, exist_ok=True)
    bg_files = os.listdir(BG_FOLDER)
    if not bg_files:
        abort(404)
    random_bg = random.choice(bg_files)
    return send_file(os.path.abspath(os.path.join(BG_FOLDER, random_bg)), mimetype='image/png')

@additional_bp.route('/random', methods=['GET'])
def get_random():
    IMG_FOLDER = current_app.config['DATA_FOLDER'] + '/additional/random'
    os.makedirs(IMG_FOLDER, exist_ok=True)
    img_files = os.listdir(IMG_FOLDER)
    if not img_files:
        abort(404)
    random_img = random.choice(img_files)
    return send_file(os.path.abspath(os.path.join(IMG_FOLDER, random_img)), mimetype='image/png')

@additional_bp.route('/img/<string:type>/<int:_>/<int:id>', methods=['GET'])
@additional_bp.route('/img/<string:type>/<int:id>', methods=['GET'])
@additional_bp.route('/img/<string:type>', methods=['GET'])
def get_img(type, id, _=None):
    image_path = get_image_path(type, id)
    if os.path.exists(image_path):
        return send_cached_image(image_path)
    # Cache miss: fetch this image — and its sibling variant — in the
    # background, serving a placeholder so the request never blocks.
    ensure_image_task.delay(type, id)
    sibling = VARIANT_PAIR.get(type)
    if sibling:
        ensure_image_task.delay(sibling, id)
    return send_placeholder()
