from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from pm.models.comment_models import Comment
from pm.serializers.comment_serializers import (
    CommentSerializer, CommentDetailSerializer, CommentCreateUpdateSerializer
)
from pm.permissions import IsCommentAuthor, IsOwnerOrReadOnly


class CommentViewSet(viewsets.ModelViewSet):
    queryset = Comment.objects.all()
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['task', 'sprint', 'project', 'author']
    search_fields = ['content']
    ordering_fields = ['created_at']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return CommentDetailSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return CommentCreateUpdateSerializer
        return CommentSerializer

    def perform_create(self, serializer):
        comment = serializer.save(author=self.request.user)
        
        # Parse mentions from content and create notifications
        self._create_mention_notifications(comment)

    @action(detail=False, methods=['GET'])
    def my_comments(self, request):
        """
        Get comments created by the current user.
        """
        comments = Comment.objects.filter(author=request.user)
        serializer = CommentSerializer(comments, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['GET'])
    def task_comments(self, request):
        """
        Get comments for a specific task.
        """
        task_id = request.query_params.get('task_id')
        if not task_id:
            return Response(
                {'error': 'task_id query parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        comments = Comment.objects.filter(task_id=task_id)
        serializer = CommentSerializer(comments, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['GET'])
    def sprint_comments(self, request):
        """
        Get comments for a specific sprint.
        """
        sprint_id = request.query_params.get('sprint_id')
        if not sprint_id:
            return Response(
                {'error': 'sprint_id query parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        comments = Comment.objects.filter(sprint_id=sprint_id)
        serializer = CommentSerializer(comments, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['GET'])
    def project_comments(self, request):
        """
        Get comments for a specific project.
        """
        project_id = request.query_params.get('project_id')
        if not project_id:
            return Response(
                {'error': 'project_id query parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        comments = Comment.objects.filter(project_id=project_id)
        serializer = CommentSerializer(comments, many=True, context={'request': request})
        return Response(serializer.data)

    def _create_mention_notifications(self, comment):
        """
        Parse comment content for @mentions and create notifications.
        Mentions are in the format @username
        """
        import re
        from pm.models.user_models import User
        from pm.models.notification_models import Notification
        from django.contrib.contenttypes.models import ContentType
        
        # Find all @username mentions in the content
        mention_pattern = r'@(\w+)'
        mentioned_usernames = re.findall(mention_pattern, comment.content)
        
        if not mentioned_usernames:
            return
        
        # Get existing users
        mentioned_users = User.objects.filter(username__in=mentioned_usernames)
        
        # Determine the target object
        target = None
        if comment.task:
            target = comment.task
        elif comment.sprint:
            target = comment.sprint
        elif comment.project:
            target = comment.project
        
        # Create notification for each mentioned user
        for user in mentioned_users:
            if user != comment.author:  # Don't notify yourself
                Notification.objects.create(
                    recipient=user,
                    actor=comment.author,
                    verb=f'mentioned you in a comment',
                    notification_type='mention',
                    target_content_type=ContentType.objects.get_for_model(target) if target else None,
                    target_object_id=target.id if target else None
                )

