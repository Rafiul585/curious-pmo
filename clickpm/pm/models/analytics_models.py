from django.db import models

class Analytics(models.Model):
    project_id = models.PositiveIntegerField()
    sprint_id = models.PositiveIntegerField()
    task_completed = models.PositiveIntegerField(default=0)
    total_tasks = models.PositiveIntegerField(default=0)