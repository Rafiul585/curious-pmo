from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter

from pm.models.workspace_models import Tag, WorkspaceMember
from pm.serializers.tag_serializers import TagSerializer


class TagViewSet(viewsets.ModelViewSet):
    """Workspace-scoped tag management."""
    permission_classes = [IsAuthenticated]
    serializer_class = TagSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['workspace']
    search_fields = ['name']

    def get_queryset(self):
        workspace_ids = WorkspaceMember.objects.filter(
            user=self.request.user
        ).values_list('workspace_id', flat=True)
        return Tag.objects.filter(workspace_id__in=workspace_ids)
