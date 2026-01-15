from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from pm.services.search_service import SearchService


class SearchViewSet(viewsets.ViewSet):
    """
    ViewSet for global search functionality.
    """
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['GET'])
    def all(self, request):
        """
        Global search across all entities.
        GET /api/search/all/?q=query&limit=20

        Query params:
        - q: Search query (required, min 2 chars)
        - limit: Max results per category (default 20)

        Returns categorized results from tasks, projects, milestones, sprints, users.
        """
        query = request.query_params.get('q', '').strip()
        limit = int(request.query_params.get('limit', 20))

        if not query:
            return Response(
                {'error': 'Search query "q" is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(query) < 2:
            return Response(
                {'error': 'Search query must be at least 2 characters'},
                status=status.HTTP_400_BAD_REQUEST
            )

        results = SearchService.search_all(query, request.user, limit)
        return Response(results)

    @action(detail=False, methods=['GET'])
    def quick(self, request):
        """
        Quick search for autocomplete/typeahead.
        GET /api/search/quick/?q=query&limit=5

        Query params:
        - q: Search query (required, min 2 chars)
        - limit: Max results per category (default 5)

        Returns mixed results from tasks, projects, users.
        """
        query = request.query_params.get('q', '').strip()
        limit = int(request.query_params.get('limit', 5))

        if not query or len(query) < 2:
            return Response({'query': query, 'results': []})

        results = SearchService.quick_search(query, request.user, limit)
        return Response(results)

    @action(detail=False, methods=['GET'])
    def tasks(self, request):
        """
        Search tasks only.
        GET /api/search/tasks/?q=query&limit=20
        """
        query = request.query_params.get('q', '').strip()
        limit = int(request.query_params.get('limit', 20))

        if not query or len(query) < 2:
            return Response({'query': query, 'count': 0, 'items': []})

        results = SearchService.search_tasks(query, request.user, limit)
        results['query'] = query
        return Response(results)

    @action(detail=False, methods=['GET'])
    def projects(self, request):
        """
        Search projects only.
        GET /api/search/projects/?q=query&limit=20
        """
        query = request.query_params.get('q', '').strip()
        limit = int(request.query_params.get('limit', 20))

        if not query or len(query) < 2:
            return Response({'query': query, 'count': 0, 'items': []})

        results = SearchService.search_projects(query, request.user, limit)
        results['query'] = query
        return Response(results)

    @action(detail=False, methods=['GET'])
    def users(self, request):
        """
        Search users only.
        GET /api/search/users/?q=query&limit=20
        """
        query = request.query_params.get('q', '').strip()
        limit = int(request.query_params.get('limit', 20))

        if not query or len(query) < 2:
            return Response({'query': query, 'count': 0, 'items': []})

        results = SearchService.search_users(query, limit)
        results['query'] = query
        return Response(results)

    @action(detail=False, methods=['GET'])
    def milestones(self, request):
        """
        Search milestones only.
        GET /api/search/milestones/?q=query&limit=20
        """
        query = request.query_params.get('q', '').strip()
        limit = int(request.query_params.get('limit', 20))

        if not query or len(query) < 2:
            return Response({'query': query, 'count': 0, 'items': []})

        results = SearchService.search_milestones(query, request.user, limit)
        results['query'] = query
        return Response(results)

    @action(detail=False, methods=['GET'])
    def sprints(self, request):
        """
        Search sprints only.
        GET /api/search/sprints/?q=query&limit=20
        """
        query = request.query_params.get('q', '').strip()
        limit = int(request.query_params.get('limit', 20))

        if not query or len(query) < 2:
            return Response({'query': query, 'count': 0, 'items': []})

        results = SearchService.search_sprints(query, request.user, limit)
        results['query'] = query
        return Response(results)
