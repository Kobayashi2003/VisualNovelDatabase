from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import (
    jwt_required, get_jwt_identity, get_jwt,
    create_access_token, create_refresh_token, decode_token,
)

from userserve import limiter
from .operations import (
    ValidationError,
    get_user, create_user, update_user, delete_user, change_password, get_user_by_username,
    get_user_by_email, reset_user_password, check_email, create_verification_code,
    revoke_token, revoke_all_user_tokens,
    get_category, create_category, update_category, delete_category, clear_category,
    search_categories, get_categories_by_mark, contains_mark, is_marked, are_marked,
    add_mark_to_category, remove_mark_from_category,
    add_marks_to_category, remove_marks_from_category,
    move_marks_to_category, get_marks_from_category,
    get_marks_from_category_without_pagination,
    get_marks_for_user,
)
from .security import generate_reset_token, verify_reset_token, password_fingerprint
from .mail import send_password_reset_email, send_verification_code_email

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

@api_bp.errorhandler(429)
def ratelimit_exceeded(e):
    return jsonify(error="rate_limited", message="Too many requests. Please slow down and try again shortly."), 429

@api_bp.errorhandler(ValidationError)
def handle_validation_error(e):
    """Turn a validation failure into a structured 4xx response."""
    return jsonify(error=e.error_code, message=e.message), e.http_status

@api_bp.route('', methods=['GET', 'TRACE'])
def hello_world():
    return jsonify({"message": "USERSERVE"})


def _issue_tokens(user):
    """Build the access + refresh token pair returned by login / register."""
    return {
        'access_token': create_access_token(identity=user.id),
        'refresh_token': create_refresh_token(identity=user.id),
        'username': user.username,
    }


@api_bp.route('/login', methods=['POST'])
@limiter.limit("10 per minute")
def login():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify(error="invalid_request", message="Request body must be JSON."), 400
    username = data.get('username')
    password = data.get('password')
    if not isinstance(username, str) or not isinstance(password, str):
        return jsonify(error="missing_fields", message="Username and password are required."), 400
    user = get_user_by_username(username.strip())
    if user and user.check_password(password):
        return jsonify(_issue_tokens(user)), 200
    return jsonify(error="invalid_credentials", message="Invalid username or password."), 401

@api_bp.route('/send_verification_code', methods=['POST'])
@limiter.limit("5 per hour")
def send_verification_code_route():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify(error="invalid_request", message="Request body must be JSON."), 400
    email = data.get('email')
    if not isinstance(email, str):
        return jsonify(error="missing_fields", message="Email is required."), 400
    # Raises ValidationError for a bad format or an already-registered email.
    check_email(email)
    code = create_verification_code(email)
    send_verification_code_email(email, code)
    return jsonify(message="A verification code has been sent to your email."), 200

@api_bp.route('/register', methods=['POST'])
@limiter.limit("10 per hour")
def register():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify(error="invalid_request", message="Request body must be JSON."), 400
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    code = data.get('code')
    if (not isinstance(username, str) or not isinstance(email, str)
            or not isinstance(password, str) or not isinstance(code, str)):
        return jsonify(error="missing_fields", message="Username, email, password and verification code are required."), 400
    # check_* helpers / verify_email_code raise ValidationError (handled above);
    # a None return therefore means an unexpected DB-level failure.
    user = create_user(username, email, password, code)
    if not user:
        return jsonify(error="registration_failed", message="Registration failed. Please try again."), 500
    return jsonify(_issue_tokens(user)), 201

@api_bp.route('/refresh', methods=['POST'])
@limiter.limit("30 per minute")
@jwt_required(refresh=True)
def refresh():
    user_id = get_jwt_identity()
    return jsonify({'access_token': create_access_token(identity=user_id)}), 200

@api_bp.route('/logout', methods=['POST'])
@jwt_required(verify_type=False)
def logout():
    # Revoke the token used for this request (access or refresh)...
    revoke_token(get_jwt())
    # ...and the paired refresh token if the client sent it along.
    data = request.get_json(silent=True)
    if isinstance(data, dict) and isinstance(data.get('refresh_token'), str):
        try:
            revoke_token(decode_token(data['refresh_token']))
        except Exception:
            pass
    return jsonify(message="Logged out"), 200

@api_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    user = get_user(get_jwt_identity())
    if not user:
        return jsonify(error="user_not_found", message="User not found."), 404
    return jsonify(dict(user)), 200


@api_bp.route('/u<username>', methods=['GET'])
@jwt_required()
def get_user_route(username):
    current_user_id = get_jwt_identity()
    user = get_user_by_username(username)
    if not user:
        return jsonify(error="User not found"), 404
    if current_user_id != user.id:
        return jsonify(error="Unauthorized"), 403
    return jsonify(dict(user)), 200

@api_bp.route('/u<username>', methods=['PUT'])
@jwt_required()
def update_user_route(username):
    current_user_id = get_jwt_identity()
    user = get_user_by_username(username)
    if not user:
        return jsonify(error="User not found"), 404
    if current_user_id != user.id:
        return jsonify(error="Unauthorized"), 403
    data = request.json
    user = update_user(user.id, username=data.get('username'))
    if not user:
        return jsonify(error="Update failed"), 400
    return jsonify(dict(user)), 200

@api_bp.route('/u<username>', methods=['DELETE'])
@jwt_required()
def delete_user_route(username):
    current_user_id = get_jwt_identity()
    user = get_user_by_username(username)
    if not user:
        return jsonify(error="User not found"), 404
    if current_user_id != user.id:
        return jsonify(error="Unauthorized"), 403
    if not delete_user(user.id):
        return jsonify(message="Delete failed"), 400
    return jsonify(message="User deleted"), 200

@api_bp.route('/change_password', methods=['POST'])
@limiter.limit("20 per hour")
@jwt_required()
def change_password_route():
    user_id = get_jwt_identity()
    user = get_user(user_id)
    if not user:
        return jsonify(error="user_not_found", message="User not found."), 404
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify(error="invalid_request", message="Request body must be JSON."), 400
    old_password = data.get('old_password')
    new_password = data.get('new_password')
    if not isinstance(old_password, str) or not isinstance(new_password, str):
        return jsonify(error="missing_fields", message="Old and new passwords are required."), 400
    # An invalid old password / weak new password raises ValidationError;
    # a None return means an unexpected DB-level failure.
    updated = change_password(user_id, old_password, new_password)
    if not updated:
        return jsonify(error="password_change_failed", message="Password change failed."), 500
    # Invalidate every existing session, then hand this device a fresh pair.
    revoke_all_user_tokens(user_id)
    return jsonify({
        'message': "Password changed successfully",
        'access_token': create_access_token(identity=user_id),
        'refresh_token': create_refresh_token(identity=user_id),
    }), 200

@api_bp.route('/forgot_password', methods=['POST'])
@limiter.limit("5 per hour")
def forgot_password_route():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify(error="invalid_request", message="Request body must be JSON."), 400
    email = data.get('email')
    if not isinstance(email, str):
        return jsonify(error="missing_fields", message="Email is required."), 400
    user = get_user_by_email(email)
    if user:
        reset_url = f"{current_app.config['FRONTEND_BASE_URL']}/reset-password?token={generate_reset_token(user)}"
        send_password_reset_email(user, reset_url)
    # Always 200 — never reveal whether an email is registered.
    return jsonify(message="If that email is registered, a reset link has been sent."), 200

@api_bp.route('/reset_password', methods=['POST'])
@limiter.limit("10 per hour")
def reset_password_route():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify(error="invalid_request", message="Request body must be JSON."), 400
    token = data.get('token')
    new_password = data.get('new_password')
    if not isinstance(token, str) or not isinstance(new_password, str):
        return jsonify(error="missing_fields", message="Token and new password are required."), 400
    payload = verify_reset_token(token, current_app.config['RESET_TOKEN_MAX_AGE'])
    user = get_user(payload['uid']) if payload else None
    # The fingerprint check rejects links that were already used (the password,
    # and therefore the fingerprint, has since changed).
    if not user or password_fingerprint(user) != payload.get('fp'):
        return jsonify(error="invalid_reset_token", message="This reset link is invalid or has expired."), 400
    # check_password raises ValidationError (handled above); None means DB failure.
    updated = reset_user_password(user.id, new_password)
    if not updated:
        return jsonify(error="password_reset_failed", message="Password reset failed."), 500
    revoke_all_user_tokens(user.id)
    return jsonify(message="Your password has been reset. Please log in with your new password."), 200


@api_bp.route('/<string:type>/c', methods=['GET'])
@jwt_required()
def get_categories_for_user_route(type):
    user_id = get_jwt_identity()
    categories = search_categories(user_id, type, '')
    categories = [dict(c) for c in categories]
    return jsonify(categories), 200

@api_bp.route('/<string:type>/c', methods=['POST'])
@jwt_required()
def create_category_route(type):
    user_id = get_jwt_identity()
    data = request.json
    category = create_category(user_id, type, data['category_name'])
    if category:
        return jsonify(dict(category)), 201
    return jsonify(error="Failed to create category"), 400

@api_bp.route('/<string:type>/c<int:category_id>', methods=['GET'])
@jwt_required()
def get_category_route(type, category_id):
    user_id = get_jwt_identity()
    category = get_category(user_id, category_id, type)
    if category:
        return jsonify(dict(category)), 200
    return jsonify(error="Category not found"), 404

@api_bp.route('/<string:type>/c<int:category_id>', methods=['PUT'])
@jwt_required()
def update_category_route(type, category_id):
    user_id = get_jwt_identity()
    data = request.json
    category = update_category(user_id, category_id, type, data.get('category_name'))
    if category:
        return jsonify(dict(category)), 200
    return jsonify(error="Category not found"), 404

@api_bp.route('/<string:type>/c<int:category_id>', methods=['DELETE'])
@jwt_required()
def delete_category_route(type, category_id):
    user_id = get_jwt_identity()
    if delete_category(user_id, category_id, type):
        return jsonify(message="Category deleted"), 200
    return jsonify(error="Category not found"), 404

@api_bp.route('/<string:type>/c<int:category_id>/clear', methods=['POST'])
@jwt_required()
def clear_category_route(type, category_id):
    user_id = get_jwt_identity()
    category = clear_category(user_id, category_id, type)
    if category:
        return jsonify(message="Category cleared"), 200
    return jsonify(error="Category not found"), 404


@api_bp.route('/<string:type>/c<int:category_id>/m<int:mark_id>', methods=['GET'])
@jwt_required()
def contains_mark_route(type, category_id, mark_id):
    user_id = get_jwt_identity()
    containsMark = contains_mark(user_id, type, category_id, mark_id)
    return jsonify(containsMark=containsMark), 200

@api_bp.route('/<string:type>/c<int:category_id>/m', methods=['POST'])
@jwt_required()
def add_mark_to_category_route(type, category_id):
    user_id = get_jwt_identity()
    data = request.json
    if 'mark_ids' in data:
        category = add_marks_to_category(user_id, category_id, type, data['mark_ids'])
    else:
        category = add_mark_to_category(user_id, category_id, type, data['mark_id'])
    if category:
        return jsonify(dict(category)), 201
    return jsonify(error="Failed to add mark"), 400

@api_bp.route('/<string:type>/c<int:category_id>/m', methods=['DELETE'])
@jwt_required()
def remove_mark_from_category_route(type, category_id):
    user_id = get_jwt_identity()
    data = request.json
    if 'mark_ids' in data:
        category = remove_marks_from_category(user_id, category_id, type, data['mark_ids'])
    else:
        category = remove_mark_from_category(user_id, category_id, type, data['mark_id'])
    if category:
        return jsonify(dict(category)), 200
    return jsonify(error="Failed to remove mark"), 400

@api_bp.route('/<string:type>/c<int:category_id>/m', methods=['GET'])
@jwt_required()
def get_marks_from_category_route(type, category_id):
    user_id = get_jwt_identity()
    marks = get_marks_from_category_without_pagination(user_id, category_id, type)
    return jsonify(marks), 200

@api_bp.route('/<string:type>/c/m', methods=['GET'])
@jwt_required()
def get_marks_for_user_route(type):
    user_id = get_jwt_identity()
    args = request.args
    cid_raw = args.get('cid', 'all')
    sort = args.get('sort', 'marked_at')
    try:
        page = max(1, int(args.get('page', 1)))
        limit = max(1, min(int(args.get('limit', 24)), 100))
        category_id = None if cid_raw == 'all' else int(cid_raw)
    except (TypeError, ValueError):
        return jsonify(error="Invalid pagination or cid"), 400
    if sort not in ('id', 'marked_at'):
        return jsonify(error="Invalid sort field"), 400

    reverse = args.get('reverse', 'true').lower() == 'true'
    count = args.get('count', 'true').lower() == 'true'
    result = get_marks_for_user(
        user_id, type, category_id,
        page=page, limit=limit, sort=sort, reverse=reverse, count=count,
    )
    if result is None:
        return jsonify(error="Not found"), 404
    return jsonify(result), 200

@api_bp.route('/<string:type>/c/m', methods=['PUT'])
@jwt_required()
def move_marks_to_category_route(type):
    user_id = get_jwt_identity()
    data = request.json
    category_from_id = data['category_from_id']
    category_to_id = data['category_to_id']
    if category_from_id == category_to_id:
        return jsonify(error="Category from and to are the same"), 400
    category_from, category_to = move_marks_to_category(user_id, category_from_id, category_to_id, type, data['mark_ids'])
    if category_from and category_to:
        return jsonify({'category_from': dict(category_from), 'category_to': dict(category_to)}), 200
    return jsonify(error="Failed to move marks"), 400


@api_bp.route('/<string:type>/m/is_marked', methods=['POST'])
@jwt_required()
def is_marked_route(type):
    user_id = get_jwt_identity()
    data = request.json
    markId = data['mark_id']
    isMarked = is_marked(user_id, type, markId)
    return jsonify(isMarked=isMarked), 200

@api_bp.route('/<string:type>/m/are_marked', methods=['POST'])
@jwt_required()
def are_marked_route(type):
    user_id = get_jwt_identity()
    data = request.json
    markIds = data['mark_ids']
    isMarked = are_marked(user_id, type, markIds)
    return jsonify(isMarked=isMarked), 200

@api_bp.route('/<string:type>/m<int:mark_id>/c', methods=['GET'])
@jwt_required()
def get_categories_by_mark_route(type, mark_id):
    user_id = get_jwt_identity()
    categoryIds = get_categories_by_mark(user_id, type, mark_id)
    return jsonify(categoryIds=categoryIds), 200

@api_bp.route('/<string:type>/m/c', methods=['POST'])
@jwt_required()
def get_categories_by_marks_route(type):
    user_id = get_jwt_identity()
    data = request.json
    markIds = data['mark_ids']
    categoryIds = {}
    for mark_id in markIds:
        categoryIds[mark_id] = get_categories_by_mark(user_id, type, mark_id)
    return jsonify(categoryIds=categoryIds), 200