from django.db import models
from .user_models import User
from .workspace_models import Workspace, Tag


class TaskTemplate(models.Model):
    workspace            = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name='task_templates')
    name                 = models.CharField(max_length=200)
    description          = models.TextField(blank=True)
    default_priority     = models.CharField(max_length=20, default='Medium')
    default_tags         = models.ManyToManyField(Tag, blank=True, related_name='task_templates')
    checklist_items      = models.JSONField(default=list, blank=True)  # [{"text": "...", "is_checked": false}]
    custom_field_defaults = models.JSONField(default=dict, blank=True)
    created_by           = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_templates')
    created_at           = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']
        unique_together = ('workspace', 'name')

    def __str__(self):
        return f"{self.workspace.name} / {self.name}"
