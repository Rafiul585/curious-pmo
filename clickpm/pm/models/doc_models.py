from django.db import models
from pm.models.project_models import Project
from pm.models.user_models import User


class Doc(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='docs')
    title = models.CharField(max_length=300)
    content = models.TextField(blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_docs')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return self.title
