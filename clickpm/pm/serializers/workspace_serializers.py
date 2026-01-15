from rest_framework import serializers
from pm.models.workspace_models import Workspace, WorkspaceMember
from pm.models.user_models import User
from pm.serializers.user_serializers import UserSerializer


class WorkspaceMemberSerializer(serializers.ModelSerializer):
    """Serializer for workspace members"""
    user = UserSerializer(read_only=True)
    user_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = WorkspaceMember
        fields = ['id', 'user', 'user_id', 'role', 'joined_at', 'is_admin']
        read_only_fields = ['id', 'joined_at']


class WorkspaceSerializer(serializers.ModelSerializer):
    """Basic workspace serializer for list views"""
    owner = UserSerializer(read_only=True)
    member_count = serializers.SerializerMethodField()
    project_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Workspace
        fields = ['id', 'name', 'description', 'owner', 'member_count', 'project_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_member_count(self, obj):
        return obj.members.count()
    
    def get_project_count(self, obj):
        return obj.projects.count()


class WorkspaceDetailSerializer(serializers.ModelSerializer):
    """Detailed workspace serializer with members and projects"""
    owner = UserSerializer(read_only=True)
    workspace_members = WorkspaceMemberSerializer(source='workspacemember_set', many=True, read_only=True)
    
    class Meta:
        model = Workspace
        fields = ['id', 'name', 'description', 'owner', 'workspace_members', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class WorkspaceCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating and updating workspaces"""
    
    class Meta:
        model = Workspace
        fields = ['id', 'name', 'description']
        read_only_fields = ['id']
    
    def create(self, validated_data):
        # Set the owner to the current user
        request = self.context.get('request')
        validated_data['owner'] = request.user
        workspace = Workspace.objects.create(**validated_data)
        
        # Automatically add the owner as a workspace member with admin privileges
        WorkspaceMember.objects.create(
            workspace=workspace,
            user=request.user,
            is_admin=True
        )
        
        return workspace
