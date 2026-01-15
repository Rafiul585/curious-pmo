from rest_framework import serializers
from pm.models.notification_models import Notification
from pm.serializers.user_serializers import UserMinimalSerializer
from django.contrib.contenttypes.models import ContentType


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for Notification"""
    actor = UserMinimalSerializer(read_only=True)
    recipient = UserMinimalSerializer(read_only=True)
    target_type = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = [
            'id', 'recipient', 'actor', 'verb', 'notification_type',
            'target_type', 'target_object_id', 'read', 'timestamp'
        ]
        read_only_fields = ['timestamp']
    
    def get_target_type(self, obj):
        """Get readable target type name"""
        if obj.target_content_type:
            return obj.target_content_type.model
        return None


class NotificationCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating notifications programmatically"""
    
    class Meta:
        model = Notification
        fields = [
            'recipient', 'actor', 'verb', 'notification_type',
            'target_content_type', 'target_object_id'
        ]
