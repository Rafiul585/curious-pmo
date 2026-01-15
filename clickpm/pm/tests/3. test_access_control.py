from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from pm.models.workspace_models import Workspace, WorkspaceMember
from pm.models.project_models import Project
from pm.models.user_models import Role
from pm.models.access_models import WorkspaceProjectAccess, RolePermission

User = get_user_model()

class AccessControlTests(APITestCase):
    def setUp(self):
        # Create users
        self.owner = User.objects.create_user(username='owner', password='password')
        self.admin = User.objects.create_user(username='admin', password='password')
        self.member = User.objects.create_user(username='member', password='password')
        self.outsider = User.objects.create_user(username='outsider', password='password')
        
        # Create workspace
        self.workspace = Workspace.objects.create(name='Test Workspace', owner=self.owner)
        
        # Add members
        WorkspaceMember.objects.create(workspace=self.workspace, user=self.admin, is_admin=True)
        self.member_membership = WorkspaceMember.objects.create(workspace=self.workspace, user=self.member, is_admin=False)
        
        # Create projects
        self.public_project = Project.objects.create(
            name='Public Project', 
            workspace=self.workspace, 
            visibility='public',
            start_date='2023-01-01',
            end_date='2023-12-31'
        )
        self.private_project = Project.objects.create(
            name='Private Project', 
            workspace=self.workspace, 
            visibility='private',
            start_date='2023-01-01',
            end_date='2023-12-31'
        )
        
        # Create Role
        self.manager_role = Role.objects.create(name='Manager')
        self.developer_role = Role.objects.create(name='Developer')

    def test_workspace_admin_permissions(self):
        """Test that workspace admins can manage members and grants"""
        self.client.force_authenticate(user=self.admin)
        
        # 1. Grant project access
        url = reverse('workspace-grant-project-access', args=[self.workspace.id])
        data = {
            'user_id': self.member.id,
            'project_id': self.private_project.id,
            'can_view': True,
            'can_edit': True
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(WorkspaceProjectAccess.objects.filter(
            workspace_member=self.member_membership, 
            project=self.private_project
        ).exists())
        
        # 2. Revoke project access
        url = reverse('workspace-revoke-project-access', args=[self.workspace.id])
        data = {
            'user_id': self.member.id,
            'project_id': self.private_project.id
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(WorkspaceProjectAccess.objects.filter(
            workspace_member=self.member_membership, 
            project=self.private_project
        ).exists())

    def test_non_admin_cannot_manage_access(self):
        """Test that regular members cannot grant access"""
        self.client.force_authenticate(user=self.member)
        url = reverse('workspace-grant-project-access', args=[self.workspace.id])
        data = {
            'user_id': self.member.id,
            'project_id': self.private_project.id,
            'can_view': True
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_fine_grained_project_access(self):
        """Test that explicit grants allow access to private projects"""
        # Initially member cannot see private project
        self.client.force_authenticate(user=self.member)
        url = reverse('project-detail', args=[self.private_project.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
        # Grant access
        WorkspaceProjectAccess.objects.create(
            workspace_member=self.member_membership,
            project=self.private_project,
            can_view=True
        )
        
        # Now member should see it
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_role_based_permissions(self):
        """Test RBAC logic"""
        # Assign role to member
        self.member.role = self.manager_role
        self.member.save()
        
        # Assign permission to role
        RolePermission.objects.create(
            role=self.manager_role,
            permission_type='project.edit'
        )
        
        # Check permission helper directly first
        from pm.utils.permission_helpers import has_role_permission
        self.assertTrue(has_role_permission(self.member, 'project.edit'))
        self.assertFalse(has_role_permission(self.member, 'project.delete'))

    def test_public_project_backward_compatibility(self):
        """Test that workspace members can still see public projects"""
        self.client.force_authenticate(user=self.member)
        url = reverse('project-detail', args=[self.public_project.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
