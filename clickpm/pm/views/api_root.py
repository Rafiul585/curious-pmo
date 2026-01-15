from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.reverse import reverse
from django.urls.exceptions import NoReverseMatch

@api_view(['GET'])
@permission_classes([AllowAny])
def api_root(request, format=None):
    """
    Public API root view showing all available endpoints.
    Authentication is required for most endpoints.
    """
    
    def safe_reverse(name, *args, **kwargs):
        """Helper to safely reverse URLs"""
        try:
            return reverse(name, request=request, format=format, *args, **kwargs)
        except NoReverseMatch:
            return None
    
    # Build authentication endpoints
    auth_endpoints = {
        'register': safe_reverse('register'),
        'login': safe_reverse('login'),
        'refresh': safe_reverse('refresh_token'),
        'change-password': safe_reverse('change_password'),
        'password-reset': safe_reverse('request_password_reset'),
        'password-reset-confirm': safe_reverse('confirm_password_reset'),
        'logout': safe_reverse('logout'),
    }
    
    # Build resource endpoints (remove None values)
    resource_endpoints = {
        'users': safe_reverse('user-list'),
        'roles': safe_reverse('role-list'),
        'workspaces': safe_reverse('workspace-list'),
        'projects': safe_reverse('project-list'),
        'milestones': safe_reverse('milestone-list'),
        'sprints': safe_reverse('sprint-list'),
        'tasks': safe_reverse('task-list'),
        'task-dependencies': safe_reverse('task-dependency-list'),
        'notifications': safe_reverse('notification-list'),
        'comments': safe_reverse('comment-list'),
        'attachments': safe_reverse('attachment-list'),
        'activity': safe_reverse('activity-list'),
    }
    
    # Dashboard has custom actions, not a standard list
    dashboard_url = safe_reverse('dashboard-overview')
    if dashboard_url:
        resource_endpoints['dashboard-overview'] = dashboard_url
        
    # Remove None values
    auth_endpoints = {k: v for k, v in auth_endpoints.items() if v}
    resource_endpoints = {k: v for k, v in resource_endpoints.items() if v}
    
    return Response({
        'message': 'ClickPM API - Project Management System',
        'version': '1.0',
        'authentication': auth_endpoints,
        'resources': resource_endpoints,
        'dashboard': {
            'overview': '/api/dashboard/overview/',
            'my-tasks': '/api/dashboard/my_tasks/',
        },
        'docs': {
            'completion_formula': 'Task → Sprint → Milestone → Project (weighted bottom-up)',
            'hierarchy': 'Task belongs to Sprint, Sprint to Milestone, Milestone to Project, Project to Workspace',
        },
        'note': 'Most endpoints require authentication. Use JWT Bearer token in Authorization header.'
    })

