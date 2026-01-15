# API Endpoints (concise reference)

Base URL: `/api/`

Auth: JWT access token required for all endpoints except where noted.

Primary route files:
- API root and auth: [clickpm/pm/urls.py](clickpm/pm/urls.py)
- Router registrations: [clickpm/pm/router.py](clickpm/pm/router.py)
- Project-level urls include: [clickpm/clickpm/config/urls.py](clickpm/clickpm/config/urls.py)

Notes:
- All router-registered resources use standard DRF ModelViewSet routes: `GET /<prefix>/` (list), `POST /<prefix>/` (create), `GET /<prefix>/{id}/` (retrieve), `PUT/PATCH /<prefix>/{id}/` (update/partial_update), `DELETE /<prefix>/{id}/` (destroy), unless the viewset restricts `http_method_names`.
- Custom actions are listed per resource below (they map to `/<prefix>/<action>/` for detail=False or `/<prefix>/{id}/{action}/` for detail=True).

---

1) Authentication (public endpoints)
- POST `/api/auth/register/` — create account. See [clickpm/pm/views/auth_views.py](clickpm/pm/views/auth_views.py).
- POST `/api/auth/login/` — obtain `access` and `refresh` JWT tokens.
- POST `/api/auth/refresh/` — provide `refresh` token to get new `access`.
- POST `/api/auth/password-reset/` — request reset email (public).
- POST `/api/auth/password-reset/confirm/` — confirm reset with token.
- POST `/api/auth/change-password/` — authenticated endpoint to change password.
- POST `/api/auth/logout/` — authenticated; blacklist refresh token.

2) Users (`/api/users/`) — viewset: `UserViewSet` ([clickpm/pm/views/user_views.py](clickpm/pm/views/user_views.py))
- Standard: `GET /api/users/`, `POST /api/users/`, `GET /api/users/{id}/`, `PUT/PATCH /api/users/{id}/`, `DELETE /api/users/{id}/`
- Custom actions:
  - `GET /api/users/me/` — current user's details.
  - `POST /api/users/{id}/suspend/` — suspend a user.
  - `POST /api/users/{id}/activate/` — activate a user.
- Permissions: authenticated except `create` (AllowAny).

3) Roles (`/api/roles/`) — `RoleViewSet` ([clickpm/pm/views/role_views.py](clickpm/pm/views/role_views.py))
- Standard CRUD endpoints via router.

4) Workspaces (`/api/workspaces/`) — `WorkspaceViewSet` ([clickpm/pm/views/workspace_views.py](clickpm/pm/views/workspace_views.py))
- Standard CRUD endpoints.
- Custom actions (detail=True unless noted):
  - `POST /api/workspaces/{id}/add_member/` — add or update a member.
  - `POST /api/workspaces/{id}/remove_member/` — remove a member.
  - `GET /api/workspaces/my_workspaces/` (detail=False) — list workspaces for current user.
  - `GET /api/workspaces/{id}/workspace_projects/` — projects in the workspace filtered by access.
  - `GET /api/workspaces/{id}/members/` — list workspace members.
  - `POST /api/workspaces/{id}/grant_project_access/` — grant project access to a workspace member.
  - `POST /api/workspaces/{id}/revoke_project_access/` — revoke project access.
  - `GET /api/workspaces/{id}/member_project_access/` — list project-access grants for members.
  - `GET /api/workspaces/{id}/activity_logs/` — workspace activity logs.
- Permissions: various checks; admin-only for grant/revoke; member checks for some detail actions.

5) Projects (`/api/projects/`) — `ProjectViewSet` ([clickpm/pm/views/project_views.py](clickpm/pm/views/project_views.py))
- Standard CRUD endpoints.
- Custom actions:
  - `POST /api/projects/{id}/add_member/` — add member to project (body: `user_id`, optional `role_id`).
  - `POST /api/projects/{id}/remove_member/` — remove project member (body: `user_id`).
  - `GET /api/projects/my_projects/` (detail=False) — projects where current user is a member.
  - `GET /api/projects/{id}/activity_logs/` — activity logs for project and contained entities.
- Permissions: `IsAuthenticated` + `CanViewProject`.

6) Milestones (`/api/milestones/`) — `MilestoneViewSet` ([clickpm/pm/views/project_views.py](clickpm/pm/views/project_views.py))
- Standard CRUD endpoints.
- Custom: `GET /api/milestones/{id}/activity_logs/`.

7) Sprints (`/api/sprints/`) — `SprintViewSet` ([clickpm/pm/views/project_views.py](clickpm/pm/views/project_views.py))
- Standard CRUD endpoints.
- Custom: `GET /api/sprints/{id}/activity_logs/`.

8) Tasks (`/api/tasks/`) — `TaskViewSet` ([clickpm/pm/views/task_views.py](clickpm/pm/views/task_views.py))
- Standard CRUD: list/create/retrieve/update/partial_update/destroy.
- Custom actions:
  - `POST /api/tasks/{id}/assign_to_me/` — assign the task to current user.
  - `POST /api/tasks/{id}/change_status/` — change status (body: `status`).
  - `GET /api/tasks/my_tasks/` (detail=False) — tasks assigned to current user.
  - `GET /api/tasks/reported_by_me/` (detail=False) — tasks reported by current user.
  - `GET /api/tasks/{id}/activity_logs/` — activity logs for the task.

9) Task Dependencies (`/api/task-dependencies/`) — `TaskDependencyViewSet` ([clickpm/pm/views/task_views.py](clickpm/pm/views/task_views.py))
- Standard CRUD endpoints.

10) Comments (`/api/comments/`) — `CommentViewSet` ([clickpm/pm/views/comment_views.py](clickpm/pm/views/comment_views.py))
- Standard CRUD endpoints.
- Custom actions:
  - `GET /api/comments/my_comments/` — comments by current user.
  - `GET /api/comments/task_comments/?task_id=...` — comments for a task.
  - `GET /api/comments/sprint_comments/?sprint_id=...` — comments for a sprint.
  - `GET /api/comments/project_comments/?project_id=...` — comments for a project.
- Note: mentions (@username) in comments create notifications automatically.

11) Attachments (`/api/attachments/`) — `AttachmentViewSet` ([clickpm/pm/views/attachment_views.py](clickpm/pm/views/attachment_views.py))
- Standard CRUD endpoints for file attachments.

12) Activity / Audit (`/api/activity/`) — `ActivityLogViewSet` ([clickpm/pm/views/activity_views.py](clickpm/pm/views/activity_views.py))
- Read-only: `GET /api/activity/`, `GET /api/activity/{id}/`.
- Useful query endpoints (detail=False):
  - `GET /api/activity/my_activity/` — actions by current user (`?limit=`).
  - `GET /api/activity/recent/` — recent activities (`?limit=`).
  - `GET /api/activity/by_entity/?content_type=Task&object_id=123`.
  - `GET /api/activity/by_workspace/?workspace_id=123`.
  - `GET /api/activity/by_project/?project_id=123`.
  - `GET /api/activity/by_user/?user_id=123`.
  - `GET /api/activity/by_action/?action=CREATED`.
  - `GET /api/activity/by_date_range/?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`.
  - `GET /api/activity/action_types/` — available action constants.

13) Notifications (`/api/notifications/`) — `NotificationViewSet` ([clickpm/pm/views/notification_views.py](clickpm/pm/views/notification_views.py))
- Methods allowed: `GET`, `PATCH`, `DELETE` (no create/update via API).
- Endpoints:
  - `GET /api/notifications/` — list current user's notifications.
  - `GET /api/notifications/{id}/` — retrieve.
  - `PATCH /api/notifications/{id}/` — partial update (e.g., mark as read).
  - `DELETE /api/notifications/{id}/` — delete.
  - `GET /api/notifications/unread/` — list unread notifications.
  - `POST /api/notifications/mark_all_read/` — mark all read.
  - `POST /api/notifications/{id}/mark_read/` — mark a specific notification read.
  - `GET /api/notifications/count_unread/` — unread count.

14) Dashboard (`/api/dashboard/`) — `DashboardViewSet` ([clickpm/pm/views/dashboard_views.py](clickpm/pm/views/dashboard_views.py))
- Custom endpoints (detail=False):
  - `GET /api/dashboard/overview/` — user dashboard overview.
  - `GET /api/dashboard/my_tasks/` — tasks grouped by status for current user.
  - `GET /api/dashboard/admin_overview/` — admin/CEO system metrics (superuser/staff only).

---

Where to look for more details / serializers / models:
- Serializers: [clickpm/pm/serializers/](clickpm/pm/serializers/)
- Models: [clickpm/pm/models/](clickpm/pm/models/)

If you want, I can:
- generate an OpenAPI spec (YAML/JSON) from the code,
- add example request/response payloads for key endpoints,
- or export this file to HTML.

**HTTP Methods (precise list)**

- API Root
  - GET /api/

- Authentication (public)
  - POST /api/auth/register/
  - POST /api/auth/login/
  - POST /api/auth/refresh/
  - POST /api/auth/password-reset/
  - POST /api/auth/password-reset/confirm/
  - POST /api/auth/change-password/
  - POST /api/auth/logout/

- Users (`UserViewSet`)
  - GET /api/users/
  - POST /api/users/
  - GET /api/users/{id}/
  - PUT /api/users/{id}/
  - PATCH /api/users/{id}/
  - DELETE /api/users/{id}/
  - GET /api/users/me/
  - POST /api/users/{id}/suspend/
  - POST /api/users/{id}/activate/

- Roles (`RoleViewSet`)
  - GET /api/roles/
  - POST /api/roles/
  - GET /api/roles/{id}/
  - PUT /api/roles/{id}/
  - PATCH /api/roles/{id}/
  - DELETE /api/roles/{id}/

- Workspaces (`WorkspaceViewSet`)
  - GET /api/workspaces/
  - POST /api/workspaces/
  - GET /api/workspaces/{id}/
  - PUT /api/workspaces/{id}/
  - PATCH /api/workspaces/{id}/
  - DELETE /api/workspaces/{id}/
  - POST /api/workspaces/{id}/add_member/
  - POST /api/workspaces/{id}/remove_member/
  - GET /api/workspaces/my_workspaces/
  - GET /api/workspaces/{id}/workspace_projects/
  - GET /api/workspaces/{id}/members/
  - POST /api/workspaces/{id}/grant_project_access/
  - POST /api/workspaces/{id}/revoke_project_access/
  - GET /api/workspaces/{id}/member_project_access/
  - GET /api/workspaces/{id}/activity_logs/

- Projects (`ProjectViewSet`)
  - GET /api/projects/
  - POST /api/projects/
  - GET /api/projects/{id}/
  - PUT /api/projects/{id}/
  - PATCH /api/projects/{id}/
  - DELETE /api/projects/{id}/
  - POST /api/projects/{id}/add_member/
  - POST /api/projects/{id}/remove_member/
  - GET /api/projects/my_projects/
  - GET /api/projects/{id}/activity_logs/

- Milestones (`MilestoneViewSet`)
  - GET /api/milestones/
  - POST /api/milestones/
  - GET /api/milestones/{id}/
  - PUT /api/milestones/{id}/
  - PATCH /api/milestones/{id}/
  - DELETE /api/milestones/{id}/
  - GET /api/milestones/{id}/activity_logs/

- Sprints (`SprintViewSet`)
  - GET /api/sprints/
  - POST /api/sprints/
  - GET /api/sprints/{id}/
  - PUT /api/sprints/{id}/
  - PATCH /api/sprints/{id}/
  - DELETE /api/sprints/{id}/
  - GET /api/sprints/{id}/activity_logs/

- Tasks (`TaskViewSet`)
  - GET /api/tasks/
  - POST /api/tasks/
  - GET /api/tasks/{id}/
  - PUT /api/tasks/{id}/
  - PATCH /api/tasks/{id}/
  - DELETE /api/tasks/{id}/
  - POST /api/tasks/{id}/assign_to_me/
  - POST /api/tasks/{id}/change_status/
  - GET /api/tasks/my_tasks/
  - GET /api/tasks/reported_by_me/
  - GET /api/tasks/{id}/activity_logs/

- Task Dependencies (`TaskDependencyViewSet`)
  - GET /api/task-dependencies/
  - POST /api/task-dependencies/
  - GET /api/task-dependencies/{id}/
  - PUT /api/task-dependencies/{id}/
  - PATCH /api/task-dependencies/{id}/
  - DELETE /api/task-dependencies/{id}/

- Comments (`CommentViewSet`)
  - GET /api/comments/
  - POST /api/comments/
  - GET /api/comments/{id}/
  - PUT /api/comments/{id}/
  - PATCH /api/comments/{id}/
  - DELETE /api/comments/{id}/
  - GET /api/comments/my_comments/
  - GET /api/comments/task_comments/?task_id=...
  - GET /api/comments/sprint_comments/?sprint_id=...
  - GET /api/comments/project_comments/?project_id=...

- Attachments (`AttachmentViewSet`)
  - GET /api/attachments/
  - POST /api/attachments/
  - GET /api/attachments/{id}/
  - PUT /api/attachments/{id}/
  - PATCH /api/attachments/{id}/
  - DELETE /api/attachments/{id}/

- Activity / Audit (`ActivityLogViewSet`) — read-only
  - GET /api/activity/
  - GET /api/activity/{id}/
  - GET /api/activity/my_activity/
  - GET /api/activity/recent/
  - GET /api/activity/by_entity/?content_type=...&object_id=...
  - GET /api/activity/by_workspace/?workspace_id=...
  - GET /api/activity/by_project/?project_id=...
  - GET /api/activity/by_user/?user_id=...
  - GET /api/activity/by_action/?action=...
  - GET /api/activity/by_date_range/?start_date=...&end_date=...
  - GET /api/activity/action_types/

- Notifications (`NotificationViewSet`)
  - GET /api/notifications/
  - GET /api/notifications/{id}/
  - PATCH /api/notifications/{id}/
  - DELETE /api/notifications/{id}/
  - GET /api/notifications/unread/
  - POST /api/notifications/mark_all_read/
  - POST /api/notifications/{id}/mark_read/
  - GET /api/notifications/count_unread/

- Dashboard (`DashboardViewSet`)
  - GET /api/dashboard/overview/
  - GET /api/dashboard/my_tasks/
  - GET /api/dashboard/admin_overview/
