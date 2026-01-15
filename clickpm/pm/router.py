from django.urls import path, include
from rest_framework.routers import DefaultRouter
from pm.views.user_views import UserViewSet
# from pm.views.user_views import UserViewSet, RegisterView, LoginView, LogoutView, RefreshTokenView, ChangePasswordView
from pm.views.role_views import RoleViewSet
from pm.views.project_views import ProjectViewSet, MilestoneViewSet, SprintViewSet
from pm.views.task_views import TaskViewSet, TaskDependencyViewSet
from pm.views.comment_views import CommentViewSet
from pm.views.attachment_views import AttachmentViewSet
from pm.views.activity_views import ActivityLogViewSet
from pm.views.dashboard_views import DashboardViewSet
from pm.views.workspace_views import WorkspaceViewSet
from pm.views.notification_views import NotificationViewSet
from pm.views.search_views import SearchViewSet

router = DefaultRouter()

# User Management
router.register(r'users', UserViewSet, basename='user')
router.register(r'roles', RoleViewSet, basename='role')

# Workspaces
router.register(r'workspaces', WorkspaceViewSet, basename='workspace')

# Projects
router.register(r'projects', ProjectViewSet, basename='project')
router.register(r'milestones', MilestoneViewSet, basename='milestone')
router.register(r'sprints', SprintViewSet, basename='sprint')

# Tasks
router.register(r'tasks', TaskViewSet, basename='task')
router.register(r'task-dependencies', TaskDependencyViewSet, basename='task-dependency')

# Notifications
router.register(r'notifications', NotificationViewSet, basename='notification')

# Comments
router.register(r'comments', CommentViewSet, basename='comment')

# Attachments
router.register(r'attachments', AttachmentViewSet, basename='attachment')

# Activity Logs
router.register(r'activity', ActivityLogViewSet, basename='activity')

# Dashboard
router.register(r'dashboard', DashboardViewSet, basename='dashboard')

# Search
router.register(r'search', SearchViewSet, basename='search')


urlpatterns = router.urls


# urlpatterns = [
#     # Router URLs (NO double "api/api")
#     path('', include(router.urls)),

#     # Auth Endpoints
#     path('auth/register/', RegisterView.as_view(), name='register'),
#     path('auth/login/', LoginView.as_view(), name='login'),
#     path('auth/logout/', LogoutView.as_view(), name='logout'),
#     path('auth/refresh/', RefreshTokenView.as_view(), name='token_refresh'),
#     path('auth/change-password/', ChangePasswordView.as_view(), name='change_password'),
# ]
