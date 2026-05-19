from rest_framework import serializers
from pm.models.project_models import AutomationRule


class AutomationRuleSerializer(serializers.ModelSerializer):
    trigger_display = serializers.CharField(source='get_trigger_display', read_only=True)
    action_display  = serializers.CharField(source='get_action_display',  read_only=True)

    class Meta:
        model  = AutomationRule
        fields = [
            'id', 'project', 'name', 'trigger', 'trigger_display',
            'conditions', 'action', 'action_display', 'action_params',
            'is_active', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']
