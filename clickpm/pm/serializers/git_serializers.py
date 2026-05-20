from rest_framework import serializers
from pm.models.git_models import GitIntegration, TaskGitLink


class GitIntegrationSerializer(serializers.ModelSerializer):
    webhook_url = serializers.SerializerMethodField()

    class Meta:
        model = GitIntegration
        fields = ['id', 'workspace', 'provider', 'repo_url', 'webhook_secret', 'webhook_url', 'created_at']
        read_only_fields = ['id', 'created_at', 'webhook_url']
        extra_kwargs = {
            'webhook_secret': {'write_only': True},
        }

    def get_webhook_url(self, obj):
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(f'/api/webhooks/github/{obj.id}/')
        return f'/api/webhooks/github/{obj.id}/'


class TaskGitLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskGitLink
        fields = ['id', 'task', 'integration', 'pr_url', 'pr_number', 'pr_title',
                  'commit_sha', 'status', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
