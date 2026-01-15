from rest_framework import serializers

from pm.models.task_models import Task, TaskDependency
from pm.serializers.user_serializers import UserMinimalSerializer


class TaskDependencySerializer(serializers.ModelSerializer):
    depends_on_title = serializers.CharField(source='depends_on.title', read_only=True)

    class Meta:
        model = TaskDependency
        fields = ['id', 'task', 'depends_on', 'depends_on_title', 'type']


class TaskSerializer(serializers.ModelSerializer):
    assignee_details = UserMinimalSerializer(source='assignee', read_only=True)
    reporter_details = UserMinimalSerializer(source='reporter', read_only=True)
    dependencies = TaskDependencySerializer(source='dependent_on', many=True, read_only=True)
    sprint_name = serializers.CharField(source='sprint.name', read_only=True)

    class Meta:
        model = Task
        fields = [
            'id', 'sprint', 'sprint_name', 'title', 'description', 'assignee', 'assignee_details',
            'reporter', 'reporter_details', 'status', 'priority', 'start_date',
            'due_date', 'dependencies', 'created_at', 'updated_at'
        ]


class TaskDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer with related fields for retrieve view"""
    assignee_details = UserMinimalSerializer(source='assignee', read_only=True)
    reporter_details = UserMinimalSerializer(source='reporter', read_only=True)
    dependencies = TaskDependencySerializer(source='dependent_on', many=True, read_only=True)
    sprint_name = serializers.CharField(source='sprint.name', read_only=True)
    sprint_details = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            'id', 'sprint', 'sprint_name', 'sprint_details', 'title', 'description',
            'assignee', 'assignee_details', 'reporter', 'reporter_details',
            'status', 'priority', 'start_date', 'due_date',
            'dependencies', 'created_at', 'updated_at'
        ]

    def get_sprint_details(self, obj):
        if obj.sprint:
            milestone = obj.sprint.milestone
            project = milestone.project if milestone else None
            return {
                'id': obj.sprint.id,
                'name': obj.sprint.name,
                'milestone': {
                    'id': milestone.id,
                    'name': milestone.name,
                    'project': {
                        'id': project.id,
                        'name': project.name,
                    } if project else None
                } if milestone else None
            }
        return None


class TaskCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = [
            'id', 'sprint', 'title', 'description', 'assignee', 'reporter',
            'status', 'priority', 'start_date', 'due_date'
        ]
        read_only_fields = ['id']


class TaskDependencyCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskDependency
        fields = ['id', 'task', 'depends_on', 'type']

    def validate(self, data):
        if data.get('task') == data.get('depends_on'):
            raise serializers.ValidationError("A task cannot depend on itself")
        return data
