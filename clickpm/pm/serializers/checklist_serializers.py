from rest_framework import serializers
from pm.models.task_models import Checklist, ChecklistItem


class ChecklistItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChecklistItem
        fields = ['id', 'checklist', 'text', 'is_checked', 'order']
        read_only_fields = ['id']


class ChecklistSerializer(serializers.ModelSerializer):
    items = ChecklistItemSerializer(many=True, read_only=True)
    total_items = serializers.SerializerMethodField()
    checked_items = serializers.SerializerMethodField()

    class Meta:
        model = Checklist
        fields = ['id', 'task', 'title', 'order', 'items', 'total_items', 'checked_items', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_total_items(self, obj) -> int:
        return obj.items.count()

    def get_checked_items(self, obj) -> int:
        return obj.items.filter(is_checked=True).count()
