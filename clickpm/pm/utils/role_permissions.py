"""
Role-Based Permission System Setup

This module defines the permission system based on 4 core roles:
- Admin: Manages access and Workspaces
- Project Admin: Manages Projects, Milestones, Sprints, Stories, Tasks
- User: Views assigned work
- System: Auto-completion logic
"""

# Role definitions with their permissions
ROLE_PERMISSIONS = {
    'Admin': {
        'description': 'Manages access (login/signup) and creates Workspaces, assigns people',
        'permissions': [
            # User Management
            'user.create',
            'user.view',
            'user.edit',
            'user.delete',
            'user.suspend',
            
            # Workspace Management
            'workspace.create',
            'workspace.view',
            'workspace.edit',
            'workspace.delete',
            'workspace.manage_members',
            'workspace.assign_roles',
            
            # Role Management
            'role.create',
            'role.view',
            'role.edit',
            'role.delete',
            'role.assign',
            
            # Can view everything
            'project.view',
            'milestone.view',
            'sprint.view',
            'story.view',
            'task.view',
        ]
    },
    
    'Project Admin': {
        'description': 'Manages Projects, Milestones, Sprints, Stories, and Tasks',
        'permissions': [
            # Full project hierarchy management
            'project.create',
            'project.view',
            'project.edit',
            'project.delete',
            'project.manage_members',
            
            'milestone.create',
            'milestone.view',
            'milestone.edit',
            'milestone.delete',
            
            'sprint.create',
            'sprint.view',
            'sprint.edit',
            'sprint.delete',
            
            'story.create',
            'story.view',
            'story.edit',
            'story.delete',
            
            'task.create',
            'task.view',
            'task.edit',
            'task.delete',
            'task.assign',
            
            # Additional
            'comment.create',
            'comment.view',
            'attachment.upload',
            'attachment.view',
        ]
    },
    
    'User': {
        'description': 'Views assigned Workspaces, Projects, and Tasks',
        'permissions': [
            # Can only VIEW assigned items
            'workspace.view',  # Only workspaces they're assigned to
            'project.view',    # Only projects they're assigned to
            'task.view',       # Only tasks assigned to them
            
            # Can update their own tasks
            'task.update_status',
            'task.update_progress',
            
            # Can comment
            'comment.create',
            'comment.view',
            
            # Can view related items
            'milestone.view',
            'sprint.view',
            'story.view',
        ]
    },
    
    'System': {
        'description': 'Automated system role for auto-completion logic',
        'permissions': [
            # System can update completion status
            'task.auto_complete',
            'story.auto_complete',
            'sprint.auto_complete',
            'milestone.auto_complete',
            'project.auto_complete',
            'workspace.auto_complete',
            
            # System can create notifications
            'notification.create',
            'activity.log',
        ]
    }
}


# Permission to role mapping (reverse lookup)
def get_roles_with_permission(permission):
    """Get all roles that have a specific permission"""
    roles = []
    for role_name, role_data in ROLE_PERMISSIONS.items():
        if permission in role_data['permissions']:
            roles.append(role_name)
    return roles


def get_role_permissions(role_name):
    """Get all permissions for a specific role"""
    return ROLE_PERMISSIONS.get(role_name, {}).get('permissions', [])


def user_has_permission(user, permission):
    """Check if a user has a specific permission based on their role"""
    if not user or not user.role:
        return False
    
    role_perms = get_role_permissions(user.role.name)
    return permission in role_perms


# Auto-completion hierarchy rules
AUTO_COMPLETION_RULES = {
    'Task': {
        'completion_field': 'status',
        'completion_value': 'Done',
        'triggers': ['Story'],  # Completing tasks triggers story check
    },
    'Story': {
        'completion_field': 'status',
        'completion_value': 'Done',
        'triggers': ['Sprint'],  # Completing stories triggers sprint check
        'auto_complete_when': 'all_tasks_done',
    },
    'Sprint': {
        'completion_field': 'status',
        'completion_value': 'Completed',
        'triggers': ['Milestone'],
        'auto_complete_when': 'all_stories_done',
    },
    'Milestone': {
        'completion_field': 'status',
        'completion_value': 'Completed',
        'triggers': ['Project'],
        'auto_complete_when': 'all_sprints_done',
    },
    'Project': {
        'completion_field': 'status',
        'completion_value': 'Completed',
        'triggers': ['Workspace'],
        'auto_complete_when': 'all_milestones_done',
    },
    'Workspace': {
        'completion_field': None,  # No status field
        'completion_value': None,
        'triggers': [],
        'auto_complete_when': 'all_projects_done',
    }
}
