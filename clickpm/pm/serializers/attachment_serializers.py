from rest_framework import serializers
from pm.models.attachment_models import Attachment


class AttachmentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    uploaded_by_name = serializers.CharField(source='uploaded_by.username', read_only=True)

    class Meta:
        model = Attachment
        fields = [
            'id', 'file', 'file_url', 'filename', 'file_size',
            'uploaded_at', 'uploaded_by', 'uploaded_by_name',
            'comment', 'task'
        ]

    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return None


class AttachmentCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attachment
        fields = ['file', 'comment', 'task']

    def validate(self, data):
        if not data.get('comment') and not data.get('task'):
            raise serializers.ValidationError(
                "Attachment must be associated with either a comment or a task"
            )
        return data
