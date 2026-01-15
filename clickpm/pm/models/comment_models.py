from django.db import models
from .user_models import User
from .task_models import Task
from .project_models import Project, Sprint

class Comment(models.Model):
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Polymorphic relation - comments can be on Task, Sprint, or Project
    task = models.ForeignKey(Task, on_delete=models.CASCADE, null=True, blank=True, related_name='comments')
    sprint = models.ForeignKey(Sprint, on_delete=models.CASCADE, null=True, blank=True, related_name='comments')
    project = models.ForeignKey(Project, on_delete=models.CASCADE, null=True, blank=True, related_name='comments')

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        resource = "Task" if self.task else ("Sprint" if self.sprint else ("Project" if self.project else "Unknown"))
        return f"Comment by {self.author.username} on {resource}"
