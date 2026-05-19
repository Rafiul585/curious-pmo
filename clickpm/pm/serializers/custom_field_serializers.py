from rest_framework import serializers
from pm.models.project_models import CustomFieldDefinition, TaskCustomFieldValue


class CustomFieldDefinitionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomFieldDefinition
        fields = ['id', 'project', 'name', 'field_type', 'options', 'required', 'order']
        read_only_fields = ['id']


class TaskCustomFieldValueSerializer(serializers.ModelSerializer):
    field_name = serializers.CharField(source='field.name', read_only=True)
    field_type = serializers.CharField(source='field.field_type', read_only=True)
    field_options = serializers.JSONField(source='field.options', read_only=True)

    class Meta:
        model = TaskCustomFieldValue
        fields = ['id', 'task', 'field', 'field_name', 'field_type', 'field_options', 'value']
        read_only_fields = ['id']
