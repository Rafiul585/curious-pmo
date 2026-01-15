"""
Permission helper utilities for consistent permission checks across the application.
These functions provide reusable permission logic for views, serializers, and services.
"""
from django.db.models import Q
from pm.models.workspace_models import Workspace, WorkspaceMember
from pm.models.project_models import Project, ProjectMember
from pm.models.access_models import WorkspaceProjectAccess, RolePermission


def get_user_workspaces(user):
    """
    Get all workspaces where the user is a member or owner.
    """
    return Workspace.objects.filter(
        Q(owner=user) | Q(members=user)
    ).distinct()


def get_accessible_projects(user):
    """
    Get all projects the user can view based on:
    1. Project Membership (always allowed)
    2. Workspace Admin (sees all projects in workspace)
    3. Explicit WorkspaceProjectAccess grant
    4. Public projects (backward compatibility / default behavior if no restrictions)
    """
    # 1. Projects where user is a direct member
    member_projects = Project.objects.filter(members=user)
    
    # 2. Projects in workspaces where user is owner or admin
    admin_workspaces = WorkspaceMember.objects.filter(
        user=user, 
        is_admin=True
    ).values_list('workspace_id', flat=True)
    
    owned_workspaces = Workspace.objects.filter(owner=user).values_list('id', flat=True)
    
    # Combine admin/owner workspaces
    all_admin_workspace_ids = set(admin_workspaces) | set(owned_workspaces)
    
    # 3. Projects with explicit access grants
    granted_project_ids = WorkspaceProjectAccess.objects.filter(
        workspace_member__user=user,
        can_view=True
    ).values_list('project_id', flat=True)
    
    # 4. Public projects in workspaces where user is a member
    # Get all workspaces where user is a member (not necessarily admin/owner)
    member_workspace_ids = WorkspaceMember.objects.filter(user=user).values_list('workspace_id', flat=True)
    
    # Combine all conditions
    return Project.objects.filter(
        Q(id__in=member_projects) |
        Q(workspace__in=all_admin_workspace_ids) |
        Q(id__in=granted_project_ids) |
        (Q(workspace__in=member_workspace_ids) & Q(visibility='public'))
    ).distinct()


def can_user_view_project(user, project):
    """
    Check if user can view a specific project.
    """
    # 1. Project member
    if project.members.filter(id=user.id).exists():
        return True
        
    # 2. Workspace Owner
    if project.workspace.owner == user:
        return True
        
    # 3. Workspace Admin
    if WorkspaceMember.objects.filter(workspace=project.workspace, user=user, is_admin=True).exists():
        return True
        
    # 4. Explicit Access Grant
    if WorkspaceProjectAccess.objects.filter(
        workspace_member__user=user, 
        project=project, 
        can_view=True
    ).exists():
        return True
        
    # 5. Public Project in User's Workspace
    if project.visibility == 'public' and project.workspace:
        return WorkspaceMember.objects.filter(
            workspace=project.workspace,
            user=user
        ).exists()
        
    return False


def can_user_edit_project(user, project):
    """
    Check if user can edit a specific project.
    """
    # 1. Project member
    if project.members.filter(id=user.id).exists():
        return True
        
    # 2. Workspace Owner
    if project.workspace.owner == user:
        return True
        
    # 3. Workspace Admin
    if WorkspaceMember.objects.filter(workspace=project.workspace, user=user, is_admin=True).exists():
        return True
        
    # 4. Explicit Edit Grant
    if WorkspaceProjectAccess.objects.filter(
        workspace_member__user=user, 
        project=project, 
        can_edit=True
    ).exists():
        return True
        
    # 5. Role Permission
    if has_role_permission(user, 'project.edit'):
        # Still need to be at least a workspace member
        return is_workspace_member(user, project.workspace)
        
    return False


def can_user_view_task(user, task):
    """
    Check if user can view a specific task.
    """
    # Check if user is assignee or reporter
    if task.assignee == user or task.reporter == user:
        return True
    
    # Get the project through the hierarchy
    project = task.sprint.milestone.project
    
    # Check project-level permissions
    return can_user_view_project(user, project)


def can_user_edit_task(user, task):
    """
    Check if user can edit a specific task.
    """
    # Get the project through the hierarchy  
    project = task.sprint.milestone.project
    
    # Project edit permission implies task edit permission
    if can_user_edit_project(user, project):
        return {'can_edit': True, 'fields': 'all'}
    
    # Task assignee can edit limited fields
    if task.assignee == user:
        return {
            'can_edit': True,
            'fields': ['status', 'description', 'start_date', 'due_date']
        }
        
    # Role permission check
    if has_role_permission(user, 'task.edit'):
        if can_user_view_project(user, project):
             return {'can_edit': True, 'fields': 'all'}
    
    return {'can_edit': False, 'fields': []}


def is_workspace_member(user, workspace):
    return WorkspaceMember.objects.filter(workspace=workspace, user=user).exists()


def is_workspace_owner(user, workspace):
    return workspace.owner == user


def is_project_member(user, project):
    return ProjectMember.objects.filter(project=project, user=user).exists()


def is_workspace_admin(user, workspace):
    """Check if user is a workspace admin"""
    if workspace.owner == user:
        return True
    return WorkspaceMember.objects.filter(workspace=workspace, user=user, is_admin=True).exists()


def has_role_permission(user, permission_type):
    """
    Check if user's role has a specific permission.
    """
    if not user.role:
        return False
        
    return RolePermission.objects.filter(
        role=user.role,
        permission_type=permission_type
    ).exists()

