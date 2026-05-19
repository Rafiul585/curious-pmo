from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from pm.models.doc_models import Doc
from pm.serializers.doc_serializers import DocListSerializer, DocDetailSerializer
from pm.utils.permission_helpers import can_user_view_project
from pm.models.project_models import Project


class DocViewSet(viewsets.ModelViewSet):
    """
    GET    /api/docs/?project=<id>  — list docs for a project
    POST   /api/docs/               — create a doc
    GET    /api/docs/<id>/          — retrieve a doc with content
    PATCH  /api/docs/<id>/          — update title/content
    DELETE /api/docs/<id>/          — delete
    """
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['project']

    def get_serializer_class(self):
        if self.action in ('retrieve', 'create', 'update', 'partial_update'):
            return DocDetailSerializer
        return DocListSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Doc.objects.all()
        accessible_project_ids = [
            p.id for p in Project.objects.all()
            if can_user_view_project(user, p)
        ]
        return Doc.objects.filter(project_id__in=accessible_project_ids)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
