from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from pm.models.user_models import User
from pm.serializers.user_serializers import (
    UserSerializer, UserDetailSerializer, UserCreateUpdateSerializer
)
from pm.utils.permission_helpers import has_role_permission


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_active', 'is_suspended', 'role']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering_fields = ['date_joined', 'username']
    ordering = ['-date_joined']

    def get_permissions(self):
        if self.action == 'create':
            return [AllowAny()]
        return super().get_permissions()


    def get_serializer_class(self):
        if self.action == 'retrieve':
            return UserDetailSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return UserCreateUpdateSerializer
        return UserSerializer

    @action(detail=False, methods=['GET'])
    def me(self, request):
        """
        Get current user information.
        """
        serializer = UserDetailSerializer(request.user, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['POST'])
    def suspend(self, request, pk=None):
        """
        Suspend a user. Only admins can perform this action.
        """
        # Check if requesting user has admin permissions
        if not (request.user.is_staff or request.user.is_superuser or
                has_role_permission(request.user, 'user.suspend')):
            return Response(
                {'error': 'You do not have permission to suspend users'},
                status=status.HTTP_403_FORBIDDEN
            )

        user = self.get_object()

        # Prevent suspending yourself
        if user.id == request.user.id:
            return Response(
                {'error': 'You cannot suspend yourself'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Prevent suspending superusers unless you're a superuser
        if user.is_superuser and not request.user.is_superuser:
            return Response(
                {'error': 'You cannot suspend a superuser'},
                status=status.HTTP_403_FORBIDDEN
            )

        user.is_suspended = True
        user.save()
        return Response({'status': 'User suspended'})

    @action(detail=True, methods=['POST'])
    def activate(self, request, pk=None):
        """
        Activate a user. Only admins can perform this action.
        """
        # Check if requesting user has admin permissions
        if not (request.user.is_staff or request.user.is_superuser or
                has_role_permission(request.user, 'user.activate')):
            return Response(
                {'error': 'You do not have permission to activate users'},
                status=status.HTTP_403_FORBIDDEN
            )

        user = self.get_object()
        user.is_suspended = False
        user.is_active = True
        user.save()
        return Response({'status': 'User activated'})

