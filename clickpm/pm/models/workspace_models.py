from django.db import models
from .user_models import User, Role

class Workspace(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_workspaces')
    members = models.ManyToManyField(User, through='WorkspaceMember', related_name='workspaces')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
    
    def get_public_projects(self):
        """Get all public projects in this workspace"""
        return self.projects.filter(visibility='public')
    
    def get_all_projects(self):
        """Get all projects in this workspace"""
        return self.projects.all()
    
    def is_member(self, user):
        """Check if user is a member of this workspace"""
        return WorkspaceMember.objects.filter(workspace=self, user=user).exists()
    
    def is_owner(self, user):
        """Check if user is the owner of this workspace"""
        return self.owner == user

class WorkspaceMember(models.Model):
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    role = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True, blank=True)
    joined_at = models.DateTimeField(auto_now_add=True)
    is_admin = models.BooleanField(default=False)

    class Meta:
        unique_together = ('workspace', 'user')

    def __str__(self):
        return f"{self.user.username} - {self.workspace.name}"
