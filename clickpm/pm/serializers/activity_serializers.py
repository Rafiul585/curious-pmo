from rest_framework import serializers
from pm.models.activity_models import ActivityLog


class ActivityLogSerializer(serializers.ModelSerializer):
    """
    Serializer for ActivityLog with enriched audit information.
    """
    user_name = serializers.CharField(source='user.username', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)

    # Computed fields
    changed_fields = serializers.SerializerMethodField()
    description = serializers.SerializerMethodField()
    entity_display = serializers.SerializerMethodField()
    object_repr = serializers.SerializerMethodField()

    class Meta:
        model = ActivityLog
        fields = [
            'id', 'user', 'user_name', 'user_email', 'action', 'content_type',
            'object_id', 'object_repr', 'reason', 'old_value', 'new_value',
            'extra_info', 'timestamp', 'changed_fields', 'description',
            'entity_display'
        ]

    def get_object_repr(self, obj):
        """
        Get a string representation of the object.
        """
        if obj.extra_info:
            # Try to get the most specific name
            for key in ['task_title', 'sprint_name', 'milestone_name', 'project_name', 'workspace_name']:
                if key in obj.extra_info:
                    return obj.extra_info[key]
        return f'{obj.content_type} #{obj.object_id}'
    
    def get_changed_fields(self, obj):
        """
        Extract list of fields that changed from extra_info or compute from old/new.
        """
        if obj.extra_info and 'changed_fields' in obj.extra_info:
            return obj.extra_info['changed_fields']
        
        if obj.old_value and obj.new_value:
            old_keys = set(obj.old_value.keys()) if isinstance(obj.old_value, dict) else set()
            new_keys = set(obj.new_value.keys()) if isinstance(obj.new_value, dict) else set()
            all_keys = old_keys | new_keys
            
            changed = []
            for key in all_keys:
                old_val = obj.old_value.get(key) if isinstance(obj.old_value, dict) else None
                new_val = obj.new_value.get(key) if isinstance(obj.new_value, dict) else None
                if old_val != new_val:
                    changed.append(key)
            return changed
        
        return []
    
    def get_description(self, obj):
        """
        Generate a human-readable description of the audit event.
        """
        user_name = obj.user.username if obj.user else 'System'
        entity = obj.content_type
        obj_id = obj.object_id
        
        # Get entity name if available
        entity_name = None
        if obj.extra_info:
            for key in ['workspace_name', 'project_name', 'milestone_name', 'sprint_name', 'task_title']:
                if key in obj.extra_info:
                    entity_name = obj.extra_info[key]
                    break
        
        # Get the specific action description
        action_descriptions = {
            'CREATED': f'{user_name} created {entity}',
            'UPDATED': f'{user_name} updated {entity}',
            'DELETED': f'{user_name} deleted {entity}',
            'WORKSPACE_MEMBER_ADDED': f'{user_name} added a member to workspace',
            'WORKSPACE_MEMBER_REMOVED': f'{user_name} removed a member from workspace',
            'WORKSPACE_MEMBER_ROLE_CHANGED': f'{user_name} changed member role in workspace',
            'WORKSPACE_PROJECT_ACCESS_GRANTED': f'{user_name} granted project access',
            'WORKSPACE_PROJECT_ACCESS_REVOKED': f'{user_name} revoked project access',
            'PROJECT_MEMBER_ADDED': f'{user_name} added a member to project',
            'PROJECT_MEMBER_REMOVED': f'{user_name} removed a member from project',
            'TASK_ASSIGNED': f'{user_name} assigned task',
            'TASK_STATUS_CHANGED': f'{user_name} changed task status',
            'TASK_PRIORITY_CHANGED': f'{user_name} changed task priority',
        }
        
        desc = action_descriptions.get(obj.action, f'{user_name} performed {obj.action} on {entity}')
        
        if entity_name:
            desc += f' "{entity_name}"'
        else:
            desc += f' (ID: {obj_id})'
        
        return desc
    
    def get_entity_display(self, obj):
        """
        Get a display name for the entity from extra_info.
        """
        if obj.extra_info:
            # Try to get the most specific name
            for key in ['task_title', 'sprint_name', 'milestone_name', 'project_name', 'workspace_name']:
                if key in obj.extra_info:
                    return obj.extra_info[key]
        
        return f'{obj.content_type} #{obj.object_id}'

