from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from pm.models.notification_models import Notification
from pm.serializers.notification_serializers import NotificationSerializer


class NotificationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Notification operations.
    Users can view their notifications and mark them as read.
    """
    queryset = Notification.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['notification_type', 'read']
    ordering_fields = ['timestamp']
    ordering = ['-timestamp']
    http_method_names = ['get', 'post', 'patch', 'delete']  # POST needed for mark_read actions

    def get_queryset(self):
        """Users can only see their own notifications"""
        return Notification.objects.filter(recipient=self.request.user)

    def get_serializer_class(self):
        return NotificationSerializer

    @action(detail=False, methods=['GET'])
    def unread(self, request):
        """Get all unread notifications for the current user"""
        notifications = self.get_queryset().filter(read=False)
        serializer = NotificationSerializer(notifications, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['POST'])
    def mark_all_read(self, request):
        """Mark all notifications as read for the current user"""
        updated_count = self.get_queryset().filter(read=False).update(read=True)
        return Response({
            'message': f'Marked {updated_count} notifications as read'
        })

    @action(detail=True, methods=['POST'])
    def mark_read(self, request, pk=None):
        """Mark a specific notification as read"""
        notification = self.get_object()
        notification.mark_as_read()
        return Response({
            'message': 'Notification marked as read'
        })

    @action(detail=False, methods=['GET'])
    def count_unread(self, request):
        """Get count of unread notifications"""
        count = self.get_queryset().filter(read=False).count()
        return Response({'unread_count': count})
