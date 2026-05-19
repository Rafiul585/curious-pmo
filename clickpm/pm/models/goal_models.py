from django.db import models
from .user_models import User
from .workspace_models import Workspace
from .project_models import Project


class Goal(models.Model):
    workspace   = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name='goals')
    name        = models.CharField(max_length=300)
    description = models.TextField(blank=True)
    owner       = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='owned_goals')
    due_date    = models.DateField(null=True, blank=True)
    progress    = models.FloatField(default=0)  # 0–100, auto-calculated or manual
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name

    def recalculate_progress(self):
        """Average progress across all targets."""
        targets = self.targets.all()
        if not targets.exists():
            return
        total = sum(t.get_progress_pct() for t in targets)
        self.progress = round(total / targets.count(), 1)
        self.save(update_fields=['progress'])


class GoalTarget(models.Model):
    TARGET_TYPES = [
        ('task_completion', 'Task Completion %'),
        ('number',          'Number'),
        ('currency',        'Currency'),
    ]
    goal           = models.ForeignKey(Goal, on_delete=models.CASCADE, related_name='targets')
    name           = models.CharField(max_length=200)
    target_type    = models.CharField(max_length=30, choices=TARGET_TYPES)
    current        = models.FloatField(default=0)
    target         = models.FloatField()
    linked_project = models.ForeignKey(Project, null=True, blank=True, on_delete=models.SET_NULL, related_name='goal_targets')

    class Meta:
        ordering = ['id']

    def __str__(self):
        return f"{self.goal.name} — {self.name}"

    def get_progress_pct(self) -> float:
        if self.target_type == 'task_completion' and self.linked_project:
            return self.linked_project.calculate_completion_percentage()
        if self.target and self.target > 0:
            return min(100.0, (self.current / self.target) * 100)
        return 0.0

    def sync_current(self):
        """For task_completion targets, pull current from the linked project."""
        if self.target_type == 'task_completion' and self.linked_project:
            self.current = self.linked_project.calculate_completion_percentage()
            self.save(update_fields=['current'])
