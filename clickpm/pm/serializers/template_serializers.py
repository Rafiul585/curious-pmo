from rest_framework import serializers
from pm.models.template_models import TaskTemplate


class TaskTemplateSerializer(serializers.ModelSerializer):
    default_tags_details = serializers.SerializerMethodField()
    created_by_name      = serializers.SerializerMethodField()

    class Meta:
        model  = TaskTemplate
        fields = [
            'id', 'workspace', 'name', 'description', 'default_priority',
            'default_tags', 'default_tags_details',
            'checklist_items', 'custom_field_defaults',
            'created_by', 'created_by_name', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_default_tags_details(self, obj):
        return [{'id': t.id, 'name': t.name, 'color': t.color} for t in obj.default_tags.all()]

    def get_created_by_name(self, obj):
        if not obj.created_by:
            return None
        u = obj.created_by
        return f'{u.first_name} {u.last_name}'.strip() or u.username
