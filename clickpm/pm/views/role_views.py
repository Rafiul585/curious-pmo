from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser

from pm.models.user_models import Role
from pm.models.access_models import RolePermission
from pm.serializers.access_serializers import RolePermissionSerializer

class RoleViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Roles and their permissions.
    Only accessible by superusers or staff (system admins).
    """
    queryset = Role.objects.all()
    # Using a basic serializer for Role itself, assuming it exists or creating a simple one inline if needed.
    # Since we didn't define a RoleSerializer in access_serializers, we'll use a simple one here or import if available.
    # Checking imports... we imported RolePermissionSerializer.
    # Let's define a simple RoleSerializer here or use one from user_serializers if it exists.
    # For now, I'll assume we need to create a simple one or use a generic serializer.
    # Let's check if we can import RoleSerializer from user_serializers.
    # If not, I'll define one.
    permission_classes = [IsAuthenticated, IsAdminUser] # Restrict to system admins

    def get_serializer_class(self):
        from pm.serializers.user_serializers import RoleSerializer
        return RoleSerializer

    @action(detail=True, methods=['POST'])
    def assign_permission(self, request, pk=None):
        """
        Assign permission to role.
        POST /api/roles/{id}/assign_permission/
        Body: {"permission_type": "project.edit"}
        """
        role = self.get_object()
        permission_type = request.data.get('permission_type')
        
        if not permission_type:
            return Response(
                {'error': 'permission_type is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Validate permission type against choices
        valid_types = [choice[0] for choice in RolePermission.PERMISSION_CHOICES]
        if permission_type not in valid_types:
             return Response(
                {'error': f'Invalid permission type. Valid types: {valid_types}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        permission, created = RolePermission.objects.get_or_create(
            role=role,
            permission_type=permission_type
        )
        
        return Response({
            'status': 'Permission assigned',
            'permission': RolePermissionSerializer(permission).data
        })

    @action(detail=True, methods=['POST'])
    def revoke_permission(self, request, pk=None):
        """
        Revoke permission from role.
        POST /api/roles/{id}/revoke_permission/
        Body: {"permission_type": "project.edit"}
        """
        role = self.get_object()
        permission_type = request.data.get('permission_type')
        
        if not permission_type:
            return Response(
                {'error': 'permission_type is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        deleted_count, _ = RolePermission.objects.filter(
            role=role,
            permission_type=permission_type
        ).delete()
        
        if deleted_count > 0:
            return Response({'status': 'Permission revoked'})
        else:
            return Response(
                {'error': 'Permission not found for this role'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['GET'])
    def list_permissions(self, request, pk=None):
        """
        List all permissions for a role.
        GET /api/roles/{id}/list_permissions/
        """
        role = self.get_object()
        permissions = RolePermission.objects.filter(role=role)
        serializer = RolePermissionSerializer(permissions, many=True)
        return Response(serializer.data)
