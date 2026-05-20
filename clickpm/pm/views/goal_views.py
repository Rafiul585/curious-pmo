from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from pm.models.goal_models import Goal, GoalTarget
from pm.models.workspace_models import WorkspaceMember
from pm.serializers.goal_serializers import GoalSerializer, GoalTargetSerializer


class GoalViewSet(viewsets.ModelViewSet):
    """
    CRUD for Goals scoped to workspaces the user belongs to.
    GET  /api/goals/?workspace=<id>
    POST /api/goals/
    PATCH/DELETE /api/goals/<id>/
    POST /api/goals/<id>/sync/ — re-calculate progress from linked projects
    """
    permission_classes = [IsAuthenticated]
    serializer_class   = GoalSerializer
    filter_backends    = [DjangoFilterBackend]
    filterset_fields   = ['workspace']

    def get_queryset(self):
        user_workspace_ids = WorkspaceMember.objects.filter(
            user=self.request.user
        ).values_list('workspace_id', flat=True)
        # Also include workspaces the user owns
        owned_ids = list(
            self.request.user.owned_workspaces.values_list('id', flat=True)
        )
        all_ids = set(list(user_workspace_ids) + owned_ids)
        return Goal.objects.filter(workspace_id__in=all_ids).prefetch_related('targets__linked_project')

    @action(detail=True, methods=['POST'])
    def sync(self, request, pk=None):
        """Sync progress for all task_completion targets from their linked projects."""
        goal = self.get_object()
        for target in goal.targets.filter(target_type='task_completion', linked_project__isnull=False):
            target.sync_current()
        goal.recalculate_progress()
        return Response(GoalSerializer(goal).data)


class GoalTargetViewSet(viewsets.ModelViewSet):
    """
    CRUD for GoalTargets.
    GET  /api/goal-targets/?goal=<id>
    POST /api/goal-targets/
    PATCH/DELETE /api/goal-targets/<id>/
    """
    permission_classes = [IsAuthenticated]
    serializer_class   = GoalTargetSerializer
    filter_backends    = [DjangoFilterBackend]
    filterset_fields   = ['goal']

    def get_queryset(self):
        user_workspace_ids = WorkspaceMember.objects.filter(
            user=self.request.user
        ).values_list('workspace_id', flat=True)
        owned_ids = list(
            self.request.user.owned_workspaces.values_list('id', flat=True)
        )
        all_ids = set(list(user_workspace_ids) + owned_ids)
        return GoalTarget.objects.filter(goal__workspace_id__in=all_ids)

    def perform_create(self, serializer):
        target = serializer.save()
        # Auto-sync current if it's a task_completion target
        if target.target_type == 'task_completion' and target.linked_project:
            target.sync_current()
        target.goal.recalculate_progress()

    def perform_update(self, serializer):
        target = serializer.save()
        if target.target_type == 'task_completion' and target.linked_project:
            target.sync_current()
        target.goal.recalculate_progress()

    def perform_destroy(self, instance):
        goal = instance.goal
        instance.delete()
        goal.recalculate_progress()
