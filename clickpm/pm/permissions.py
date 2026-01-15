from rest_framework.permissions import BasePermission, IsAuthenticated
from .models.workspace_models import WorkspaceMember
from .models.access_models import RolePermission
from .utils.permission_helpers import (
    can_user_view_project, 
    can_user_edit_project,
    is_workspace_admin,
    has_role_permission
)

class IsWorkspaceMember(BasePermission):
    """
    Permission check to see if user is a member of the workspace.
    Assumes obj has a 'workspace' attribute or is a Workspace.
    """
    def has_object_permission(self, request, view, obj):
        if hasattr(obj, 'workspace'):
            workspace = obj.workspace
        elif hasattr(obj, 'project') and hasattr(obj.project, 'workspace'):
            workspace = obj.project.workspace
        elif hasattr(obj, 'story'):
            workspace = obj.story.sprint.milestone.project.workspace
        elif hasattr(obj, 'sprint') and hasattr(obj.sprint.milestone.project, 'workspace'):
            workspace = obj.sprint.milestone.project.workspace
        elif hasattr(obj, 'milestone') and hasattr(obj.milestone.project, 'workspace'):
            workspace = obj.milestone.project.workspace
        else:
            # Fallback or if obj is Workspace itself
            workspace = obj
            
        if not workspace:
            return False
            
        return WorkspaceMember.objects.filter(workspace=workspace, user=request.user).exists()


class IsWorkspaceAdmin(BasePermission):
    """
    Permission check to see if user is a workspace admin.
    """
    def has_object_permission(self, request, view, obj):
        # Resolve workspace from object
        if hasattr(obj, 'workspace'):
            workspace = obj.workspace
        elif hasattr(obj, 'project') and hasattr(obj.project, 'workspace'):
            workspace = obj.project.workspace
        elif hasattr(obj, 'story'):
            workspace = obj.story.sprint.milestone.project.workspace
        elif isinstance(obj, WorkspaceMember):
            workspace = obj.workspace
        else:
            workspace = obj
            
        if not workspace:
            return False
            
        return is_workspace_admin(request.user, workspace)


class HasRolePermission(BasePermission):
    """
    Base permission to check if user's role has a specific permission.
    Subclasses must define 'permission_required'.
    """
    permission_required = None
    
    def has_permission(self, request, view):
        if not self.permission_required:
            return False
        return has_role_permission(request.user, self.permission_required)


class CanViewProject(BasePermission):
    """
    Custom permission for Project visibility:
    1. Project Member -> Always allow
    2. Workspace Admin -> Always allow
    3. Explicit Access Grant -> Allow
    4. Workspace Member + Public -> Allow (Backward compatibility)
    """
    def has_object_permission(self, request, view, obj):
        # Ensure obj is a Project or has a project attribute
        project = obj if hasattr(obj, 'visibility') else getattr(obj, 'project', None)
        
        if not project:
            # Try to traverse up if it's a task/sprint/milestone
            if hasattr(obj, 'sprint'): project = obj.sprint.milestone.project
            elif hasattr(obj, 'milestone'): project = obj.milestone.project
            
        if not project:
            return False

        return can_user_view_project(request.user, project)


class IsProjectMember(BasePermission):
    """
    Strict Project Member check (for writing/editing usually)
    Updated to include Workspace Admins and explicit edit grants.
    """
    def has_object_permission(self, request, view, obj):
        project = obj if hasattr(obj, 'members') else getattr(obj, 'project', None)
        if not project:
             # Try to traverse up
            if hasattr(obj, 'sprint'): project = obj.sprint.milestone.project
            elif hasattr(obj, 'milestone'): project = obj.milestone.project
            
        if not project:
            return False
            
        return can_user_edit_project(request.user, project)


class IsTaskAssignee(BasePermission):
    """
    Permission to check if user is the assignee or reporter of the task.
    Task Assignee -> Always sees their task even if project is private.
    """
    def has_object_permission(self, request, view, obj):
        # This permission is usually combined with others. 
        # If used alone, it grants access to assignee/reporter.
        return obj.assignee == request.user or obj.reporter == request.user


class IsCommentAuthor(BasePermission):
    """
    Permission to check if user is the author of the comment.
    """
    def has_object_permission(self, request, view, obj):
        return obj.author == request.user


class IsOwnerOrReadOnly(BasePermission):
    """
    Allow any access method, but only allow owners of an object to edit it.
    """
    def has_object_permission(self, request, view, obj):
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return True
        return obj.author == request.user


