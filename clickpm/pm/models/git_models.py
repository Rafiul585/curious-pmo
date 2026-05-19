from django.db import models
from .workspace_models import Workspace
from .task_models import Task


class GitIntegration(models.Model):
    PROVIDER_CHOICES = [('github', 'GitHub'), ('gitlab', 'GitLab')]

    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name='git_integrations')
    provider = models.CharField(max_length=20, choices=PROVIDER_CHOICES, default='github')
    repo_url = models.URLField()
    webhook_secret = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('workspace', 'repo_url')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_provider_display()} — {self.repo_url}"


class TaskGitLink(models.Model):
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('merged', 'Merged'),
        ('closed', 'Closed'),
    ]

    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='git_links')
    integration = models.ForeignKey(
        GitIntegration, on_delete=models.SET_NULL, null=True, blank=True
    )
    pr_url = models.URLField(blank=True)
    pr_number = models.PositiveIntegerField(null=True, blank=True)
    pr_title = models.CharField(max_length=500, blank=True)
    commit_sha = models.CharField(max_length=40, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        label = self.pr_url or (self.commit_sha[:8] if self.commit_sha else 'link')
        return f"Task {self.task_id} — {label}"
