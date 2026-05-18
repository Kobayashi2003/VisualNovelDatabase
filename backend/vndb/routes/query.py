from flask import Blueprint, abort, jsonify, request
from vndb.tasks.resources import (
    get_resources_task, search_resources_task
)
from .common import execute_task

RESOURCE_TYPE_MAP = {
    'v': 'vn',
    'r': 'release',
    'p': 'producer',
    'c': 'character',
    's': 'staff',
    'g': 'tag',
    'i': 'trait'
}

query_bp = Blueprint('query', __name__, url_prefix='/')

QUERY_MODE = 'default'  # 'default' | 'local' | 'remote' | 'disabled'


def _remote_with_local_fallback(resource_type, params, response_size,
                                page, limit, sort, reverse, count):
    # Remote first; fall back to local only when remote ERRORs (or raises).
    # NOT_FOUND from remote is treated as a legitimate empty answer.
    try:
        remote_result = search_resources_task(
            resource_type, params, response_size, page, limit, sort, reverse, count)
    except Exception as exc:
        print(f"Unexpected exception in search_resources_task: {exc}")
        remote_result = {'status': 'ERROR', 'results': str(exc)}

    if remote_result.get('status') == 'ERROR':
        print(f"Remote search failed, falling back to local: {remote_result.get('results')}")
        return execute_task(get_resources_task,
            True, resource_type, params, response_size, page, limit, sort, reverse, count)

    return jsonify(remote_result)


@query_bp.route('/<string:query>', methods=['GET'])
def handle_query(query):

    resource_type = RESOURCE_TYPE_MAP.get(query[0].lower())
    if not resource_type:
        abort(400, description="Invalid resource type")

    if QUERY_MODE == 'disabled':
        abort(503, description="Query API is currently disabled")

    params = request.args.to_dict()

    if len(query) == 1:
        # Handle search for a specific type
        page = int(params.pop('page', 1))
        limit = int(params.pop('limit', 20))
        sort = params.pop('sort', 'id')
        reverse = params.pop('reverse', 'false').lower() == 'true'
        count = params.pop('count', 'true').lower() == 'true'

        search_from = params.pop('from', '')
        response_size = params.pop('size', 'large')

        if search_from == 'remote' or QUERY_MODE == 'remote':
            return execute_task(search_resources_task,
                True, resource_type, params, response_size, page, limit, sort, reverse, count)

        if search_from == 'local' or QUERY_MODE == 'local':
            return execute_task(get_resources_task,
                True, resource_type, params, response_size, page, limit, sort, reverse, count)

        return _remote_with_local_fallback(
            resource_type, params, response_size, page, limit, sort, reverse, count)

    elif len(query) > 1:
        # Handle get by ID
        try:
            int(query[1:])
        except ValueError:
            abort(400, description="Invalid ID format")

        search_from = params.pop('from', '')
        response_size = params.pop('size', 'large')

        if search_from == 'remote' or QUERY_MODE == 'remote':
            return execute_task(search_resources_task,
                True, resource_type, {'id': query}, response_size, 1, 1, 'id', False, True)

        if search_from == 'local' or QUERY_MODE == 'local':
            return execute_task(get_resources_task,
                True, resource_type, {'id': query}, response_size, 1, 1, 'id', False, True)

        return _remote_with_local_fallback(
            resource_type, {'id': query}, response_size, 1, 1, 'id', False, True)

    else:
        abort(400, description="Invalid query")
