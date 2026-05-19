from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from pm.models.task_models import Checklist, ChecklistItem
from pm.serializers.checklist_serializers import ChecklistSerializer, ChecklistItemSerializer


class ChecklistViewSet(viewsets.ModelViewSet):
    """
    GET  /api/checklists/?task={id}   — list checklists for a task
    POST /api/checklists/             — create a checklist  { "task": 1, "title": "..." }
    PATCH/DELETE /api/checklists/{id}/
    """
    serializer_class = ChecklistSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['task']

    def get_queryset(self):
        return Checklist.objects.filter(
            task__sprint__milestone__project__members=self.request.user
        ).distinct().prefetch_related('items')


class ChecklistItemViewSet(viewsets.ModelViewSet):
    """
    POST   /api/checklist-items/        — add item  { "checklist": 1, "text": "..." }
    PATCH  /api/checklist-items/{id}/   — toggle is_checked or edit text
    DELETE /api/checklist-items/{id}/
    """
    serializer_class = ChecklistItemSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['checklist']

    def get_queryset(self):
        return ChecklistItem.objects.filter(
            checklist__task__sprint__milestone__project__members=self.request.user
        ).distinct()
