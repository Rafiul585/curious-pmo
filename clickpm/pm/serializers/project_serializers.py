from rest_framework import serializers
from pm.models.project_models import Project, ProjectMember, Milestone, Sprint
from pm.serializers.user_serializers import UserMinimalSerializer, RoleSerializer


class ProjectMemberSerializer(serializers.ModelSerializer):
    user = UserMinimalSerializer(read_only=True)
    role = RoleSerializer(read_only=True)

    class Meta:
        model = ProjectMember
        fields = ['id', 'user', 'role', 'joined_at']


class SprintSerializer(serializers.ModelSerializer):
    completion_percentage = serializers.SerializerMethodField()
    
    class Meta:
        model = Sprint
        fields = [
            'id', 'milestone', 'name', 'description', 'start_date', 'end_date',
            'status', 'completion_percentage', 
            'created_at', 'updated_at'
        ]
    
    def get_completion_percentage(self, obj):
        return round(obj.calculate_completion_percentage(), 2)


class SprintDetailSerializer(serializers.ModelSerializer):
    milestone_name = serializers.CharField(source='milestone.name', read_only=True)
    completion_percentage = serializers.SerializerMethodField()

    class Meta:
        model = Sprint
        fields = [
            'id', 'milestone', 'milestone_name', 'name', 'description', 'start_date', 'end_date',
            'status', 'completion_percentage', 'created_at', 'updated_at'
        ]

    def get_completion_percentage(self, obj):
        return round(obj.calculate_completion_percentage(), 2)


class MilestoneSerializer(serializers.ModelSerializer):
    sprints = SprintSerializer(many=True, read_only=True)
    completion_percentage = serializers.SerializerMethodField()

    class Meta:
        model = Milestone
        fields = [
            'id', 'project', 'name', 'description', 'start_date', 'end_date',
            'status', 'sprints', 'completion_percentage', 
            'created_at', 'updated_at'
        ]
    
    def get_completion_percentage(self, obj):
        return round(obj.calculate_completion_percentage(), 2)


class MilestoneDetailSerializer(serializers.ModelSerializer):
    sprints = SprintDetailSerializer(many=True, read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    completion_percentage = serializers.SerializerMethodField()

    class Meta:
        model = Milestone
        fields = [
            'id', 'project', 'project_name', 'name', 'description', 'start_date', 'end_date',
            'status', 'sprints', 'completion_percentage', 'created_at', 'updated_at'
        ]

    def get_completion_percentage(self, obj):
        return round(obj.calculate_completion_percentage(), 2)


class ProjectSerializer(serializers.ModelSerializer):
    members = ProjectMemberSerializer(source='projectmember_set', many=True, read_only=True)
    milestones = MilestoneSerializer(many=True, read_only=True)
    workspace_name = serializers.CharField(source='workspace.name', read_only=True)
    completion_percentage = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            'id', 'name', 'description', 'start_date', 'end_date',
            'status', 'workspace', 'workspace_name', 'members', 'milestones',
            'tags', 'archived', 'completion_percentage', 'created_at', 'updated_at'
        ]
    
    def get_completion_percentage(self, obj):
        return round(obj.calculate_completion_percentage(), 2)


class ProjectDetailSerializer(serializers.ModelSerializer):
    members = ProjectMemberSerializer(source='projectmember_set', many=True, read_only=True)
    milestones = MilestoneDetailSerializer(many=True, read_only=True)
    workspace_name = serializers.CharField(source='workspace.name', read_only=True)

    class Meta:
        model = Project
        fields = [
            'id', 'name', 'description', 'start_date', 'end_date',
            'status', 'workspace', 'workspace_name', 'members', 'milestones',
            'tags', 'archived', 'created_at', 'updated_at'
        ]


class ProjectCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = [
            'id', 'name', 'description', 'start_date', 'end_date',
            'status', 'workspace', 'tags', 'archived', 'visibility'
        ]
        read_only_fields = ['id']


class MilestoneCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Milestone
        fields = ['id', 'project', 'name', 'description', 'start_date', 'end_date', 'status']
        read_only_fields = ['id']


class SprintCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sprint
        fields = ['id', 'milestone', 'name', 'description', 'start_date', 'end_date', 'status']
        read_only_fields = ['id']

