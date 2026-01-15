from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from .user_models import User, Role
from .workspace_models import Workspace

# Project model
class Project(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(max_length=50, default='Not Started')
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name='projects')
    visibility = models.CharField(max_length=20, choices=[('public', 'Public'), ('private', 'Private')], default='private')
    members = models.ManyToManyField(User, through='ProjectMember', related_name='projects')
    tags = models.CharField(max_length=200, blank=True, null=True)
    archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
    
    def calculate_completion_percentage(self):
        """
        Calculate project completion as simple average of milestone completions.
        Formula: PC = Σ(MC_i) / number_of_milestones
        (Equal weighting - weights are calculated automatically)
        """
        milestones = self.milestones.all()
        if not milestones.exists():
            return 0.0
        
        # Simple average (equal weights for all milestones)
        milestone_completions = [m.calculate_completion_percentage() for m in milestones]
        return sum(milestone_completions) / len(milestone_completions)

    class Meta:
        ordering = ['-created_at']


# Project membership
class ProjectMember(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    role = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'project')

    def __str__(self):
        return f"{self.user.username} - {self.project.name}"


# Milestone - belongs to Project
class Milestone(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='milestones')
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(max_length=50, default='Not Started')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.project.name} - {self.name}"
    
    def calculate_completion_percentage(self):
        """
        Calculate milestone completion as simple average of sprint completions.
        Formula: MC_i = Σ(SC_ij) / number_of_sprints
        (Equal weighting - weights are calculated automatically)
        """
        sprints = self.sprints.all()
        if not sprints.exists():
            return 0.0
        
        # Simple average (equal weights for all sprints)
        sprint_completions = [s.calculate_completion_percentage() for s in sprints]
        return sum(sprint_completions) / len(sprint_completions)

    class Meta:
        ordering = ['start_date']


# Sprint - belongs to Milestone (comments allowed)
class Sprint(models.Model):
    milestone = models.ForeignKey(Milestone, on_delete=models.CASCADE, related_name='sprints')
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(max_length=50, default='Not Started')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.milestone.name} - {self.name}"
    
    def calculate_completion_percentage(self):
        """
        Calculate sprint completion based on weighted task contributions.
        Simple count-based calculation: percentage of Done tasks.
        """
        tasks = self.tasks.all()
        if not tasks.exists():
            return 0.0

        total_tasks = tasks.count()
        done_tasks = tasks.filter(status='Done').count()
        return (done_tasks / total_tasks * 100) if total_tasks > 0 else 0.0

    class Meta:
        ordering = ['start_date']

