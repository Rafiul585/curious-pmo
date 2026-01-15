from rest_framework import serializers
from pm.models.access_models import WorkspaceProjectAccess, RolePermission
from pm.models.workspace_models import WorkspaceMember
from pm.models.project_models import Project
from pm.models.user_models import Role

class WorkspaceProjectAccessSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source='project.name', read_only=True)
    user_name = serializers.CharField(source='workspace_member.user.username', read_only=True)
    user_id = serializers.IntegerField(source='workspace_member.user.id', read_only=True)
    
    class Meta:
        model = WorkspaceProjectAccess
        fields = ['id', 'workspace_member', 'user_id', 'user_name', 'project', 'project_name', 'can_view', 'can_edit', 'granted_at']
        read_only_fields = ['granted_at', 'granted_by']


class GrantProjectAccessSerializer(serializers.Serializer):
    """
    Serializer for granting project access via API action.
    """
    user_id = serializers.IntegerField(required=True)
    project_id = serializers.IntegerField(required=True)
    can_view = serializers.BooleanField(default=True)
    can_edit = serializers.BooleanField(default=False)


class RolePermissionSerializer(serializers.ModelSerializer):
    role_name = serializers.CharField(source='role.name', read_only=True)
    
    class Meta:
        model = RolePermission
        fields = ['id', 'role', 'role_name', 'permission_type']
