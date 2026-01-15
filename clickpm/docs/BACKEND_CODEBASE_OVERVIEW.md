# ClickPM Backend Codebase Overview

## Project Summary
**ClickPM** is a comprehensive Django REST Framework-based project management system with JWT authentication, role-based access control, hierarchical task management, automatic completion calculations, and audit logging.

**Tech Stack:**
- Django 4.2
- Django REST Framework
- PostgreSQL
- JWT Authentication (Simple JWT)
- Django CORS Headers
- Django Filters

---

## Architecture

### Core Structure
```
clickpm/
├── clickpm/config/          # Django configuration
│   ├── settings.py         # Project settings, DB, JWT, CORS config
│   ├── urls.py             # Main URL routing
│   ├── wsgi.py             # WSGI app
│   └── asgi.py             # ASGI app
│
└── pm/                       # Main Django app
    ├── models/              # Data models
    ├── serializers/         # DRF serializers
    ├── views/               # API viewsets & views
    ├── services/            # Business logic services
    ├── permissions.py       # Custom permissions
    ├── router.py            # API routing
    ├── urls.py              # URL patterns
    └── utils/               # Helpers, validators, enums
```

---

## Data Models (pm/models/)

### 1. **User Models** (`user_models.py`)
```python
- User (AbstractUser)
  ├── role (ForeignKey → Role)
  ├── gender (CharField)
  ├── is_suspended (BooleanField)
  
- Role
  ├── name (CharField, unique)
  └── permissions (via RolePermission)
```

### 2. **Workspace Models** (`workspace_models.py`)
```python
- Workspace
  ├── name, description
  ├── owner (ForeignKey → User)
  ├── members (ManyToMany → User via WorkspaceMember)
  ├── created_at, updated_at
  └── Methods: get_public_projects(), is_member(), is_owner()
  
- WorkspaceMember
  ├── workspace (ForeignKey)
  ├── user (ForeignKey)
  ├── role (ForeignKey → Role, nullable)
  └── is_admin (BooleanField)
```

### 3. **Project Models** (`project_models.py`)
```python
Hierarchy: Project → Milestone → Sprint → Task

- Project
  ├── name, description
  ├── status (Not Started, In Progress, Done)
  ├── workspace (ForeignKey)
  ├── visibility (public/private)
  ├── members (ManyToMany via ProjectMember)
  ├── archived (BooleanField)
  └── Methods: calculate_completion_percentage()
  
- ProjectMember
  ├── user (ForeignKey)
  ├── project (ForeignKey)
  ├── role (ForeignKey)
  └── joined_at
  
- Milestone
  ├── project (ForeignKey)
  ├── name, description, status
  ├── start_date, end_date
  └── Methods: calculate_completion_percentage()
  
- Sprint
  ├── milestone (ForeignKey)
  ├── name, description, status
  ├── start_date, end_date
  └── Methods: calculate_completion_percentage()
     (Uses weighted task calculation)
```

### 4. **Task Models** (`task_models.py`)
```python
- Task
  ├── sprint (ForeignKey)
  ├── title, description
  ├── assignee (ForeignKey → User, nullable)
  ├── reporter (ForeignKey → User, nullable)
  ├── status (To-do, In Progress, Review, Done)
  ├── priority (Low, Medium, High, Critical)
  ├── start_date, due_date
  ├── weight_percentage (0-100, relative to sprint)
  └── Signal: save() triggers auto_complete_on_task_done when status=Done
  
- TaskDependency
  ├── task (ForeignKey)
  ├── depends_on (ForeignKey → Task)
  └── type (Blocked By, Blocks, Related To)
```

### 5. **Comment Models** (`comment_models.py`)
```python
- Comment
  ├── author (ForeignKey → User)
  ├── content (TextField)
  ├── task (ForeignKey, nullable)
  ├── sprint (ForeignKey, nullable)
  ├── project (ForeignKey, nullable)
  └── Polymorphic: Can be attached to Task, Sprint, or Project
```

### 6. **Notification Models** (`notification_models.py`)
```python
- Notification
  ├── recipient (ForeignKey → User)
  ├── actor (ForeignKey → User, nullable - for system notifications)
  ├── verb (CharField)
  ├── notification_type (mention, login, deadline, assignment, comment, general)
  ├── target (Generic relation to any model)
  ├── read (BooleanField)
  └── timestamp (auto)
```

### 7. **Activity Models** (`activity_models.py`)
```python
- ActivityLog (Audit Trail)
  ├── user (ForeignKey → User, nullable)
  ├── action (create, update, delete)
  ├── content_type (model name string)
  ├── object_id (ID of affected entity)
  ├── reason (TextField)
  ├── old_value (JSONField)
  ├── new_value (JSONField)
  ├── extra_info (JSONField - workspace, project context)
  └── timestamp (auto)
```

### 8. **Attachment Models** (`attachment_models.py`)
```python
- Attachment
  ├── file (FileField)
  ├── uploaded_at (auto)
  └── comment (ForeignKey)
```

### 9. **Access Models** (`access_models.py`)
```python
- WorkspaceProjectAccess
  ├── workspace_member (ForeignKey → WorkspaceMember)
  ├── project (ForeignKey → Project)
  ├── can_view, can_edit (BooleanFields)
  ├── granted_by (ForeignKey → User)
  └── granted_at (auto)
  
- RolePermission (RBAC)
  ├── role (ForeignKey → Role)
  ├── permission_type (workspace.*, project.*, task.*)
  └── Permissions: manage_members, create_projects, view, edit, delete
```

---

## Completion Calculation Logic

### Formula (Hierarchical Bottom-Up)
```
Task Level:
  TC_ijk = TW_ijk × (1 if status='Done' else 0)
  
Sprint Level:
  SC_ij = (Σ TC_ijk) / (Σ TW_ijk) × 100
  
Milestone Level:
  MC_i = Σ(SC_ij) / number_of_sprints × 100
  
Project Level:
  PC = Σ(MC_i) / number_of_milestones × 100

Where:
  TW = Task Weight (percentage)
  TC = Task Contribution (weight × completion)
  SC = Sprint Completion
  MC = Milestone Completion
  PC = Project Completion
```

### Auto-Completion Chain
When a Task is marked "Done", the system automatically:
1. Checks if all Tasks in Sprint are Done → Mark Sprint as Completed
2. Checks if all Sprints in Milestone are Completed → Mark Milestone as Completed
3. Checks if all Milestones in Project are Completed → Mark Project as Completed
4. Triggers notifications at each level

---

## API Viewsets & Endpoints

### Authentication Endpoints (auth_views.py)
```python
POST   /api/auth/register/           # Register new user
POST   /api/auth/login/              # Login (returns access + refresh tokens)
POST   /api/auth/refresh/            # Refresh access token
POST   /api/auth/change-password/    # Change password (authenticated)
POST   /api/auth/password-reset/     # Request password reset
POST   /api/auth/password-reset/confirm/  # Confirm password reset
POST   /api/auth/logout/             # Logout
```

### Users (UserViewSet)
```python
GET    /api/users/                   # List users (paginated, searchable)
POST   /api/users/                   # Create user
GET    /api/users/{id}/              # User detail
PUT    /api/users/{id}/              # Update user
DELETE /api/users/{id}/              # Delete user
GET    /api/users/me/                # Get current user
POST   /api/users/{id}/suspend/      # Suspend user
POST   /api/users/{id}/activate/     # Activate user

Filters: is_active, is_suspended, role
Search: username, email, first_name, last_name
```

### Roles (RoleViewSet)
```python
GET    /api/roles/                   # List roles (admin only)
POST   /api/roles/                   # Create role (admin only)
GET    /api/roles/{id}/              # Role detail (admin only)
PUT    /api/roles/{id}/              # Update role (admin only)
DELETE /api/roles/{id}/              # Delete role (admin only)
POST   /api/roles/{id}/assign_permission/    # Assign permission
POST   /api/roles/{id}/revoke_permission/    # Revoke permission
GET    /api/roles/{id}/list_permissions/     # List permissions
```

### Workspaces (WorkspaceViewSet)
```python
GET    /api/workspaces/                           # List user's workspaces
POST   /api/workspaces/                           # Create workspace
GET    /api/workspaces/{id}/                      # Workspace detail
PUT    /api/workspaces/{id}/                      # Update workspace
DELETE /api/workspaces/{id}/                      # Delete workspace
POST   /api/workspaces/{id}/add_member/           # Add member
POST   /api/workspaces/{id}/remove_member/        # Remove member
GET    /api/workspaces/{id}/members/              # List members
GET    /api/workspaces/{id}/workspace_projects/   # List projects in workspace
GET    /api/workspaces/{id}/member_project_access/  # Get project access
POST   /api/workspaces/{id}/grant_project_access/   # Grant project access
POST   /api/workspaces/{id}/revoke_project_access/  # Revoke project access
GET    /api/workspaces/my_workspaces/             # Get my workspaces

Filters: search by name, description
```

### Projects, Milestones, Sprints
```python
GET    /api/projects/                      # List projects
POST   /api/projects/                      # Create project
GET    /api/projects/{id}/                 # Project detail
PUT    /api/projects/{id}/                 # Update project
DELETE /api/projects/{id}/                 # Delete project
POST   /api/projects/{id}/add_member/      # Add member
POST   /api/projects/{id}/remove_member/   # Remove member
GET    /api/projects/my_projects/          # My projects

GET    /api/milestones/                    # List milestones
POST   /api/milestones/                    # Create milestone
GET    /api/milestones/{id}/               # Milestone detail
PUT    /api/milestones/{id}/               # Update milestone
DELETE /api/milestones/{id}/               # Delete milestone

GET    /api/sprints/                       # List sprints
POST   /api/sprints/                       # Create sprint
GET    /api/sprints/{id}/                  # Sprint detail
PUT    /api/sprints/{id}/                  # Update sprint
DELETE /api/sprints/{id}/                  # Delete sprint
```

### Tasks (TaskViewSet)
```python
GET    /api/tasks/                         # List tasks
POST   /api/tasks/                         # Create task
GET    /api/tasks/{id}/                    # Task detail
PUT    /api/tasks/{id}/                    # Update task
DELETE /api/tasks/{id}/                    # Delete task
GET    /api/tasks/my_tasks/                # My tasks
POST   /api/tasks/{id}/assign_to_me/       # Assign task to self
POST   /api/tasks/{id}/change_status/      # Change task status

Task Dependencies:
GET    /api/task-dependencies/             # List dependencies
POST   /api/task-dependencies/             # Create dependency
GET    /api/task-dependencies/{id}/        # Dependency detail
PUT    /api/task-dependencies/{id}/        # Update dependency
DELETE /api/task-dependencies/{id}/        # Delete dependency

Filters: status, priority, assignee, reporter, sprint
Search: title, description
```

### Comments (CommentViewSet)
```python
GET    /api/comments/                      # List comments
POST   /api/comments/                      # Create comment (with @mentions)
GET    /api/comments/{id}/                 # Comment detail
PUT    /api/comments/{id}/                 # Update comment
DELETE /api/comments/{id}/                 # Delete comment
GET    /api/comments/my_comments/          # My comments
GET    /api/comments/task_comments/?task_id=X    # Comments on task
GET    /api/comments/sprint_comments/?sprint_id=X  # Comments on sprint
GET    /api/comments/project_comments/?project_id=X  # Comments on project

Features: @username mentions create notifications
```

### Notifications (NotificationViewSet)
```python
GET    /api/notifications/                 # List user's notifications
GET    /api/notifications/{id}/            # Notification detail
PATCH  /api/notifications/{id}/            # Update notification
DELETE /api/notifications/{id}/            # Delete notification
GET    /api/notifications/unread/          # Get unread notifications
POST   /api/notifications/mark_all_read/   # Mark all as read
POST   /api/notifications/{id}/mark_read/  # Mark one as read
GET    /api/notifications/count_unread/    # Count unread

Filters: notification_type, read status
```

### Attachments (AttachmentViewSet)
```python
GET    /api/attachments/                   # List attachments
POST   /api/attachments/                   # Upload attachment (multipart/form-data)
GET    /api/attachments/{id}/              # Attachment detail
PUT    /api/attachments/{id}/              # Update attachment
DELETE /api/attachments/{id}/              # Delete attachment
```

### Activity Logs (ActivityLogViewSet)
```python
GET    /api/activity/                      # List all activity logs
GET    /api/activity/my_activity/?limit=50 # My activity
GET    /api/activity/recent/?limit=20      # Recent activity
GET    /api/activity/by_entity/?content_type=Task&object_id=123
GET    /api/activity/by_workspace/?workspace_id=123
GET    /api/activity/by_date_range/?start_date=2024-01-01&end_date=2024-12-31
GET    /api/activity/summary/?days=7&workspace_id=123

Filters: user, action, content_type, search
```

### Dashboard (DashboardViewSet)
```python
GET    /api/dashboard/overview/            # User's dashboard overview
GET    /api/dashboard/my_tasks/            # My tasks by status
GET    /api/dashboard/team_performance/    # Team performance metrics
```

---

## Services (pm/services/)

### 1. **Auto-Completion Service** (`auto_completion.py`)
- Automatically marks parent items as complete when all children are done
- Triggers chain reaction: Task → Sprint → Milestone → Project → Workspace
- Creates notifications at each completion level
- Entry point: `auto_complete_on_task_done(task)` (called on task.save())

### 2. **Audit Service** (`audit_service.py`)
- Centralized audit logging for all entity changes
- Captures: user, action, old state, new state, reason, timestamp
- Event types: CREATED, UPDATED, DELETED, TASK_ASSIGNED, TASK_STATUS_CHANGED, etc.
- Methods:
  - `log_create(user, instance, reason)`
  - `log_update(user, instance, old_state, reason)`
  - `log_delete(user, instance, reason)`
  - `capture_state(instance)` - serialize model state
  - `log_event(user, instance, action, old_state, new_state, reason, extra_info)`

### 3. **Notification Service** (`notification_service.py`)
- Manages notifications creation and delivery
- Types: mention, login, deadline, assignment, comment, general
- Features: @mention detection in comments, auto-notification on task assignment

### 4. **Weightage Service** (`weightage_service.py`)
- Validates task weight percentages
- Ensures weights don't exceed 100% per sprint
- Methods: `validate_task_weight_on_create_or_update(task, new_weight, sprint)`

### 5. **Analytics Service** (`analytics_service.py`)
- Computes team performance metrics
- Calculates project/team completion percentages
- Performance dashboards

### 6. **Dependency Service** (`dependency_service.py`)
- Manages task dependencies and blocking logic
- Validates dependency cycles
- Prevents invalid dependency states

### 7. **Gantt Service** (`gantt_service.py`)
- Generates Gantt chart data
- Timeline visualization support

---

## Permissions & Access Control

### Custom Permissions (permissions.py)
```python
- IsWorkspaceMember        # Check if user is workspace member
- IsWorkspaceAdmin         # Check if user is workspace admin
- CanViewProject           # Multi-level: Member > Workspace Admin > Public
- IsProjectMember          # Strict project member check
- IsTaskAssignee           # Assignee or reporter of task
- IsCommentAuthor          # Comment author
- IsOwnerOrReadOnly        # Owner can edit, others read-only
- HasRolePermission        # Role-based permission check
```

### Permission Levels
```
1. Superuser/Staff        → Full access
2. Workspace Owner        → Full workspace control
3. Workspace Admin        → Manage members, projects
4. Project Member         → View/edit project
5. Task Assignee          → View task even if project private
6. Public Project Member  → View only (if workspace member)
7. Anonymous              → No access (except auth endpoints)
```

### Access Grant Model
- Explicit fine-grained project access via `WorkspaceProjectAccess`
- Workspace members can be granted specific can_view/can_edit permissions
- Default: workspace admins have full access

---

## Serializers (pm/serializers/)

### Core Serializers
- **UserSerializer, UserDetailSerializer, UserCreateUpdateSerializer** - User CRUD
- **ProjectSerializer, ProjectDetailSerializer, ProjectCreateUpdateSerializer** - Projects
- **MilestoneSerializer, SprintSerializer** - Hierarchy serializers
- **TaskSerializer, TaskDetailSerializer, TaskCreateUpdateSerializer** - Tasks
- **CommentSerializer, CommentDetailSerializer** - Comments
- **NotificationSerializer** - Notifications
- **WorkspaceSerializer, WorkspaceMemberSerializer** - Workspace management
- **ActivitySerializer, ActivityLogSerializer** - Audit logs
- **AttachmentSerializer** - File attachments
- **AccessSerializers** - Workspace project access grants

### Key Features
- Nested serializers for hierarchy (Project → Milestone → Sprint → Task)
- Read-only completion percentages (auto-calculated)
- Relationship field translation (IDs to names)
- Validation: task weights, dependencies, permissions

---

## Utilities (pm/utils/)

### Helpers (`helpers.py`)
- URL generation, string utilities
- Date/time helpers
- Response formatting

### Permission Helpers (`permission_helpers.py`)
```python
- can_user_view_project(user, project)
- can_user_edit_project(user, project)
- is_workspace_admin(user, workspace)
- has_role_permission(user, permission)
- get_accessible_projects(user)
```

### Validators (`validators.py`)
- Email validation
- Date range validation
- Task weight validation

### Enums (`enums.py`)
- Status choices
- Priority choices
- Permission types
- Notification types

### Role Permissions (`role_permissions.py`)
- Permission definitions for roles
- Permission checks

---

## Database Configuration

### settings.py
```python
DATABASE: PostgreSQL
HOST: localhost
PORT: 5432
NAME: click
USER: anik
PASSWORD: password

# Can be overridden with env vars:
SQL_ENGINE, SQL_DATABASE, SQL_USER, SQL_PASSWORD, SQL_HOST, SQL_PORT
```

### CORS
```python
CORS_ALLOW_ALL_ORIGINS = True  # Development only!
```

### JWT Settings
```python
ACCESS_TOKEN_LIFETIME: 60 minutes
REFRESH_TOKEN_LIFETIME: 1 day
ROTATE_REFRESH_TOKENS: True
BLACKLIST_AFTER_ROTATION: True
```

---

## URL Routing

### Main Router (router.py)
Uses Django REST Framework `DefaultRouter` to auto-generate:
- List: `GET /api/resource/`
- Create: `POST /api/resource/`
- Detail: `GET /api/resource/{id}/`
- Update: `PUT/PATCH /api/resource/{id}/`
- Delete: `DELETE /api/resource/{id}/`

### Custom Actions
Custom actions via `@action` decorator with custom HTTP methods

### URL Configuration (urls.py)
```python
path('admin/', admin.site.urls)                    # Django admin
path('api/', include('pm.urls'))                   # API routes
path('', HomeView.as_view(), name='home')         # Home
path('favicon.ico', favicon)                       # Favicon
path('/media/', ...)                               # Media files
path('/static/', ...)                              # Static files
```

---

## Key Features Summary

✅ **JWT Authentication** - Secure token-based auth with refresh  
✅ **Hierarchical Project Structure** - Workspace → Project → Milestone → Sprint → Task  
✅ **Weighted Task Completion** - Automatic bottom-up calculation  
✅ **Auto-Completion Chain** - Tasks → Sprints → Milestones → Projects  
✅ **Role-Based Access Control (RBAC)** - Workspace roles, project roles, permissions  
✅ **Fine-Grained Access Grants** - Explicit project access per workspace member  
✅ **Audit Logging** - Comprehensive activity trails with state diffs  
✅ **Comments with Mentions** - @username mentions create notifications  
✅ **File Attachments** - Upload files to comments  
✅ **Task Dependencies** - Blocked by / Blocks / Related to  
✅ **Notifications** - Mentions, assignments, deadlines, logins  
✅ **Dashboard** - User tasks, team performance, project overview  
✅ **Filtering & Search** - All list endpoints support filtering/search  
✅ **Pagination** - Default 10 items/page, configurable  

---

## Testing & Development

### Test Files
- `comprehensive_test.py` - Full API test suite
- `tests/` directory - Unit tests for endpoints

### Running Tests
```bash
python manage.py test
# or
python comprehensive_test.py
```

### Local Development
```bash
# Activate virtual environment
source .venv/bin/activate  # Linux/Mac
.venv\Scripts\activate.ps1 # Windows

# Run migrations
python manage.py makemigrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Run server
python manage.py runserver
```

---

## Production Checklist

⚠️ **Before deploying:**
- [ ] Change `SECRET_KEY` in settings.py
- [ ] Set `DEBUG = False`
- [ ] Configure `ALLOWED_HOSTS`
- [ ] Use environment variables for sensitive data
- [ ] Enable HTTPS
- [ ] Set strong database password
- [ ] Configure proper CORS (not allow_all)
- [ ] Use strong JWT secret keys
- [ ] Setup proper logging
- [ ] Configure email backend (not console)
- [ ] Setup static files collection
- [ ] Setup media files storage

---

## Common Development Patterns

### Adding a New Entity Type
1. Create model in `models/`
2. Create serializers in `serializers/`
3. Create viewset in `views/`
4. Register in `router.py`
5. Add to `admin.py`
6. Create migrations: `python manage.py makemigrations`
7. Apply: `python manage.py migrate`
8. Add tests

### Adding Custom Actions to ViewSet
```python
@action(detail=True, methods=['POST'])
def custom_action(self, request, pk=None):
    obj = self.get_object()
    # Logic
    return Response({'result': 'success'})
```

### Logging Audit Events
```python
from pm.services.audit_service import AuditService, EventType

AuditService.log_event(
    user=request.user,
    instance=obj,
    action=EventType.TASK_ASSIGNED,
    old_state=old_state,
    new_state=new_state,
    reason='Task reassigned',
    extra_info={'target_user': 'john'}
)
```

---

## API Response Format

### Success Response (200)
```json
{
  "id": 1,
  "name": "Project Name",
  "status": "In Progress",
  "completion_percentage": 45.5,
  "created_at": "2024-01-15T10:30:00Z"
}
```

### Error Response (400, 404, 500)
```json
{
  "detail": "Error message",
  "error": "Additional error info"
}
```

### Paginated Response (200)
```json
{
  "count": 150,
  "next": "http://api/items/?page=2",
  "previous": null,
  "results": [...]
}
```

---

## Performance Considerations

- **Database Queries**: Use `select_related()` and `prefetch_related()` for nested data
- **Completion Calculations**: Cached where possible, computed on demand for real-time accuracy
- **Pagination**: Default 10 items, max configurable
- **Indexes**: Added on frequently queried fields (recipient, timestamp, read status)
- **Async Tasks**: Notifications created synchronously; consider Celery for scale

---

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| Django | 4.2.0 | Web framework |
| DRF | 3.14.0 | REST API |
| Simple JWT | 5.2.2 | JWT authentication |
| django-filter | 23.1 | Filtering backends |
| django-cors-headers | 3.14.0 | CORS handling |
| psycopg2-binary | 2.9.6 | PostgreSQL adapter |
| Pillow | 9.5.0 | Image handling |

---

**Last Updated**: December 23, 2025  
**Framework Version**: Django 4.2 + DRF 3.14
