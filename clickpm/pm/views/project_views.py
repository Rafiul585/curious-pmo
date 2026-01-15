from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Q

from pm.models.project_models import Project, ProjectMember, Milestone, Sprint
from pm.models.workspace_models import WorkspaceMember
from pm.serializers.project_serializers import (
    ProjectSerializer, ProjectDetailSerializer, ProjectCreateUpdateSerializer,
    MilestoneSerializer, MilestoneCreateUpdateSerializer,
    SprintSerializer, SprintCreateUpdateSerializer
)
from pm.permissions import IsProjectMember, CanViewProject
from pm.utils.permission_helpers import get_accessible_projects
from pm.services.audit_service import AuditService, EventType
from pm.services.kanban_service import get_kanban_for_project, get_kanban_for_sprint
from pm.services.gantt_service import get_timeline_data, update_item_dates
from pm.services.notification_service import NotificationService


class ProjectViewSet(viewsets.ModelViewSet):
    # queryset = Project.objects.all()  # Replaced by get_queryset
    permission_classes = [IsAuthenticated, CanViewProject]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'archived', 'visibility', 'workspace']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'start_date', 'end_date']
    ordering = ['-id']

    def get_queryset(self):
        return get_accessible_projects(self.request.user)

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ProjectDetailSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return ProjectCreateUpdateSerializer
        return ProjectSerializer

    def perform_create(self, serializer):
        """Create project and log audit event"""
        project = serializer.save()
        # Add the creator as a project member
        ProjectMember.objects.get_or_create(
            user=self.request.user,
            project=project
        )
        
        # Log project creation
        AuditService.log_create(
            user=self.request.user,
            instance=project,
            reason=self.request.data.get('reason', 'Project created')
        )

    def perform_update(self, serializer):
        """Update project and log audit event with old/new state"""
        old_state = AuditService.capture_state(serializer.instance)
        project = serializer.save()
        
        AuditService.log_update(
            user=self.request.user,
            instance=project,
            old_state=old_state,
            reason=self.request.data.get('reason', 'Project updated')
        )

    def perform_destroy(self, instance):
        """Delete project and log audit event"""
        AuditService.log_delete(
            user=self.request.user,
            instance=instance,
            reason=self.request.data.get('reason', 'Project deleted')
        )
        instance.delete()

    @action(detail=True, methods=['POST'])
    def add_member(self, request, pk=None):
        """
        Add a member to the project.
        """
        project = self.get_object()
        user_id = request.data.get('user_id')
        role_id = request.data.get('role_id')

        if not user_id:
            return Response(
                {'error': 'user_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        from pm.models.user_models import User, Role
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        role = None
        if role_id:
            try:
                role = Role.objects.get(id=role_id)
            except Role.DoesNotExist:
                return Response(
                    {'error': 'Role not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

        member, created = ProjectMember.objects.get_or_create(
            user=user,
            project=project,
            defaults={'role': role}
        )

        if not created and role:
            old_state = AuditService.capture_state(member)
            member.role = role
            member.save()

            # Log role change
            AuditService.log_event(
                user=request.user,
                instance=member,
                action=EventType.PROJECT_MEMBER_ADDED,
                old_state=old_state,
                new_state=AuditService.capture_state(member),
                reason=request.data.get('reason', 'Project member role updated'),
                extra_info={'target_user': user.username}
            )
        else:
            # Log member added
            AuditService.log_event(
                user=request.user,
                instance=member,
                action=EventType.PROJECT_MEMBER_ADDED,
                new_state=AuditService.capture_state(member),
                reason=request.data.get('reason', 'Member added to project'),
                extra_info={'target_user': user.username}
            )

            # Notify the user they were added to the project (only for new members)
            if created and user != request.user:
                NotificationService.notify_project_member_added(user, project, request.user)

        return Response({'status': 'Member added/updated'})

    @action(detail=True, methods=['POST'])
    def remove_member(self, request, pk=None):
        """
        Remove a member from the project.
        """
        project = self.get_object()
        user_id = request.data.get('user_id')

        if not user_id:
            return Response(
                {'error': 'user_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            member = ProjectMember.objects.get(
                project=project,
                user_id=user_id
            )
            
            # Log member removal before deleting
            AuditService.log_event(
                user=request.user,
                instance=member,
                action=EventType.PROJECT_MEMBER_REMOVED,
                old_state=AuditService.capture_state(member),
                reason=request.data.get('reason', 'Member removed from project'),
                extra_info={'target_user': member.user.username}
            )
            
            member.delete()
            return Response({'status': 'Member removed'})
        except ProjectMember.DoesNotExist:
            return Response(
                {'error': 'Member not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['GET'])
    def my_projects(self, request):
        """
        Get projects where the current user is a member.
        """
        projects = Project.objects.filter(members=request.user)
        serializer = ProjectSerializer(projects, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['GET'])
    def available_members(self, request, pk=None):
        """
        Get workspace members who can be added to this project.
        Returns workspace members who are NOT already members of this project.
        GET /api/projects/{id}/available_members/
        """
        from pm.serializers.user_serializers import UserMinimalSerializer

        project = self.get_object()
        workspace = project.workspace

        # Get IDs of users who are already project members
        existing_member_ids = ProjectMember.objects.filter(
            project=project
        ).values_list('user_id', flat=True)

        # Get workspace members who are not in the project
        available_workspace_members = WorkspaceMember.objects.filter(
            workspace=workspace
        ).exclude(
            user_id__in=existing_member_ids
        ).select_related('user')

        # Extract users from workspace members
        available_users = [wm.user for wm in available_workspace_members]

        serializer = UserMinimalSerializer(available_users, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['GET'])
    def activity_logs(self, request, pk=None):
        """
        Get activity logs for this project and all entities within it.
        GET /api/projects/{id}/activity_logs/
        
        Query params:
        - limit: Number of records (default 50)
        - action: Filter by action type (CREATED, UPDATED, etc.)
        
        Returns activity logs including:
        - Who did it (user)
        - What happened (action)
        - When it happened (timestamp)
        - Why / reason
        - Old → New state for updates
        """
        from pm.models.activity_models import ActivityLog
        from pm.serializers.activity_serializers import ActivityLogSerializer
        from django.db.models import Q
        
        project = self.get_object()
        limit = request.query_params.get('limit', 50)
        action_filter = request.query_params.get('action')
        
        # Get logs for this project and all entities within it
        logs = ActivityLog.objects.filter(
            Q(content_type='Project', object_id=project.id) |
            Q(extra_info__project_id=project.id)
        ).order_by('-timestamp')
        
        if action_filter:
            logs = logs.filter(action=action_filter)
        
        logs = logs[:int(limit)]
        serializer = ActivityLogSerializer(logs, many=True)
        return Response({
            'project_id': project.id,
            'project_name': project.name,
            'total_logs': len(serializer.data),
            'activity_logs': serializer.data
        })

    @action(detail=True, methods=['GET'])
    def kanban(self, request, pk=None):
        """
        Get Kanban board data for this project.
        GET /api/projects/{id}/kanban/

        Returns tasks grouped by status columns (To-do, In Progress, Review, Done).
        """
        project = self.get_object()
        data = get_kanban_for_project(project.id)

        if data is None:
            return Response(
                {'error': 'Project not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response(data)

    @action(detail=True, methods=['GET'])
    def timeline(self, request, pk=None):
        """
        Get timeline/Gantt chart data for this project.
        GET /api/projects/{id}/timeline/

        Returns hierarchical data with project, milestones, sprints, and tasks
        with dates, progress, dependencies, and assignees.
        """
        project = self.get_object()
        data = get_timeline_data(project.id)

        if data is None:
            return Response(
                {'error': 'Project not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response(data)

    @action(detail=True, methods=['POST'])
    def update_timeline_item(self, request, pk=None):
        """
        Update dates for a timeline item (drag & drop support).
        POST /api/projects/{id}/update_timeline_item/

        Body: {
            "item_type": "task|sprint|milestone|project",
            "item_id": 123,
            "start_date": "2024-01-01",  # optional
            "end_date": "2024-01-15"     # optional
        }
        """
        project = self.get_object()
        item_type = request.data.get('item_type')
        item_id = request.data.get('item_id')
        start_date = request.data.get('start_date')
        end_date = request.data.get('end_date')

        if not item_type or not item_id:
            return Response(
                {'error': 'item_type and item_id are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        result = update_item_dates(item_type, item_id, start_date, end_date)

        if result is None:
            return Response(
                {'error': 'Item not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response({
            'status': 'success',
            'updated': result
        })


class MilestoneViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Milestone operations.
    Users can only see milestones from projects they have access to.
    """
    permission_classes = [IsAuthenticated, CanViewProject]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['project', 'status']
    search_fields = ['name', 'description']
    ordering_fields = ['start_date', 'end_date', 'name']
    ordering = ['start_date']

    def get_queryset(self):
        """Filter milestones to only those from accessible projects"""
        accessible_projects = get_accessible_projects(self.request.user)
        return Milestone.objects.filter(project__in=accessible_projects)

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return MilestoneCreateUpdateSerializer
        return MilestoneSerializer
    
    def perform_create(self, serializer):
        """Create milestone and log audit event"""
        milestone = serializer.save()
        AuditService.log_create(
            user=self.request.user,
            instance=milestone,
            reason=self.request.data.get('reason', 'Milestone created')
        )

    def perform_update(self, serializer):
        """Update milestone and log audit event with old/new state"""
        old_state = AuditService.capture_state(serializer.instance)
        milestone = serializer.save()
        
        AuditService.log_update(
            user=self.request.user,
            instance=milestone,
            old_state=old_state,
            reason=self.request.data.get('reason', 'Milestone updated')
        )

    def perform_destroy(self, instance):
        """Delete milestone and log audit event"""
        AuditService.log_delete(
            user=self.request.user,
            instance=instance,
            reason=self.request.data.get('reason', 'Milestone deleted')
        )
        instance.delete()

    @action(detail=True, methods=['GET'])
    def activity_logs(self, request, pk=None):
        """
        Get activity logs for this milestone and all entities within it.
        GET /api/milestones/{id}/activity_logs/
        
        Query params:
        - limit: Number of records (default 50)
        - action: Filter by action type (CREATED, UPDATED, etc.)
        
        Returns activity logs including:
        - Who did it (user)
        - What happened (action)
        - When it happened (timestamp)
        - Why / reason
        - Old → New state for updates
        """
        from pm.models.activity_models import ActivityLog
        from pm.serializers.activity_serializers import ActivityLogSerializer
        from django.db.models import Q
        
        milestone = self.get_object()
        limit = request.query_params.get('limit', 50)
        action_filter = request.query_params.get('action')
        
        # Get logs for this milestone and all entities within it
        logs = ActivityLog.objects.filter(
            Q(content_type='Milestone', object_id=milestone.id) |
            Q(extra_info__milestone_id=milestone.id)
        ).order_by('-timestamp')
        
        if action_filter:
            logs = logs.filter(action=action_filter)
        
        logs = logs[:int(limit)]
        serializer = ActivityLogSerializer(logs, many=True)
        return Response({
            'milestone_id': milestone.id,
            'milestone_name': milestone.name,
            'total_logs': len(serializer.data),
            'activity_logs': serializer.data
        })


class SprintViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Sprint operations.
    Users can only see sprints from projects they have access to (via milestone).
    """
    permission_classes = [IsAuthenticated, CanViewProject]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['milestone', 'status']
    search_fields = ['name', 'description']
    ordering_fields = ['start_date', 'end_date', 'name']
    ordering = ['start_date']

    def get_queryset(self):
        """Filter sprints to only those from accessible projects"""
        accessible_projects = get_accessible_projects(self.request.user)
        return Sprint.objects.filter(milestone__project__in=accessible_projects)

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return SprintCreateUpdateSerializer
        return SprintSerializer
    
    def perform_create(self, serializer):
        """Create sprint and log audit event"""
        sprint = serializer.save()
        AuditService.log_create(
            user=self.request.user,
            instance=sprint,
            reason=self.request.data.get('reason', 'Sprint created')
        )

    def perform_update(self, serializer):
        """Update sprint and log audit event with old/new state"""
        old_state = AuditService.capture_state(serializer.instance)
        sprint = serializer.save()
        
        AuditService.log_update(
            user=self.request.user,
            instance=sprint,
            old_state=old_state,
            reason=self.request.data.get('reason', 'Sprint updated')
        )

    def perform_destroy(self, instance):
        """Delete sprint and log audit event"""
        AuditService.log_delete(
            user=self.request.user,
            instance=instance,
            reason=self.request.data.get('reason', 'Sprint deleted')
        )
        instance.delete()

    @action(detail=True, methods=['GET'])
    def activity_logs(self, request, pk=None):
        """
        Get activity logs for this sprint and all tasks within it.
        GET /api/sprints/{id}/activity_logs/
        
        Query params:
        - limit: Number of records (default 50)
        - action: Filter by action type (CREATED, UPDATED, etc.)
        
        Returns activity logs including:
        - Who did it (user)
        - What happened (action)
        - When it happened (timestamp)
        - Why / reason
        - Old → New state for updates
        """
        from pm.models.activity_models import ActivityLog
        from pm.serializers.activity_serializers import ActivityLogSerializer
        from django.db.models import Q
        
        sprint = self.get_object()
        limit = request.query_params.get('limit', 50)
        action_filter = request.query_params.get('action')
        
        # Get logs for this sprint and all tasks within it
        logs = ActivityLog.objects.filter(
            Q(content_type='Sprint', object_id=sprint.id) |
            Q(extra_info__sprint_id=sprint.id)
        ).order_by('-timestamp')
        
        if action_filter:
            logs = logs.filter(action=action_filter)
        
        logs = logs[:int(limit)]
        serializer = ActivityLogSerializer(logs, many=True)
        return Response({
            'sprint_id': sprint.id,
            'sprint_name': sprint.name,
            'total_logs': len(serializer.data),
            'activity_logs': serializer.data
        })

    @action(detail=True, methods=['GET'])
    def kanban(self, request, pk=None):
        """
        Get Kanban board data for this sprint.
        GET /api/sprints/{id}/kanban/

        Returns tasks grouped by status columns (To-do, In Progress, Review, Done).
        """
        sprint = self.get_object()
        data = get_kanban_for_sprint(sprint.id)

        if data is None:
            return Response(
                {'error': 'Sprint not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response(data)
