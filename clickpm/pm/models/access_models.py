from django.db import models
from .user_models import User, Role
from .workspace_models import WorkspaceMember
from .project_models import Project


class WorkspaceProjectAccess(models.Model):
    """
    Fine-grained project access within a workspace.
    Controls which projects a workspace member can access.
    
    If a record exists here, the user has explicit access to the project.
    If NO record exists, access depends on project visibility and workspace role.
    """
    workspace_member = models.ForeignKey(WorkspaceMember, on_delete=models.CASCADE, related_name='project_access')
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='access_grants')
    
    can_view = models.BooleanField(default=True)
    can_edit = models.BooleanField(default=False)
    
    granted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='granted_access')
    granted_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('workspace_member', 'project')
        verbose_name_plural = 'Workspace Project Access Grants'
        
    def __str__(self):
        return f"{self.workspace_member.user.username} -> {self.project.name}"


class RolePermission(models.Model):
    """
    Define permissions for each role.
    This implements Role-Based Access Control (RBAC).
    """
    PERMISSION_CHOICES = [
        # Workspace Permissions
        ('workspace.manage_members', 'Manage Workspace Members'),
        ('workspace.create_projects', 'Create Projects'),
        
        # Project Permissions
        ('project.view', 'View Projects'),
        ('project.edit', 'Edit Projects'),
        ('project.delete', 'Delete Projects'),
        
        # Task Permissions
        ('task.create', 'Create Tasks'),
        ('task.edit', 'Edit Tasks'),
        ('task.delete', 'Delete Tasks'),
    ]
    
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name='permissions')
    permission_type = models.CharField(max_length=50, choices=PERMISSION_CHOICES)
    
    class Meta:
        unique_together = ('role', 'permission_type')
        
    def __str__(self):
        return f"{self.role.name} - {self.permission_type}"
