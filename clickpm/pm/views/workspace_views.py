from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Q

from pm.models.workspace_models import Workspace, WorkspaceMember
from pm.models.project_models import Project
from pm.models.user_models import User
from pm.models.access_models import WorkspaceProjectAccess
from pm.serializers.workspace_serializers import (
    WorkspaceSerializer, 
    WorkspaceDetailSerializer, 
    WorkspaceCreateUpdateSerializer,
    WorkspaceMemberSerializer
)
from pm.serializers.project_serializers import ProjectSerializer
from pm.serializers.access_serializers import (
    WorkspaceProjectAccessSerializer,
    GrantProjectAccessSerializer
)
from pm.permissions import IsWorkspaceMember, IsWorkspaceAdmin
from pm.services.audit_service import AuditService, EventType


class WorkspaceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Workspace CRUD operations and member management.
    Users can only see workspaces where they are members or owners.
    """
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        """Filter to workspaces where user is a member or owner.
        Superusers can see all workspaces."""
        user = self.request.user
        if user.is_superuser:
            return Workspace.objects.all()
        return Workspace.objects.filter(
            Q(owner=user) | Q(members=user)
        ).distinct()

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return WorkspaceDetailSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return WorkspaceCreateUpdateSerializer
        return WorkspaceSerializer

    def get_permissions(self):
        """Apply permissions based on action"""
        if self.action in ['grant_project_access', 'revoke_project_access', 'member_project_access']:
            return [IsAuthenticated(), IsWorkspaceAdmin()]
        if self.action in ['retrieve', 'update', 'partial_update', 'destroy', 'add_member', 'remove_member']:
            return [IsAuthenticated(), IsWorkspaceMember()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        """Create workspace and log audit event"""
        workspace = serializer.save()
        AuditService.log_create(
            user=self.request.user,
            instance=workspace,
            reason=self.request.data.get('reason', 'Workspace created')
        )

    def perform_update(self, serializer):
        """Update workspace and log audit event with old/new state"""
        # Capture old state before update
        old_state = AuditService.capture_state(serializer.instance)
        
        workspace = serializer.save()
        
        AuditService.log_update(
            user=self.request.user,
            instance=workspace,
            old_state=old_state,
            reason=self.request.data.get('reason', 'Workspace updated')
        )

    def perform_destroy(self, instance):
        """Delete workspace and log audit event"""
        AuditService.log_delete(
            user=self.request.user,
            instance=instance,
            reason=self.request.data.get('reason', 'Workspace deleted')
        )
        instance.delete()

    @action(detail=True, methods=['POST'])
    def add_member(self, request, pk=None):
        """
        Add a member to the workspace.
        POST /api/workspaces/{id}/add_member/
        Body: {"user_id": 123, "is_admin": false}
        """
        workspace = self.get_object()
        user_id = request.data.get('user_id')
        is_admin = request.data.get('is_admin', False)

        if not user_id:
            return Response(
                {'error': 'user_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check if user is already a member
        member, created = WorkspaceMember.objects.get_or_create(
            workspace=workspace,
            user=user,
            defaults={'is_admin': is_admin}
        )

        if not created:
            # Capture old state and update existing member
            old_state = AuditService.capture_state(member)
            member.is_admin = is_admin
            member.save()
            
            # Log role change
            AuditService.log_event(
                user=request.user,
                instance=member,
                action=EventType.WORKSPACE_MEMBER_ROLE_CHANGED,
                old_state=old_state,
                new_state=AuditService.capture_state(member),
                reason=request.data.get('reason', 'Member role updated'),
                extra_info={'target_user': user.username}
            )
            return Response({'status': 'Member updated', 'created': False})

        # Log member added
        AuditService.log_event(
            user=request.user,
            instance=member,
            action=EventType.WORKSPACE_MEMBER_ADDED,
            new_state=AuditService.capture_state(member),
            reason=request.data.get('reason', 'Member added to workspace'),
            extra_info={'target_user': user.username}
        )
        return Response({'status': 'Member added', 'created': True}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['POST'])
    def remove_member(self, request, pk=None):
        """
        Remove a member from the workspace.
        POST /api/workspaces/{id}/remove_member/
        Body: {"user_id": 123}
        """
        workspace = self.get_object()
        user_id = request.data.get('user_id')

        if not user_id:
            return Response(
                {'error': 'user_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Prevent removing the owner
        if workspace.owner_id == user_id:
            return Response(
                {'error': 'Cannot remove workspace owner'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            member = WorkspaceMember.objects.get(
                workspace=workspace,
                user_id=user_id
            )
            
            # Log member removal before deleting
            AuditService.log_event(
                user=request.user,
                instance=member,
                action=EventType.WORKSPACE_MEMBER_REMOVED,
                old_state=AuditService.capture_state(member),
                reason=request.data.get('reason', 'Member removed from workspace'),
                extra_info={'target_user': member.user.username}
            )
            
            member.delete()
            return Response({'status': 'Member removed'})
        except WorkspaceMember.DoesNotExist:
            return Response(
                {'error': 'Member not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['GET'])
    def my_workspaces(self, request):
        """
        Get workspaces where the current user is a member or owner.
        GET /api/workspaces/my_workspaces/
        """
        workspaces = self.get_queryset()
        serializer = WorkspaceSerializer(workspaces, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['GET'])
    def workspace_projects(self, request, pk=None):
        """
        Get projects in this workspace, filtered by visibility and membership.
        Workspace members see public projects.
        Project members see all projects (public + private).
        GET /api/workspaces/{id}/workspace_projects/
        """
        workspace = self.get_object()
        user = request.user
        
        # Use the helper logic to get accessible projects
        from pm.utils.permission_helpers import get_accessible_projects
        accessible_projects = get_accessible_projects(user)
        
        # Filter to projects in this workspace
        projects = accessible_projects.filter(workspace=workspace)

        serializer = ProjectSerializer(projects, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['GET'])
    def members(self, request, pk=None):
        """
        Get all members of the workspace.
        GET /api/workspaces/{id}/members/
        """
        workspace = self.get_object()
        members = WorkspaceMember.objects.filter(workspace=workspace)
        serializer = WorkspaceMemberSerializer(members, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['POST'])
    def grant_project_access(self, request, pk=None):
        """
        Grant workspace member access to specific project.
        POST /api/workspaces/{id}/grant_project_access/
        Body: {
            "user_id": 123,
            "project_id": 456,
            "can_view": true,
            "can_edit": false
        }
        Requires: Workspace admin permission
        """
        workspace = self.get_object()
        serializer = GrantProjectAccessSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        data = serializer.validated_data
        
        # Verify user is a workspace member
        try:
            member = WorkspaceMember.objects.get(workspace=workspace, user_id=data['user_id'])
        except WorkspaceMember.DoesNotExist:
            return Response(
                {'error': 'User is not a member of this workspace'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Verify project belongs to workspace
        try:
            project = Project.objects.get(id=data['project_id'], workspace=workspace)
        except Project.DoesNotExist:
            return Response(
                {'error': 'Project not found in this workspace'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Create or update access grant
        access, created = WorkspaceProjectAccess.objects.update_or_create(
            workspace_member=member,
            project=project,
            defaults={
                'can_view': data['can_view'],
                'can_edit': data['can_edit'],
                'granted_by': request.user
            }
        )
        
        # Log project access grant
        AuditService.log_event(
            user=request.user,
            instance=access,
            action=EventType.WORKSPACE_PROJECT_ACCESS_GRANTED,
            new_state={
                'can_view': access.can_view,
                'can_edit': access.can_edit,
                'project_id': project.id,
                'project_name': project.name,
                'target_user_id': member.user_id,
                'target_user': member.user.username
            },
            reason=request.data.get('reason', 'Project access granted'),
            extra_info={
                'workspace_id': workspace.id,
                'workspace_name': workspace.name
            }
        )
        
        return Response({
            'status': 'Access granted',
            'can_view': access.can_view,
            'can_edit': access.can_edit
        })

    @action(detail=True, methods=['POST'])
    def revoke_project_access(self, request, pk=None):
        """
        Revoke workspace member's project access.
        POST /api/workspaces/{id}/revoke_project_access/
        Body: {"user_id": 123, "project_id": 456}
        Requires: Workspace admin permission
        """
        workspace = self.get_object()
        user_id = request.data.get('user_id')
        project_id = request.data.get('project_id')
        
        if not user_id or not project_id:
            return Response(
                {'error': 'user_id and project_id are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            access_queryset = WorkspaceProjectAccess.objects.filter(
                workspace_member__workspace=workspace,
                workspace_member__user_id=user_id,
                project_id=project_id
            )
            
            # Log before deletion
            for access in access_queryset:
                AuditService.log_event(
                    user=request.user,
                    instance=access,
                    action=EventType.WORKSPACE_PROJECT_ACCESS_REVOKED,
                    old_state={
                        'can_view': access.can_view,
                        'can_edit': access.can_edit,
                        'project_id': access.project_id,
                        'target_user_id': access.workspace_member.user_id
                    },
                    reason=request.data.get('reason', 'Project access revoked'),
                    extra_info={
                        'workspace_id': workspace.id,
                        'workspace_name': workspace.name
                    }
                )
            
            access_queryset.delete()
            return Response({'status': 'Access revoked'})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['GET'])
    def member_project_access(self, request, pk=None):
        """
        List all project access grants for workspace members.
        GET /api/workspaces/{id}/member_project_access/
        Requires: Workspace admin permission
        """
        workspace = self.get_object()
        grants = WorkspaceProjectAccess.objects.filter(workspace_member__workspace=workspace)
        serializer = WorkspaceProjectAccessSerializer(grants, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['GET'])
    def activity_logs(self, request, pk=None):
        """
        Get activity logs for this workspace and all entities within it.
        GET /api/workspaces/{id}/activity_logs/
        
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
        
        workspace = self.get_object()
        limit = request.query_params.get('limit', 50)
        action_filter = request.query_params.get('action')
        
        # Get logs for this workspace and all entities within it
        logs = ActivityLog.objects.filter(
            Q(content_type='Workspace', object_id=workspace.id) |
            Q(extra_info__workspace_id=workspace.id)
        ).order_by('-timestamp')
        
        if action_filter:
            logs = logs.filter(action=action_filter)
        
        logs = logs[:int(limit)]
        serializer = ActivityLogSerializer(logs, many=True)
        return Response({
            'workspace_id': workspace.id,
            'workspace_name': workspace.name,
            'total_logs': logs.count() if hasattr(logs, 'count') else len(logs),
            'activity_logs': serializer.data
        })
