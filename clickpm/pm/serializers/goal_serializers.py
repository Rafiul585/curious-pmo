from rest_framework import serializers
from pm.models.goal_models import Goal, GoalTarget


class GoalTargetSerializer(serializers.ModelSerializer):
    progress_pct        = serializers.SerializerMethodField()
    target_type_display = serializers.CharField(source='get_target_type_display', read_only=True)
    linked_project_name = serializers.CharField(source='linked_project.name', read_only=True, default=None)

    class Meta:
        model  = GoalTarget
        fields = [
            'id', 'goal', 'name', 'target_type', 'target_type_display',
            'current', 'target', 'linked_project', 'linked_project_name',
            'progress_pct',
        ]
        read_only_fields = ['id']

    def get_progress_pct(self, obj):
        return round(obj.get_progress_pct(), 1)


class GoalSerializer(serializers.ModelSerializer):
    targets      = GoalTargetSerializer(many=True, read_only=True)
    owner_name   = serializers.SerializerMethodField()
    progress_pct = serializers.FloatField(source='progress', read_only=True)

    class Meta:
        model  = Goal
        fields = [
            'id', 'workspace', 'name', 'description', 'owner', 'owner_name',
            'due_date', 'progress', 'progress_pct', 'targets', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'progress', 'created_at', 'updated_at']

    def get_owner_name(self, obj):
        if not obj.owner:
            return None
        u = obj.owner
        if u.first_name and u.last_name:
            return f'{u.first_name} {u.last_name}'
        return u.username
