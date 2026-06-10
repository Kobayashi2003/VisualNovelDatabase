from flask import Blueprint, abort, jsonify, request
from vndb.tasks.resources import (
    get_resources_task, search_resources_task, query_resources_task
)
from vndb.tasks.relation_graph import get_relation_graph_task, GRAPH_DEPTH_CAP
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


@query_bp.route('/<string:query>/rg', methods=['GET'])
def handle_relation_graph(query):

    resource_type = RESOURCE_TYPE_MAP.get(query[0].lower())
    if resource_type != 'vn':
        abort(400, description="Relation graph is only available for visual novels")

    try:
        int(query[1:])
    except ValueError:
        abort(400, description="Invalid ID format")

    if QUERY_MODE == 'disabled':
        abort(503, description="Query API is currently disabled")

    params = request.args.to_dict()
    depth = int(params.pop('depth', GRAPH_DEPTH_CAP))
    official_only = params.pop('official_only', 'false').lower() == 'true'

    return execute_task(get_relation_graph_task, True, query, depth, official_only)

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

        # both: freshness-aware local/remote composition (vndb/search/both)
        return execute_task(query_resources_task,
            True, resource_type, params, response_size, page, limit, sort, reverse, count)

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

        # both: stale-while-revalidate detail lookup (vndb/search/both)
        return execute_task(query_resources_task,
            True, resource_type, {'id': query}, response_size, 1, 1, 'id', False, True)

    else:
        abort(400, description="Invalid query")
