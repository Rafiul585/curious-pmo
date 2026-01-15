from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter, SearchFilter
from django.db.models import Q

from pm.models.activity_models import ActivityLog
from pm.serializers.activity_serializers import ActivityLogSerializer
from pm.services.audit_service import (
    get_entity_audit_logs,
    get_workspace_audit_logs,
    get_project_audit_logs,
    get_user_audit_logs,
    EventType
)


class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing audit/activity logs.
    
    Provides comprehensive querying capabilities for audit logs:
    - Filter by entity type (Workspace, Project, Milestone, Sprint, Task)
    - Filter by workspace or project (hierarchical)
    - Filter by user who performed the action
    - Filter by action type (CREATED, UPDATED, DELETED, etc.)
    - Filter by date range
    """
    queryset = ActivityLog.objects.all()
    permission_classes = [IsAuthenticated]
    serializer_class = ActivityLogSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter, SearchFilter]
    filterset_fields = ['user', 'action', 'content_type']
    search_fields = ['action', 'content_type', 'reason']
    ordering_fields = ['timestamp', 'action', 'content_type']
    ordering = ['-timestamp']

    @action(detail=False, methods=['GET'])
    def my_activity(self, request):
        """
        Get activity logs for actions performed by the current user.
        GET /api/activity-logs/my_activity/
        """
        activities = ActivityLog.objects.filter(user=request.user).order_by('-timestamp')
        
        # Apply limit if provided
        limit = request.query_params.get('limit', 50)
        activities = activities[:int(limit)]
        
        serializer = ActivityLogSerializer(activities, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['GET'])
    def recent(self, request):
        """
        Get recent activity logs (across all accessible entities).
        GET /api/activity-logs/recent/?limit=20
        """
        limit = request.query_params.get('limit', 20)
        activities = ActivityLog.objects.all()[:int(limit)]
        serializer = ActivityLogSerializer(activities, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['GET'])
    def by_entity(self, request):
        """
        Get audit logs for a specific entity.
        GET /api/activity-logs/by_entity/?content_type=Task&object_id=123
        
        Query params:
        - content_type: Entity type (Workspace, Project, Milestone, Sprint, Task)
        - object_id: ID of the entity
        - limit: Number of records (default 50)
        """
        content_type = request.query_params.get('content_type')
        object_id = request.query_params.get('object_id')
        limit = request.query_params.get('limit', 50)
        
        if not content_type or not object_id:
            return Response(
                {'error': 'content_type and object_id are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        activities = get_entity_audit_logs(content_type, int(object_id), int(limit))
        serializer = ActivityLogSerializer(activities, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['GET'])
    def by_workspace(self, request):
        """
        Get all audit logs within a workspace (includes all projects, milestones, sprints, tasks).
        GET /api/activity-logs/by_workspace/?workspace_id=123
        
        Query params:
        - workspace_id: ID of the workspace
        - limit: Number of records (default 100)
        """
        workspace_id = request.query_params.get('workspace_id')
        limit = request.query_params.get('limit', 100)
        
        if not workspace_id:
            return Response(
                {'error': 'workspace_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        activities = get_workspace_audit_logs(int(workspace_id), int(limit))
        serializer = ActivityLogSerializer(activities, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['GET'])
    def by_project(self, request):
        """
        Get all audit logs within a project (includes milestones, sprints, tasks).
        GET /api/activity-logs/by_project/?project_id=123
        
        Query params:
        - project_id: ID of the project
        - limit: Number of records (default 100)
        """
        project_id = request.query_params.get('project_id')
        limit = request.query_params.get('limit', 100)
        
        if not project_id:
            return Response(
                {'error': 'project_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        activities = get_project_audit_logs(int(project_id), int(limit))
        serializer = ActivityLogSerializer(activities, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['GET'])
    def by_user(self, request):
        """
        Get audit logs for actions performed by a specific user.
        GET /api/activity-logs/by_user/?user_id=123
        
        Query params:
        - user_id: ID of the user
        - limit: Number of records (default 100)
        """
        user_id = request.query_params.get('user_id')
        limit = request.query_params.get('limit', 100)
        
        if not user_id:
            return Response(
                {'error': 'user_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        activities = get_user_audit_logs(int(user_id), int(limit))
        serializer = ActivityLogSerializer(activities, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['GET'])
    def by_action(self, request):
        """
        Get audit logs filtered by action type.
        GET /api/activity-logs/by_action/?action=CREATED
        
        Query params:
        - action: Action type (CREATED, UPDATED, DELETED, TASK_STATUS_CHANGED, etc.)
        - limit: Number of records (default 100)
        """
        action_type = request.query_params.get('action')
        limit = request.query_params.get('limit', 100)
        
        if not action_type:
            return Response(
                {'error': 'action is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        activities = ActivityLog.objects.filter(action=action_type).order_by('-timestamp')[:int(limit)]
        serializer = ActivityLogSerializer(activities, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['GET'])
    def by_date_range(self, request):
        """
        Get audit logs within a date range.
        GET /api/activity-logs/by_date_range/?start_date=2024-01-01&end_date=2024-12-31
        
        Query params:
        - start_date: Start date (YYYY-MM-DD)
        - end_date: End date (YYYY-MM-DD)
        - content_type: Optional entity type filter
        - workspace_id: Optional workspace filter
        - limit: Number of records (default 100)
        """
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        content_type = request.query_params.get('content_type')
        workspace_id = request.query_params.get('workspace_id')
        limit = request.query_params.get('limit', 100)
        
        activities = ActivityLog.objects.all()
        
        if start_date:
            activities = activities.filter(timestamp__date__gte=start_date)
        if end_date:
            activities = activities.filter(timestamp__date__lte=end_date)
        if content_type:
            activities = activities.filter(content_type=content_type)
        if workspace_id:
            activities = activities.filter(extra_info__workspace_id=int(workspace_id))
        
        activities = activities.order_by('-timestamp')[:int(limit)]
        serializer = ActivityLogSerializer(activities, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['GET'])
    def action_types(self, request):
        """
        Get all available action types for filtering.
        GET /api/activity-logs/action_types/
        """
        action_types = {
            'CRUD Operations': [
                EventType.CREATED,
                EventType.UPDATED,
                EventType.DELETED,
            ],
            'Workspace Events': [
                EventType.WORKSPACE_MEMBER_ADDED,
                EventType.WORKSPACE_MEMBER_REMOVED,
                EventType.WORKSPACE_MEMBER_ROLE_CHANGED,
                EventType.WORKSPACE_PROJECT_ACCESS_GRANTED,
                EventType.WORKSPACE_PROJECT_ACCESS_REVOKED,
            ],
            'Project Events': [
                EventType.PROJECT_MEMBER_ADDED,
                EventType.PROJECT_MEMBER_REMOVED,
                EventType.PROJECT_ARCHIVED,
                EventType.PROJECT_UNARCHIVED,
                EventType.PROJECT_VISIBILITY_CHANGED,
            ],
            'Task Events': [
                EventType.TASK_ASSIGNED,
                EventType.TASK_UNASSIGNED,
                EventType.TASK_STATUS_CHANGED,
                EventType.TASK_PRIORITY_CHANGED,
                EventType.TASK_WEIGHT_CHANGED,
            ],
            'Sprint Events': [
                EventType.SPRINT_STATUS_CHANGED,
            ],
            'Milestone Events': [
                EventType.MILESTONE_STATUS_CHANGED,
            ],
        }
        return Response(action_types)

    @action(detail=False, methods=['GET'])
    def entity_types(self, request):
        """
        Get all entity types that can be audited.
        GET /api/activity-logs/entity_types/
        """
        entity_types = [
            'Workspace',
            'Project',
            'Milestone',
            'Sprint',
            'Task',
            'WorkspaceMember',
            'ProjectMember',
            'WorkspaceProjectAccess',
        ]
        return Response(entity_types)

    @action(detail=False, methods=['GET'])
    def summary(self, request):
        """
        Get a summary of recent activity.
        GET /api/activity-logs/summary/?days=7
        
        Query params:
        - days: Number of days to include (default 7)
        - workspace_id: Optional workspace filter
        """
        from django.utils import timezone
        from datetime import timedelta
        from django.db.models import Count
        
        days = int(request.query_params.get('days', 7))
        workspace_id = request.query_params.get('workspace_id')
        
        since = timezone.now() - timedelta(days=days)
        activities = ActivityLog.objects.filter(timestamp__gte=since)
        
        if workspace_id:
            activities = activities.filter(extra_info__workspace_id=int(workspace_id))
        
        # Count by action type
        action_counts = activities.values('action').annotate(count=Count('id'))
        
        # Count by entity type
        entity_counts = activities.values('content_type').annotate(count=Count('id'))
        
        # Count by user
        user_counts = activities.values('user__username').annotate(count=Count('id'))
        
        return Response({
            'period_days': days,
            'total_activities': activities.count(),
            'by_action': list(action_counts),
            'by_entity': list(entity_counts),
            'by_user': list(user_counts),
        })

