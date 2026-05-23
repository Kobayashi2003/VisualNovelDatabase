import os
import random

from flask import Blueprint, send_file, abort, current_app

from .common import serve_or_fetch_image

additional_bp = Blueprint('additional', __name__, url_prefix='/')


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


@additional_bp.route('/img/<string:type>/<int:_>/<int:id>.jpg', methods=['GET'])
@additional_bp.route('/img/<string:type>/<int:_>/<int:id>', methods=['GET'])
@additional_bp.route('/img/<string:type>/<int:id>', methods=['GET'])
def get_img(type, id, _=None):
    return serve_or_fetch_image(type, id, prefetch_sibling=True)
