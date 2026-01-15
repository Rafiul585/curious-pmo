from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Q

from pm.models.task_models import Task, TaskDependency
from pm.models.project_models import Project
from pm.models.workspace_models import WorkspaceMember
from pm.serializers.task_serializers import (
    TaskSerializer, TaskDetailSerializer, TaskCreateUpdateSerializer,
    TaskDependencySerializer, TaskDependencyCreateUpdateSerializer
)
from pm.permissions import IsTaskAssignee, CanViewProject
from pm.services.audit_service import AuditService, EventType
from pm.services.kanban_service import get_kanban_for_user
from pm.services.notification_service import NotificationService


class TaskViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsTaskAssignee | CanViewProject]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'priority', 'assignee', 'reporter', 'sprint']
    search_fields = ['title', 'description']
    ordering_fields = ['due_date', 'start_date', 'priority']
    ordering = ['-id']

    def get_queryset(self):
        user = self.request.user
        user_workspace_ids = WorkspaceMember.objects.filter(user=user).values_list('workspace_id', flat=True)
        visible_projects = Project.objects.filter(
            Q(members=user) |
            (Q(workspace__in=user_workspace_ids) & Q(visibility='public'))
        )

        queryset = Task.objects.filter(
            Q(assignee=user) |
            Q(reporter=user) |
            Q(sprint__milestone__project__in=visible_projects)
        ).distinct()

        # Filter by project if provided (tasks belong to project via sprint → milestone → project)
        project_id = self.request.query_params.get('project')
        if project_id:
            queryset = queryset.filter(sprint__milestone__project_id=project_id)

        return queryset

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return TaskDetailSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return TaskCreateUpdateSerializer
        return TaskSerializer

    def perform_create(self, serializer):
        """Create task and log audit event"""
        task = serializer.save()

        # Log task creation
        AuditService.log_create(
            user=self.request.user,
            instance=task,
            reason=self.request.data.get('reason', 'Task created')
        )

        # Notify assignee if task is assigned to someone other than the creator
        if task.assignee and task.assignee != self.request.user:
            NotificationService.notify_task_assignment(task)

    def perform_update(self, serializer):
        """Update task and log audit event with old/new state"""
        old_state = AuditService.capture_state(serializer.instance)
        old_assignee = serializer.instance.assignee
        old_status = serializer.instance.status
        task = serializer.save()

        # Log task update
        AuditService.log_update(
            user=self.request.user,
            instance=task,
            old_state=old_state,
            reason=self.request.data.get('reason', 'Task updated')
        )

        # Notify new assignee if assignment changed (and not self-assignment)
        if task.assignee and task.assignee != old_assignee and task.assignee != self.request.user:
            NotificationService.notify_task_assignment(task, old_assignee)

        # Notify about status change
        if task.status != old_status:
            NotificationService.notify_task_status_change(task, old_status, self.request.user)

    def perform_destroy(self, instance):
        """Delete task and log audit event"""
        AuditService.log_delete(
            user=self.request.user,
            instance=instance,
            reason=self.request.data.get('reason', 'Task deleted')
        )
        instance.delete()

    @action(detail=True, methods=['POST'])
    def assign_to_me(self, request, pk=None):
        """Assign task to current user with audit logging"""
        task = self.get_object()
        old_state = AuditService.capture_state(task)
        old_assignee = task.assignee
        
        task.assignee = request.user
        task.save()
        
        # Log assignment
        AuditService.log_event(
            user=request.user,
            instance=task,
            action=EventType.TASK_ASSIGNED,
            old_state=old_state,
            new_state=AuditService.capture_state(task),
            reason=request.data.get('reason', 'Task self-assigned'),
            extra_info={
                'old_assignee': old_assignee.username if old_assignee else None,
                'new_assignee': request.user.username
            }
        )
        
        return Response({'status': 'Task assigned to you'})

    @action(detail=True, methods=['POST'])
    def change_status(self, request, pk=None):
        """Change task status with audit logging"""
        task = self.get_object()
        old_state = AuditService.capture_state(task)
        old_status = task.status
        
        new_status = request.data.get('status')
        if not new_status:
            return Response({'error': 'status is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        task.status = new_status
        task.save()
        
        # Log status change
        AuditService.log_event(
            user=request.user,
            instance=task,
            action=EventType.TASK_STATUS_CHANGED,
            old_state=old_state,
            new_state=AuditService.capture_state(task),
            reason=request.data.get('reason', f'Status changed from {old_status} to {new_status}'),
            extra_info={
                'old_status': old_status,
                'new_status': new_status
            }
        )
        
        return Response({'status': f'Task status changed to {new_status}'})

    @action(detail=False, methods=['GET'])
    def my_tasks(self, request):
        tasks = Task.objects.filter(assignee=request.user)
        serializer = TaskSerializer(tasks, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['GET'])
    def reported_by_me(self, request):
        tasks = Task.objects.filter(reporter=request.user)
        serializer = TaskSerializer(tasks, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['GET'])
    def my_kanban(self, request):
        """
        Get Kanban board for current user's assigned tasks.
        GET /api/tasks/my_kanban/

        Query params:
        - project: Filter by project ID (optional)

        Returns tasks grouped by status columns (To-do, In Progress, Review, Done).
        """
        project_id = request.query_params.get('project')
        data = get_kanban_for_user(request.user, project_id=project_id)
        return Response(data)

    @action(detail=True, methods=['GET'])
    def activity_logs(self, request, pk=None):
        """
        Get activity logs for this specific task.
        GET /api/tasks/{id}/activity_logs/
        
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
        
        task = self.get_object()
        limit = request.query_params.get('limit', 50)
        action_filter = request.query_params.get('action')
        
        # Get logs for this specific task
        logs = ActivityLog.objects.filter(
            Q(content_type='Task', object_id=task.id) |
            Q(extra_info__task_id=task.id)
        ).order_by('-timestamp')
        
        if action_filter:
            logs = logs.filter(action=action_filter)
        
        logs = logs[:int(limit)]
        serializer = ActivityLogSerializer(logs, many=True)
        return Response({
            'task_id': task.id,
            'task_title': task.title,
            'total_logs': len(serializer.data),
            'activity_logs': serializer.data
        })

class TaskDependencyViewSet(viewsets.ModelViewSet):
    queryset = TaskDependency.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['task', 'depends_on', 'type']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return TaskDependencyCreateUpdateSerializer
        return TaskDependencySerializer
