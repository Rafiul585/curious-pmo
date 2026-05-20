from rest_framework import serializers
from pm.models.workspace_models import Tag


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ['id', 'workspace', 'name', 'color']
        read_only_fields = ['id']
