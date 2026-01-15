"""
Event-Based Audit Logging Service

Provides comprehensive audit logging for all major entities:
- Workspace
- Project  
- Milestone
- Sprint
- Task

Captures:
✅ Who did it (user)
✅ What happened (action/event type)
✅ When it happened (timestamp - auto)
✅ Why / reason (optional reason field)
✅ Old → New state (for updates)
"""

from typing import Optional, Any, Dict
from django.db.models import Model
from pm.models.activity_models import ActivityLog


# =============================================
# EVENT TYPES - Actions that can be performed
# =============================================
class EventType:
    """Constants for standardized event/action types"""
    
    # CRUD Operations
    CREATED = 'CREATED'
    UPDATED = 'UPDATED'
    DELETED = 'DELETED'
    
    # Workspace Events
    WORKSPACE_MEMBER_ADDED = 'WORKSPACE_MEMBER_ADDED'
    WORKSPACE_MEMBER_REMOVED = 'WORKSPACE_MEMBER_REMOVED'
    WORKSPACE_MEMBER_ROLE_CHANGED = 'WORKSPACE_MEMBER_ROLE_CHANGED'
    WORKSPACE_PROJECT_ACCESS_GRANTED = 'WORKSPACE_PROJECT_ACCESS_GRANTED'
    WORKSPACE_PROJECT_ACCESS_REVOKED = 'WORKSPACE_PROJECT_ACCESS_REVOKED'
    
    # Project Events
    PROJECT_MEMBER_ADDED = 'PROJECT_MEMBER_ADDED'
    PROJECT_MEMBER_REMOVED = 'PROJECT_MEMBER_REMOVED'
    PROJECT_ARCHIVED = 'PROJECT_ARCHIVED'
    PROJECT_UNARCHIVED = 'PROJECT_UNARCHIVED'
    PROJECT_VISIBILITY_CHANGED = 'PROJECT_VISIBILITY_CHANGED'
    
    # Task Events
    TASK_ASSIGNED = 'TASK_ASSIGNED'
    TASK_UNASSIGNED = 'TASK_UNASSIGNED'
    TASK_STATUS_CHANGED = 'TASK_STATUS_CHANGED'
    TASK_PRIORITY_CHANGED = 'TASK_PRIORITY_CHANGED'
    TASK_WEIGHT_CHANGED = 'TASK_WEIGHT_CHANGED'
    
    # Sprint Events
    SPRINT_STATUS_CHANGED = 'SPRINT_STATUS_CHANGED'
    
    # Milestone Events
    MILESTONE_STATUS_CHANGED = 'MILESTONE_STATUS_CHANGED'


# =============================================
# ENTITY TYPES - Models that can be audited
# =============================================
class EntityType:
    """Constants for entity types"""
    WORKSPACE = 'Workspace'
    PROJECT = 'Project'
    MILESTONE = 'Milestone'
    SPRINT = 'Sprint'
    TASK = 'Task'
    WORKSPACE_MEMBER = 'WorkspaceMember'
    PROJECT_MEMBER = 'ProjectMember'


# =============================================
# MODEL SERIALIZATION HELPERS
# =============================================
def serialize_model_state(instance: Model, fields: Optional[list] = None) -> Dict[str, Any]:
    """
    Serialize a model instance to a dictionary for audit logging.
    
    Args:
        instance: Django model instance
        fields: Optional list of specific fields to serialize
        
    Returns:
        Dictionary representation of the model state
    """
    if instance is None:
        return None
    
    data = {}
    
    # Default fields to capture based on model type
    model_name = type(instance).__name__
    
    if fields:
        field_list = fields
    else:
        field_list = get_default_fields_for_model(model_name)
    
    for field in field_list:
        try:
            value = getattr(instance, field, None)
            
            # Handle foreign keys - get the ID and string representation
            if hasattr(value, 'pk'):
                data[field] = {
                    'id': value.pk,
                    'display': str(value)
                }
            elif hasattr(value, 'isoformat'):
                # Handle date/datetime fields
                data[field] = value.isoformat()
            else:
                data[field] = value
        except Exception:
            data[field] = None
    
    return data


def get_default_fields_for_model(model_name: str) -> list:
    """Get default fields to audit for each model type"""
    
    field_mapping = {
        'Workspace': ['id', 'name', 'description', 'owner'],
        'Project': ['id', 'name', 'description', 'status', 'visibility', 
                   'start_date', 'end_date', 'archived', 'workspace'],
        'Milestone': ['id', 'name', 'description', 'status', 'start_date', 
                     'end_date', 'project'],
        'Sprint': ['id', 'name', 'description', 'status', 'start_date', 
                  'end_date', 'milestone'],
        'Task': ['id', 'title', 'description', 'status', 'priority',
                'assignee', 'reporter', 'start_date', 'due_date', 'sprint'],
        'WorkspaceMember': ['id', 'user', 'workspace', 'is_admin', 'role'],
        'ProjectMember': ['id', 'user', 'project', 'role'],
    }
    
    return field_mapping.get(model_name, ['id'])


def compute_changes(old_state: Dict, new_state: Dict) -> Dict[str, Dict]:
    """
    Compute what changed between old and new state.
    
    Returns:
        Dictionary with changed fields showing old and new values
    """
    if old_state is None or new_state is None:
        return {}
    
    changes = {}
    all_keys = set(old_state.keys()) | set(new_state.keys())
    
    for key in all_keys:
        old_val = old_state.get(key)
        new_val = new_state.get(key)
        
        # Normalize comparison for nested dicts (foreign keys)
        if isinstance(old_val, dict) and isinstance(new_val, dict):
            if old_val.get('id') != new_val.get('id'):
                changes[key] = {'old': old_val, 'new': new_val}
        elif old_val != new_val:
            changes[key] = {'old': old_val, 'new': new_val}
    
    return changes


# =============================================
# CONTEXT HELPER - Get hierarchy info
# =============================================
def get_entity_context(instance: Model) -> Dict[str, Any]:
    """
    Get the hierarchical context for an entity (workspace, project info).
    This helps in filtering audit logs by workspace/project.
    """
    context = {}
    model_name = type(instance).__name__
    
    try:
        if model_name == 'Workspace':
            context['workspace_id'] = instance.id
            context['workspace_name'] = instance.name
            
        elif model_name == 'Project':
            context['workspace_id'] = instance.workspace_id
            context['workspace_name'] = instance.workspace.name
            context['project_id'] = instance.id
            context['project_name'] = instance.name
            
        elif model_name == 'Milestone':
            context['workspace_id'] = instance.project.workspace_id
            context['workspace_name'] = instance.project.workspace.name
            context['project_id'] = instance.project_id
            context['project_name'] = instance.project.name
            context['milestone_id'] = instance.id
            context['milestone_name'] = instance.name
            
        elif model_name == 'Sprint':
            context['workspace_id'] = instance.milestone.project.workspace_id
            context['workspace_name'] = instance.milestone.project.workspace.name
            context['project_id'] = instance.milestone.project_id
            context['project_name'] = instance.milestone.project.name
            context['milestone_id'] = instance.milestone_id
            context['milestone_name'] = instance.milestone.name
            context['sprint_id'] = instance.id
            context['sprint_name'] = instance.name
            
        elif model_name == 'Task':
            context['workspace_id'] = instance.sprint.milestone.project.workspace_id
            context['workspace_name'] = instance.sprint.milestone.project.workspace.name
            context['project_id'] = instance.sprint.milestone.project_id
            context['project_name'] = instance.sprint.milestone.project.name
            context['milestone_id'] = instance.sprint.milestone_id
            context['milestone_name'] = instance.sprint.milestone.name
            context['sprint_id'] = instance.sprint_id
            context['sprint_name'] = instance.sprint.name
            context['task_id'] = instance.id
            context['task_title'] = instance.title
            
        elif model_name == 'WorkspaceMember':
            context['workspace_id'] = instance.workspace_id
            context['workspace_name'] = instance.workspace.name
            context['member_user_id'] = instance.user_id
            context['member_username'] = instance.user.username
            
        elif model_name == 'ProjectMember':
            context['workspace_id'] = instance.project.workspace_id
            context['workspace_name'] = instance.project.workspace.name
            context['project_id'] = instance.project_id
            context['project_name'] = instance.project.name
            context['member_user_id'] = instance.user_id
            context['member_username'] = instance.user.username
            
    except AttributeError:
        # Handle cases where related objects might be None
        pass
    
    return context


# =============================================
# MAIN AUDIT SERVICE
# =============================================
class AuditService:
    """
    Central service for recording audit events.
    
    Usage:
        # For create
        AuditService.log_create(request.user, new_workspace, reason="Initial setup")
        
        # For update
        AuditService.log_update(
            user=request.user, 
            instance=task, 
            old_state=old_task_state,
            reason="Status updated by reviewer"
        )
        
        # For delete
        AuditService.log_delete(request.user, task, reason="Task cancelled")
        
        # For custom events
        AuditService.log_event(
            user=request.user,
            instance=workspace_member,
            action=EventType.WORKSPACE_MEMBER_ADDED,
            reason="Added to project team"
        )
    """
    
    @staticmethod
    def log_create(
        user,
        instance: Model,
        reason: Optional[str] = None,
        extra_info: Optional[Dict] = None
    ) -> ActivityLog:
        """Log a CREATE event"""
        new_state = serialize_model_state(instance)
        context = get_entity_context(instance)
        
        # Merge extra_info with context
        final_extra_info = {**context, **(extra_info or {})}
        
        return ActivityLog.objects.create(
            user=user,
            action=EventType.CREATED,
            content_type=type(instance).__name__,
            object_id=instance.id,
            reason=reason,
            old_value=None,
            new_value=new_state,
            extra_info=final_extra_info
        )
    
    @staticmethod
    def log_update(
        user,
        instance: Model,
        old_state: Optional[Dict] = None,
        reason: Optional[str] = None,
        extra_info: Optional[Dict] = None,
        fields: Optional[list] = None
    ) -> ActivityLog:
        """
        Log an UPDATE event with old and new state comparison.
        
        Args:
            user: User performing the action
            instance: The updated model instance
            old_state: Previously captured state (via serialize_model_state)
            reason: Optional reason for the change
            extra_info: Additional context
            fields: Specific fields to track (if None, uses defaults)
        """
        new_state = serialize_model_state(instance, fields)
        context = get_entity_context(instance)
        
        # Compute changes for easier querying
        changes = compute_changes(old_state, new_state) if old_state else {}
        
        # Add changes summary to extra_info
        final_extra_info = {
            **context, 
            **(extra_info or {}),
            'changed_fields': list(changes.keys())
        }
        
        return ActivityLog.objects.create(
            user=user,
            action=EventType.UPDATED,
            content_type=type(instance).__name__,
            object_id=instance.id,
            reason=reason,
            old_value=old_state,
            new_value=new_state,
            extra_info=final_extra_info
        )
    
    @staticmethod
    def log_delete(
        user,
        instance: Model,
        reason: Optional[str] = None,
        extra_info: Optional[Dict] = None
    ) -> ActivityLog:
        """Log a DELETE event - captures the final state before deletion"""
        old_state = serialize_model_state(instance)
        context = get_entity_context(instance)
        
        final_extra_info = {**context, **(extra_info or {})}
        
        return ActivityLog.objects.create(
            user=user,
            action=EventType.DELETED,
            content_type=type(instance).__name__,
            object_id=instance.id,
            reason=reason,
            old_value=old_state,
            new_value=None,
            extra_info=final_extra_info
        )
    
    @staticmethod
    def log_event(
        user,
        instance: Model,
        action: str,
        old_state: Optional[Dict] = None,
        new_state: Optional[Dict] = None,
        reason: Optional[str] = None,
        extra_info: Optional[Dict] = None
    ) -> ActivityLog:
        """
        Log a custom event (member added, status changed, etc.)
        
        Use this for non-CRUD events like:
        - Member added/removed
        - Status transitions
        - Permission changes
        """
        context = get_entity_context(instance)
        final_extra_info = {**context, **(extra_info or {})}
        
        return ActivityLog.objects.create(
            user=user,
            action=action,
            content_type=type(instance).__name__,
            object_id=instance.id,
            reason=reason,
            old_value=old_state,
            new_value=new_state,
            extra_info=final_extra_info
        )
    
    @staticmethod
    def capture_state(instance: Model, fields: Optional[list] = None) -> Dict:
        """
        Capture the current state of an instance before making changes.
        Call this BEFORE updating the instance.
        
        Usage:
            old_state = AuditService.capture_state(task)
            task.status = 'Done'
            task.save()
            AuditService.log_update(user, task, old_state)
        """
        return serialize_model_state(instance, fields)


# =============================================
# QUERY HELPERS
# =============================================
def get_entity_audit_logs(content_type: str, object_id: int, limit: int = 50):
    """Get audit logs for a specific entity"""
    return ActivityLog.objects.filter(
        content_type=content_type,
        object_id=object_id
    ).order_by('-timestamp')[:limit]


def get_workspace_audit_logs(workspace_id: int, limit: int = 100):
    """Get all audit logs within a workspace"""
    return ActivityLog.objects.filter(
        extra_info__workspace_id=workspace_id
    ).order_by('-timestamp')[:limit]


def get_project_audit_logs(project_id: int, limit: int = 100):
    """Get all audit logs within a project"""
    return ActivityLog.objects.filter(
        extra_info__project_id=project_id
    ).order_by('-timestamp')[:limit]


def get_user_audit_logs(user_id: int, limit: int = 100):
    """Get audit logs for actions performed by a user"""
    return ActivityLog.objects.filter(
        user_id=user_id
    ).order_by('-timestamp')[:limit]
