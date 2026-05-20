from rest_framework import serializers

from pm.models.task_models import Task, TaskDependency, TimeLog
from pm.models.user_models import User
from pm.models.workspace_models import Tag
from pm.serializers.user_serializers import UserMinimalSerializer
from pm.serializers.tag_serializers import TagSerializer


class SubtaskSerializer(serializers.ModelSerializer):
    """Shallow subtask representation used inside TaskSerializer/TaskDetailSerializer."""
    class Meta:
        model = Task
        fields = ['id', 'title', 'status', 'assignee', 'priority']


class TaskDependencySerializer(serializers.ModelSerializer):
    depends_on_title = serializers.CharField(source='depends_on.title', read_only=True)

    class Meta:
        model = TaskDependency
        fields = ['id', 'task', 'depends_on', 'depends_on_title', 'type']


class TaskSerializer(serializers.ModelSerializer):
    assignee_details = UserMinimalSerializer(source='assignee', read_only=True)
    reporter_details = UserMinimalSerializer(source='reporter', read_only=True)
    assignees_details = UserMinimalSerializer(source='assignees', many=True, read_only=True)
    dependencies = TaskDependencySerializer(source='dependent_on', many=True, read_only=True)
    sprint_name = serializers.CharField(source='sprint.name', read_only=True)
    is_blocked = serializers.SerializerMethodField()
    subtask_count = serializers.SerializerMethodField()
    subtasks_done = serializers.SerializerMethodField()
    tags_details = TagSerializer(source='tags', many=True, read_only=True)
    watcher_count = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            'id', 'sprint', 'sprint_name', 'title', 'description',
            'assignee', 'assignee_details', 'assignees', 'assignees_details',
            'reporter', 'reporter_details', 'status', 'priority', 'start_date',
            'due_date', 'estimated_hours', 'actual_hours', 'parent',
            'tags', 'tags_details',
            'dependencies', 'is_blocked', 'subtask_count', 'subtasks_done',
            'watcher_count',
            'recurrence', 'recurrence_end', 'recurrence_parent',
            'created_at', 'updated_at'
        ]

    def get_is_blocked(self, obj) -> bool:
        return obj.dependent_on.filter(
            type='Blocked By',
            depends_on__status__in=['To-do', 'In Progress', 'Review'],
        ).exists()

    def get_subtask_count(self, obj) -> int:
        return obj.subtasks.count()

    def get_subtasks_done(self, obj) -> int:
        return obj.subtasks.filter(status='Done').count()

    def get_watcher_count(self, obj) -> int:
        return obj.watchers.count()


class TaskDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer with related fields for retrieve view"""
    assignee_details = UserMinimalSerializer(source='assignee', read_only=True)
    reporter_details = UserMinimalSerializer(source='reporter', read_only=True)
    assignees_details = UserMinimalSerializer(source='assignees', many=True, read_only=True)
    dependencies = TaskDependencySerializer(source='dependent_on', many=True, read_only=True)
    sprint_name = serializers.CharField(source='sprint.name', read_only=True)
    sprint_details = serializers.SerializerMethodField()
    is_blocked = serializers.SerializerMethodField()
    subtasks = SubtaskSerializer(many=True, read_only=True)
    subtask_count = serializers.SerializerMethodField()
    subtasks_done = serializers.SerializerMethodField()
    tags_details = TagSerializer(source='tags', many=True, read_only=True)
    watchers_details = UserMinimalSerializer(source='watchers', many=True, read_only=True)
    watcher_count = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            'id', 'sprint', 'sprint_name', 'sprint_details', 'title', 'description',
            'assignee', 'assignee_details', 'assignees', 'assignees_details',
            'reporter', 'reporter_details',
            'status', 'priority', 'start_date', 'due_date',
            'estimated_hours', 'actual_hours', 'parent',
            'tags', 'tags_details',
            'dependencies', 'is_blocked',
            'subtasks', 'subtask_count', 'subtasks_done',
            'watchers_details', 'watcher_count',
            'recurrence', 'recurrence_end', 'recurrence_parent',
            'created_at', 'updated_at'
        ]

    def get_is_blocked(self, obj) -> bool:
        return obj.dependent_on.filter(
            type='Blocked By',
            depends_on__status__in=['To-do', 'In Progress', 'Review'],
        ).exists()

    def get_subtask_count(self, obj) -> int:
        return obj.subtasks.count()

    def get_subtasks_done(self, obj) -> int:
        return obj.subtasks.filter(status='Done').count()

    def get_watcher_count(self, obj) -> int:
        return obj.watchers.count()

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
    assignees = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=User.objects.all(),
        required=False,
    )

    class Meta:
        model = Task
        fields = [
            'id', 'sprint', 'parent', 'title', 'description', 'assignee', 'assignees',
            'reporter', 'status', 'priority', 'start_date', 'due_date',
            'estimated_hours', 'actual_hours',
            'recurrence', 'recurrence_end', 'recurrence_parent',
        ]
        read_only_fields = ['id']

    def create(self, validated_data):
        assignees = validated_data.pop('assignees', [])
        task = super().create(validated_data)
        if assignees:
            task.assignees.set(assignees)
        return task

    def update(self, instance, validated_data):
        assignees = validated_data.pop('assignees', None)
        task = super().update(instance, validated_data)
        if assignees is not None:
            task.assignees.set(assignees)
        return task


class TimeLogSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = TimeLog
        fields = ['id', 'task', 'user', 'user_username', 'hours', 'date', 'note', 'created_at']
        read_only_fields = ['id', 'user', 'user_username', 'created_at']


class TaskDependencyCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskDependency
        fields = ['id', 'task', 'depends_on', 'type']

    def validate(self, data):
        if data.get('task') == data.get('depends_on'):
            raise serializers.ValidationError("A task cannot depend on itself")
        return data
