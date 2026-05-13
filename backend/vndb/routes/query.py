from flask import Blueprint, abort, jsonify, request
from vndb.tasks.resources import (
    get_resources_task,search_resources_task
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

@query_bp.route('/<string:query>', methods=['GET'])
def handle_query(query):

    resource_type = RESOURCE_TYPE_MAP.get(query[0].lower())
    if not resource_type:
        abort(400, description="Invalid resource type")

    params = request.args.to_dict()

    params['from'] = 'local'

    if len(query) == 1:
        # Handle search for a specific type
        page = int(params.pop('page', 1))
        limit = int(params.pop('limit', 20))
        sort = params.pop('sort', 'id')
        reverse = params.pop('reverse', 'false').lower() == 'true'
        count = params.pop('count', 'true').lower() == 'true'

        search_from = params.pop('from', '')
        response_size = params.pop('size', 'large')

        if search_from == 'remote':
            return execute_task(search_resources_task,
                True, resource_type, params, response_size, page, limit, sort, reverse, count)

        elif search_from == 'local':
            return execute_task(get_resources_task,
                True, resource_type, params, response_size, page, limit, sort, reverse, count)

        try:
            func_return = search_resources_task(
                resource_type, params, response_size, page, limit, sort, reverse, count)
            if func_return['status'] != 'SUCCESS':
                # raise ValueError(func_return['status'])

                try:
                    return execute_task(get_resources_task,
                        True, resource_type, params, response_size, page, limit, sort, reverse, count)
                except Exception as exc:
                    raise ValueError(f"Error in fallback get_resources_task: {exc}")

            return jsonify(func_return)
        except Exception as exc:
            print(f"Error in search_and_synchronize_remote_task: {exc}")
            return execute_task(get_resources_task,
                True, resource_type, params, response_size, page, limit, sort, reverse, count)

    elif len(query) > 1:
        # Handle get by ID
        try:
            int(query[1:])
        except ValueError:
            abort(400, description="Invalid ID format")

        search_from = params.pop('from', '')
        response_size = params.pop('size', 'large')

        if search_from == 'remote':
            return execute_task(search_resources_task,
                True, resource_type, {'id':query}, response_size, 1, 1, 'id', False, True)
        elif search_from == 'local':
            return execute_task(get_resources_task,
                True, resource_type, {'id':query}, response_size, 1, 1, 'id', False, True)

        try:
            func_return = search_resources_task(
                resource_type, {'id':query}, response_size, 1, 1, 'id', False, True)
            if func_return['status'] != 'SUCCESS':
                # raise ValueError(func_return['status'])

                try:
                    return execute_task(get_resources_task,
                        True, resource_type, {'id':query}, response_size, 1, 1, 'id', False, True)
                except Exception as exc:
                    raise ValueError(f"Error in fallback get_resources_task: {exc}")

            return jsonify(func_return)
        except Exception as exc:
            print(f"Error in search_and_synchronize_remote_task: {exc}")
            return execute_task(get_resources_task,
                True, resource_type, {'id':query}, response_size, 1, 1, 'id', False, True)

    else:
        abort(400, description="Invalid query")