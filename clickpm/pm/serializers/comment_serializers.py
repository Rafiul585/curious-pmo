from rest_framework import serializers
from pm.models.comment_models import Comment


class CommentAuthorSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()
    email = serializers.EmailField(required=False)
    first_name = serializers.CharField(required=False)
    last_name = serializers.CharField(required=False)


class CommentSerializer(serializers.ModelSerializer):
    author = CommentAuthorSerializer(read_only=True)
    task_title = serializers.CharField(source='task.title', read_only=True, allow_null=True)
    sprint_name = serializers.CharField(source='sprint.name', read_only=True, allow_null=True)
    project_name = serializers.CharField(source='project.name', read_only=True, allow_null=True)

    class Meta:
        model = Comment
        fields = [
            'id', 'author', 'content', 'task', 'task_title',
            'sprint', 'sprint_name', 'project', 'project_name', 'created_at', 'updated_at'
        ]


class CommentDetailSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.username', read_only=True)
    author_email = serializers.CharField(source='author.email', read_only=True)
    task_title = serializers.CharField(source='task.title', read_only=True, allow_null=True)
    sprint_name = serializers.CharField(source='sprint.name', read_only=True, allow_null=True)
    project_name = serializers.CharField(source='project.name', read_only=True, allow_null=True)


    class Meta:
        model = Comment
        fields = [
            'id', 'author', 'author_name', 'author_email', 'content', 'task', 'task_title',
            'sprint', 'sprint_name', 'project', 'project_name', 'created_at', 'updated_at'
        ]


class CommentCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = [
            'id', 'content', 'task', 'sprint', 'project'
        ]
        read_only_fields = ['id']

    def validate(self, data):
        """Ensure at least one resource is specified"""
        if not any([data.get('task'), data.get('sprint'), data.get('project')]):
            raise serializers.ValidationError(
                "Comment must be associated with at least one resource (task, sprint, project)"
            )
        return data
