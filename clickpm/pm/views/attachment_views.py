from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter

from pm.models.attachment_models import Attachment
from pm.serializers.attachment_serializers import (
    AttachmentSerializer, AttachmentCreateUpdateSerializer
)


class AttachmentViewSet(viewsets.ModelViewSet):
    queryset = Attachment.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['comment', 'task']
    ordering_fields = ['uploaded_at']
    ordering = ['-uploaded_at']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return AttachmentCreateUpdateSerializer
        return AttachmentSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)

    @action(detail=False, methods=['GET'])
    def task_attachments(self, request):
        """Get attachments for a specific task."""
        task_id = request.query_params.get('task_id')
        if not task_id:
            return Response({'error': 'task_id is required'}, status=400)

        attachments = Attachment.objects.filter(task_id=task_id)
        serializer = AttachmentSerializer(attachments, many=True, context={'request': request})
        return Response(serializer.data)
