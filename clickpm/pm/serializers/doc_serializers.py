from rest_framework import serializers
from pm.models.doc_models import Doc


class DocListSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = Doc
        fields = ['id', 'project', 'title', 'created_by', 'created_by_username', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_by', 'created_by_username', 'created_at', 'updated_at']


class DocDetailSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = Doc
        fields = ['id', 'project', 'title', 'content', 'created_by', 'created_by_username', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_by', 'created_by_username', 'created_at', 'updated_at']
