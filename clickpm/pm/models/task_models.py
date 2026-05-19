from django.db import models
from django.db.models import Sum
from .user_models import User
from .project_models import Sprint

# ----------------------------
# Task Model
# ----------------------------
class Task(models.Model):
    STATUS_CHOICES = [
        ('To-do', 'To-do'),
        ('In Progress', 'In Progress'),
        ('Review', 'Review'),
        ('Done', 'Done'),
    ]
    
    PRIORITY_CHOICES = [
        ('Low', 'Low'),
        ('Medium', 'Medium'),
        ('High', 'High'),
        ('Critical', 'Critical'),
    ]
    
    sprint = models.ForeignKey(Sprint, on_delete=models.CASCADE, related_name='tasks')
    parent = models.ForeignKey(
        'self', null=True, blank=True,
        on_delete=models.CASCADE, related_name='subtasks'
    )

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    
    assignee = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='tasks_assigned'
    )
    assignees = models.ManyToManyField(
        User, blank=True, related_name='assigned_tasks'
    )
    reporter = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='tasks_reported'
    )
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='To-do')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='Medium')
    
    start_date = models.DateField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)

    estimated_hours = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    actual_hours = models.DecimalField(max_digits=6, decimal_places=2, default=0)

    position = models.PositiveIntegerField(default=0, db_index=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['position', '-created_at']

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        """
        Save task and trigger auto-completion if status is set to Done
        """
        old_status = None
        if self.pk:
            try:
                old_task = Task.objects.get(pk=self.pk)
                old_status = old_task.status
            except Task.DoesNotExist:
                pass

        super().save(*args, **kwargs)

        if old_status != 'Done' and self.status == 'Done':
            from pm.services.auto_completion import auto_complete_on_task_done
            auto_complete_on_task_done(self)

# ----------------------------
# Time Log Model
# ----------------------------
class TimeLog(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='time_logs')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='time_logs')
    hours = models.DecimalField(max_digits=5, decimal_places=2)
    date = models.DateField()
    note = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-created_at']

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Keep task.actual_hours in sync with sum of all logs
        total = TimeLog.objects.filter(task=self.task).aggregate(
            total=models.Sum('hours')
        )['total'] or 0
        Task.objects.filter(pk=self.task_id).update(actual_hours=total)

    def delete(self, *args, **kwargs):
        task_id = self.task_id
        super().delete(*args, **kwargs)
        total = TimeLog.objects.filter(task_id=task_id).aggregate(
            total=models.Sum('hours')
        )['total'] or 0
        Task.objects.filter(pk=task_id).update(actual_hours=total)

    def __str__(self):
        return f"{self.user.username} logged {self.hours}h on {self.task.title}"


# ----------------------------
# Task Dependency Model
# ----------------------------
class TaskDependency(models.Model):
    DEPENDENCY_TYPES = [
        ('Blocked By', 'Blocked By'),
        ('Blocks', 'Blocks'),
        ('Related To', 'Related To'),
    ]
    
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='dependent_on')
    depends_on = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='blocks')
    type = models.CharField(max_length=50, choices=DEPENDENCY_TYPES, default='Blocked By')

    class Meta:
        unique_together = ('task', 'depends_on')

    def __str__(self):
        return f"{self.task.title} {self.type} {self.depends_on.title}"
