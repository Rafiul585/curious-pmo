from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from .user_models import User


class Notification(models.Model):
    """
    Notification model for user alerts.
    Supports mentions, deadline reminders, task assignments, and member notifications.
    """
    NOTIFICATION_TYPES = [
        ('mention', 'Mention'),
        ('deadline', 'Deadline'),
        ('assignment', 'Assignment'),
        ('comment', 'Comment'),
        ('member_added', 'Member Added'),
        ('status_change', 'Status Change'),
        ('general', 'General'),
    ]
    
    recipient = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='notifications'
    )
    
    # Actor can be null for system notifications (e.g., deadline)
    actor = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='notifications_sent'
    )
    
    verb = models.CharField(max_length=255)
    notification_type = models.CharField(
        max_length=20, 
        choices=NOTIFICATION_TYPES, 
        default='general'
    )
    
    # Generic relation to any object (Task, Project, etc.)
    target_content_type = models.ForeignKey(
        ContentType, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True
    )
    target_object_id = models.PositiveIntegerField(null=True, blank=True)
    target = GenericForeignKey('target_content_type', 'target_object_id')
    
    read = models.BooleanField(default=False)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['recipient', '-timestamp']),
            models.Index(fields=['read']),
        ]
    
    def __str__(self):
        return f"{self.recipient.username} - {self.verb}"
    
    def mark_as_read(self):
        """Mark this notification as read"""
        self.read = True
        self.save()
