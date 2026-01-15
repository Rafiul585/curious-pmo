from django.db import models
from .user_models import User
from django.contrib.contenttypes.models import ContentType

class ActivityLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=255)  # create/update/delete
    content_type = models.CharField(max_length=100)  # model name
    object_id = models.PositiveIntegerField()
    reason = models.TextField(null=True, blank=True)  # why the change
    old_value = models.JSONField(null=True, blank=True)  # previous state
    new_value = models.JSONField(null=True, blank=True)  # updated state
    extra_info = models.JSONField(null=True, blank=True)  # workspace/project info
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user} - {self.action} {self.content_type}({self.object_id}) at {self.timestamp}"
