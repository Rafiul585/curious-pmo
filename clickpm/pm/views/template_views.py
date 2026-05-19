from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from pm.models.template_models import TaskTemplate
from pm.models.workspace_models import WorkspaceMember
from pm.serializers.template_serializers import TaskTemplateSerializer


class TaskTemplateViewSet(viewsets.ModelViewSet):
    """
    CRUD for TaskTemplate (workspace-scoped).
    GET  /api/task-templates/?workspace=<id>
    POST /api/task-templates/
    PATCH/DELETE /api/task-templates/<id>/
    """
    permission_classes = [IsAuthenticated]
    serializer_class   = TaskTemplateSerializer
    filter_backends    = [DjangoFilterBackend]
    filterset_fields   = ['workspace']

    def get_queryset(self):
        user_workspace_ids = WorkspaceMember.objects.filter(
            user=self.request.user
        ).values_list('workspace_id', flat=True)
        owned_ids = list(
            self.request.user.owned_workspaces.values_list('id', flat=True)
        )
        all_ids = set(list(user_workspace_ids) + owned_ids)
        return TaskTemplate.objects.filter(workspace_id__in=all_ids).prefetch_related('default_tags')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
