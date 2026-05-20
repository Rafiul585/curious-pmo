# API Reference — CuriousPMO

**Base URL:** `http://localhost:8000/api` (development) | `https://<your-domain>/api` (production)  
**Auth:** All endpoints require `Authorization: Bearer <access_token>` unless marked **Public**.  
**Content-Type:** `application/json` (except file uploads which use `multipart/form-data`).  
**Pagination:** List endpoints return `{ "count": N, "next": url|null, "previous": url|null, "results": [...] }`.

---

## Authentication

### POST /api/auth/login/

Obtain a JWT access token and refresh token.

**Auth:** Public

**Request body:**
```json
{ "username": "rafiul", "password": "secret123" }
```

**Response 200:**
```json
{
  "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response 401:**
```json
{ "detail": "No active account found with the given credentials." }
```

---

### POST /api/auth/refresh/

Exchange a refresh token for a new access token (old refresh token is blacklisted).

**Auth:** Public

**Request body:**
```json
{ "refresh": "<refresh_token>" }
```

**Response 200:**
```json
{ "access": "<new_access_token>", "refresh": "<new_refresh_token>" }
```

**Response 401:**
```json
{ "detail": "Token is invalid or expired.", "code": "token_not_valid" }
```

---

### POST /api/auth/register/

Create a new user account.

**Auth:** Public

**Request body:**
```json
{ "username": "jane", "email": "jane@example.com", "password": "SecurePass1!" }
```

**Response 201:**
```json
{ "id": 5, "username": "jane", "email": "jane@example.com" }
```

**Response 400:**
```json
{ "username": ["A user with that username already exists."] }
```

---

### POST /api/auth/password-reset/

Request a password reset (currently sends reset data in the response for dev; email in production).

**Auth:** Public

**Request body:**
```json
{ "email": "jane@example.com" }
```

**Response 200:**
```json
{ "detail": "Password reset instructions sent." }
```

---

## Users

### GET /api/users/me/

Return the authenticated user's profile.

**Response 200:**
```json
{
  "id": 3,
  "username": "rafiul",
  "email": "rafiul@example.com",
  "ical_token": "abc123..."
}
```

---

### PATCH /api/users/me/

Update the authenticated user's profile.

**Request body (partial):**
```json
{ "email": "newemail@example.com" }
```

**Response 200:** Updated user object.

---

### GET /api/users/calendar-token/

Retrieve the user's current iCal token. Returns empty string if not yet generated.

**Response 200:**
```json
{ "ical_token": "abc123...", "ical_url": "http://localhost:8000/api/users/calendar.ics?token=abc123..." }
```

---

### POST /api/users/calendar-token/

Generate (or regenerate) the iCal token. Invalidates any existing token.

**Request body:** `{}` (empty)

**Response 200:**
```json
{ "ical_token": "newtoken...", "ical_url": "http://localhost:8000/api/users/calendar.ics?token=newtoken..." }
```

---

### GET /api/users/calendar.ics?token=\<ical\_token\>

Download the user's iCal feed as an RFC 5545 VCALENDAR file.

**Auth:** Public (token in query param)

**Response 200:** `Content-Type: text/calendar`
```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//CuriousPMO//EN
BEGIN:VEVENT
UID:task-42@curiouspmo
SUMMARY:Write release notes
DTSTART;VALUE=DATE:20260601
DTEND;VALUE=DATE:20260602
DESCRIPTION:Project: Backend API
END:VEVENT
END:VCALENDAR
```

**Response 403:**
```json
{ "detail": "Invalid or missing iCal token." }
```

---

## Workspaces

### GET /api/workspaces/

List all workspaces the authenticated user is a member of.

**Response 200:**
```json
{
  "count": 2,
  "results": [
    { "id": 1, "name": "Acme Corp", "description": "...", "created_by": 3, "created_at": "2026-01-10T09:00:00Z" },
    { "id": 2, "name": "Side Project", "description": "", "created_by": 3, "created_at": "2026-03-01T12:00:00Z" }
  ]
}
```

---

### POST /api/workspaces/

Create a new workspace. Caller becomes the owner.

**Request body:**
```json
{ "name": "Acme Corp", "description": "Our main workspace" }
```

**Response 201:** Created workspace object.

---

### GET /api/workspaces/{id}/

Retrieve a workspace by ID.

**Response 200:** Workspace object.  
**Response 404:** Not found or user is not a member.

---

### PATCH /api/workspaces/{id}/

Update workspace name or description. Requires owner or admin role.

**Request body (partial):**
```json
{ "name": "Acme Corp International" }
```

**Response 200:** Updated workspace object.

---

### DELETE /api/workspaces/{id}/

Delete the workspace. Requires owner role.

**Response 204:** No content.  
**Response 403:** Only the workspace owner can delete a workspace.

---

### GET /api/workspaces/{id}/members/

List all members of a workspace. Guests cannot access this endpoint.

**Response 200:**
```json
{
  "results": [
    { "id": 1, "user": { "id": 3, "username": "rafiul" }, "role": "owner", "is_guest": false },
    { "id": 2, "user": { "id": 5, "username": "jane" }, "role": "member", "is_guest": false },
    { "id": 3, "user": { "id": 7, "username": "ext_contractor" }, "role": "member", "is_guest": true }
  ]
}
```

---

### POST /api/workspaces/{id}/invite/

Invite a user to the workspace.

**Permissions:** Owner or admin.

**Request body:**
```json
{ "username": "jane", "role": "member", "is_guest": false }
```

Or by email:
```json
{ "email": "jane@example.com", "role": "admin", "is_guest": false }
```

**Response 201:** Created `WorkspaceMember` object.  
**Response 400:** User not found or already a member.

---

### GET /api/workspaces/my-memberships/

Return all `WorkspaceMember` records for the authenticated user across all workspaces.

**Response 200:**
```json
[
  { "id": 1, "workspace": 1, "role": "owner", "is_guest": false },
  { "id": 3, "workspace": 2, "role": "member", "is_guest": true }
]
```

---

## Projects

### GET /api/projects/

List projects accessible to the authenticated user. Respects workspace visibility and guest access restrictions.

**Query params:**
- `workspace` (int) — filter by workspace ID
- `health_status` (string) — `on_track / at_risk / behind / critical`
- `status` (string) — `Planning / Active / On Hold / Completed / Cancelled`

**Response 200:**
```json
{
  "results": [
    {
      "id": 10, "name": "Backend API v2", "description": "...",
      "workspace": 1, "status": "Active", "health_status": "on_track",
      "visibility": "public", "start_date": "2026-01-01", "end_date": "2026-06-30",
      "completion_percentage": 42.5
    }
  ]
}
```

---

### POST /api/projects/

Create a project.

**Request body:**
```json
{
  "workspace": 1, "name": "Backend API v2", "description": "...",
  "visibility": "public", "status": "Planning",
  "start_date": "2026-01-01", "end_date": "2026-06-30"
}
```

**Response 201:** Created project object.

---

### GET /api/projects/{id}/

Retrieve a project with full detail.

**Response 200:** Project object including `custom_statuses`, `custom_fields`, `completion_percentage`.

---

### PATCH /api/projects/{id}/

Update a project. Requires project admin, workspace admin, or owner.

**Request body (partial):**
```json
{ "status": "Active", "health_status": "at_risk" }
```

**Response 200:** Updated project object.

---

### DELETE /api/projects/{id}/

Delete a project and all its milestones, sprints, and tasks. Requires workspace owner or admin.

**Response 204:** No content.

---

### GET /api/projects/{id}/export/

Download all tasks in a project as CSV or Excel.

**Query params:**
- `format` — `csv` (default) or `xlsx`
- `status` — optional filter
- `assignee` — optional user ID filter

**Response 200:** File download with `Content-Disposition: attachment; filename="tasks.csv"`.

---

## Custom Statuses

### GET /api/projects/{id}/statuses/

List custom task statuses for a project, ordered by `order`.

**Response 200:**
```json
[
  { "id": 1, "name": "Backlog", "color": "#6B7280", "order": 0, "is_done_state": false },
  { "id": 2, "name": "In Dev", "color": "#3B82F6", "order": 1, "is_done_state": false },
  { "id": 3, "name": "Done", "color": "#10B981", "order": 4, "is_done_state": true }
]
```

---

### POST /api/projects/{id}/statuses/

Create a custom status.

**Request body:**
```json
{ "name": "QA", "color": "#F59E0B", "order": 3, "is_done_state": false }
```

**Response 201:** Created status object.

---

### PATCH /api/project-statuses/{id}/

Update a status (name, color, order, is_done_state).

**Response 200:** Updated object.

---

### DELETE /api/project-statuses/{id}/

Delete a status. Tasks with this status revert to the global default.

**Response 204:** No content.

---

## Milestones

### GET /api/milestones/

List milestones.

**Query params:** `project` (int, required)

**Response 200:**
```json
{
  "results": [
    {
      "id": 5, "project": 10, "name": "Phase 1 — Auth",
      "start_date": "2026-01-01", "end_date": "2026-02-28",
      "status": "Completed", "health_status": "on_track",
      "completion_percentage": 100.0
    }
  ]
}
```

---

### POST /api/milestones/

**Request body:**
```json
{ "project": 10, "name": "Phase 2 — Core Features", "start_date": "2026-03-01", "end_date": "2026-05-31" }
```

**Response 201:** Created milestone object.

---

### PATCH /api/milestones/{id}/

Update milestone fields.

**Response 200:** Updated object.

---

### DELETE /api/milestones/{id}/

**Response 204:** No content.

---

## Sprints

### GET /api/sprints/

List sprints.

**Query params:** `milestone` (int)

**Response 200:** Sprint list.

---

### POST /api/sprints/

**Request body:**
```json
{ "milestone": 5, "name": "Sprint 1", "start_date": "2026-03-01", "end_date": "2026-03-14" }
```

**Response 201:** Created sprint.

---

### PATCH /api/sprints/{id}/

**Response 200:** Updated sprint.

---

### DELETE /api/sprints/{id}/

**Response 204:** No content.

---

### GET /api/sprints/{id}/burndown/

Return burndown chart data for a sprint.

**Response 200:**
```json
{
  "sprint_start": "2026-03-01",
  "sprint_end": "2026-03-14",
  "total_tasks": 12,
  "ideal": [12, 11.1, 10.2, 9.3, 8.4, 7.5, 6.6, 5.7, 4.8, 3.9, 3.0, 2.1, 1.1, 0],
  "actual": [12, 12, 11, 11, 10, 9, 8, 7, 7, 6, 5, 4, 3, 2],
  "labels": ["Mar 1", "Mar 2", "Mar 3", "Mar 4", "Mar 5", "Mar 6", "Mar 7",
              "Mar 8", "Mar 9", "Mar 10", "Mar 11", "Mar 12", "Mar 13", "Mar 14"]
}
```

---

## Tasks

### GET /api/tasks/

List tasks.

**Query params:**
- `project` (int)
- `sprint` (int)
- `status` (string)
- `priority` (string) — `Low / Medium / High / Critical`
- `assignee` (int) — user ID
- `parent` (int) — returns subtasks of the given task ID
- `tag` (int) — filter by tag ID

**Response 200:**
```json
{
  "results": [
    {
      "id": 101, "title": "Implement JWT auth", "status": "Done",
      "priority": "High", "sprint": 3,
      "assignees": [{ "id": 3, "username": "rafiul" }],
      "due_date": "2026-02-15", "estimated_hours": "8.00", "actual_hours": "6.50",
      "is_blocked": false, "tags": [{ "id": 2, "name": "backend", "color": "#3B82F6" }],
      "subtask_count": 3, "subtasks_done": 3,
      "health_status": "on_track"
    }
  ]
}
```

---

### POST /api/tasks/

Create a task.

**Request body:**
```json
{
  "sprint": 3, "title": "Write API tests", "description": "Cover all ViewSets",
  "status": "To Do", "priority": "Medium",
  "assignees": [3], "due_date": "2026-03-10", "estimated_hours": "4.00"
}
```

**Response 201:** Created task object.

---

### GET /api/tasks/{id}/

Retrieve full task detail including nested checklists, subtasks, comments, attachments, git links, and custom field values.

**Response 200:** Full task object.

---

### PATCH /api/tasks/{id}/

Partial update.

**Request body (partial):**
```json
{ "status": "In Progress", "priority": "High" }
```

**Response 200:** Updated task object.

---

### DELETE /api/tasks/{id}/

Delete a task (and all its subtasks).

**Response 204:** No content.

---

### POST /api/tasks/bulk\_update/

Update status for multiple tasks at once.

**Request body:**
```json
{ "task_ids": [101, 102, 103], "status": "Done" }
```

**Response 200:**
```json
{ "updated": 3 }
```

---

### POST /api/tasks/reorder/

Reorder tasks within a Kanban column.

**Request body:**
```json
{ "task_ids": [103, 101, 102] }
```

**Response 200:**
```json
{ "reordered": 3 }
```

---

### POST /api/tasks/from-template/

Create a task from a template.

**Request body:**
```json
{ "template_id": 2, "title": "Onboard Jane Smith", "sprint": 5 }
```

**Response 201:** Created task (with checklist items pre-populated from template).

---

### POST /api/tasks/{id}/watch/

Watch a task (receive notifications for any change).

**Response 200:**
```json
{ "watching": true }
```

---

### DELETE /api/tasks/{id}/unwatch/

**Response 200:**
```json
{ "watching": false }
```

---

### POST /api/tasks/{id}/add\_tag/

**Request body:**
```json
{ "tag_id": 5 }
```

**Response 200:** Updated task tags list.

---

### DELETE /api/tasks/{id}/remove\_tag/

**Request body:**
```json
{ "tag_id": 5 }
```

**Response 200:** Updated task tags list.

---

## Time Logs

### GET /api/tasks/{id}/time-logs/

List all time logs for a task.

**Response 200:**
```json
[
  { "id": 8, "user": { "id": 3, "username": "rafiul" }, "hours": "2.50", "date": "2026-03-05", "note": "Fixed auth bug" }
]
```

---

### POST /api/time-logs/

Log time against a task.

**Request body:**
```json
{ "task": 101, "hours": "2.50", "date": "2026-03-05", "note": "Fixed auth bug" }
```

**Response 201:** Created time log.

---

## Comments

### GET /api/comments/

List comments for a target object.

**Query params:** `task` (int) or `project` (int) or `sprint` (int)

**Response 200:**
```json
{
  "results": [
    { "id": 20, "author": { "id": 3, "username": "rafiul" }, "content": "Looks good @jane", "created_at": "2026-03-06T10:30:00Z" }
  ]
}
```

---

### POST /api/comments/

Post a comment. Triggers @mention notifications.

**Request body:**
```json
{ "content": "Great work @jane!", "task": 101 }
```

**Response 201:** Created comment.

---

### PATCH /api/comments/{id}/

Edit a comment. Author only.

**Request body:**
```json
{ "content": "Updated text" }
```

**Response 200:** Updated comment.

---

### DELETE /api/comments/{id}/

**Response 204:** No content.

---

## Attachments

### GET /api/attachments/

**Query params:** `task` (int)

**Response 200:** List of attachment objects `{ id, file_url, file_name, uploaded_by, uploaded_at }`.

---

### POST /api/attachments/

Upload a file.

**Content-Type:** `multipart/form-data`  
**Fields:** `task` (int), `file` (binary)

**Response 201:**
```json
{ "id": 5, "file_url": "/media/attachments/doc.pdf", "file_name": "doc.pdf", "uploaded_by": 3 }
```

---

### DELETE /api/attachments/{id}/

**Response 204:** No content.

---

## Checklists

### GET /api/checklists/

**Query params:** `task` (int)

**Response 200:**
```json
[
  {
    "id": 1, "title": "Acceptance Criteria", "order": 0,
    "items": [
      { "id": 1, "text": "Unit tests pass", "is_checked": true, "order": 0 },
      { "id": 2, "text": "Code reviewed", "is_checked": false, "order": 1 }
    ]
  }
]
```

---

### POST /api/checklists/

**Request body:**
```json
{ "task": 101, "title": "Acceptance Criteria", "order": 0 }
```

**Response 201:** Created checklist.

---

### POST /api/checklist-items/

**Request body:**
```json
{ "checklist": 1, "text": "Deploy to staging", "order": 2 }
```

**Response 201:** Created checklist item.

---

### PATCH /api/checklist-items/{id}/

Toggle or edit an item.

**Request body:**
```json
{ "is_checked": true }
```

**Response 200:** Updated item.

---

### DELETE /api/checklist-items/{id}/

**Response 204:** No content.

---

## Tags

### GET /api/tags/

**Query params:** `workspace` (int)

**Response 200:**
```json
[
  { "id": 1, "name": "bug", "color": "#EF4444", "workspace": 1 },
  { "id": 2, "name": "backend", "color": "#3B82F6", "workspace": 1 }
]
```

---

### POST /api/tags/

**Request body:**
```json
{ "workspace": 1, "name": "frontend", "color": "#8B5CF6" }
```

**Response 201:** Created tag.

---

### PATCH /api/tags/{id}/

**Response 200:** Updated tag.

---

### DELETE /api/tags/{id}/

**Response 204:** No content.

---

## Custom Fields

### GET /api/projects/{id}/custom-fields/

List custom field definitions for a project.

**Response 200:**
```json
[
  { "id": 1, "name": "Affected Version", "field_type": "text", "options": [], "required": false, "order": 0 },
  { "id": 2, "name": "Browser", "field_type": "dropdown", "options": ["Chrome","Firefox","Safari"], "required": false, "order": 1 }
]
```

---

### POST /api/projects/{id}/custom-fields/

**Request body:**
```json
{ "name": "Deal Value", "field_type": "number", "required": false, "order": 0 }
```

**Response 201:** Created definition.

---

### PATCH /api/tasks/{id}/custom-field-values/

Set custom field values for a task. The body is a map of `definition_id → value`.

**Request body:**
```json
{ "1": "v2.1.0", "2": "Chrome" }
```

**Response 200:**
```json
[
  { "field": 1, "value": "v2.1.0" },
  { "field": 2, "value": "Chrome" }
]
```

---

## Automation Rules

### GET /api/automations/

**Query params:** `project` (int)

**Response 200:**
```json
[
  {
    "id": 3, "name": "Notify on Done", "is_active": true,
    "trigger": "status_change", "conditions": { "to_status": "Done" },
    "action": "send_notification", "action_params": { "recipient": "owner" }
  }
]
```

---

### POST /api/automations/

**Request body:**
```json
{
  "project": 10, "name": "Escalate overdue", "trigger": "due_date_passed",
  "conditions": {}, "action": "change_priority",
  "action_params": { "priority": "Critical" }, "is_active": true
}
```

**Response 201:** Created rule.

---

### PATCH /api/automations/{id}/

**Response 200:** Updated rule.

---

### DELETE /api/automations/{id}/

**Response 204:** No content.

---

## Goals & Targets

### GET /api/goals/

**Query params:** `workspace` (int)

**Response 200:**
```json
[
  {
    "id": 1, "name": "Launch v1", "description": "...", "progress": 60.0, "due_date": "2026-06-30",
    "targets": [
      { "id": 1, "name": "Backend complete", "target_type": "task_completion", "current": 80.0, "target": 100.0, "linked_project": 10 }
    ]
  }
]
```

---

### POST /api/goals/

**Request body:**
```json
{ "workspace": 1, "name": "Launch v1", "due_date": "2026-06-30" }
```

**Response 201:** Created goal.

---

### POST /api/goal-targets/

**Request body:**
```json
{ "goal": 1, "name": "Backend complete", "target_type": "task_completion", "target": 100.0, "linked_project": 10 }
```

**Response 201:** Created target.

---

### PATCH /api/goal-targets/{id}/

**Response 200:** Updated target.

---

### DELETE /api/goal-targets/{id}/

**Response 204:** No content.

---

## Task Templates

### GET /api/task-templates/

**Query params:** `workspace` (int)

**Response 200:**
```json
[
  {
    "id": 2, "name": "Bug Report", "default_priority": "High",
    "checklist_items": [{"text": "Reproduce locally", "is_checked": false}, {"text": "Write test", "is_checked": false}]
  }
]
```

---

### POST /api/task-templates/

**Request body:**
```json
{
  "workspace": 1, "name": "Bug Report", "description": "...",
  "default_priority": "High",
  "checklist_items": [{"text": "Reproduce locally"}, {"text": "Write test"}]
}
```

**Response 201:** Created template.

---

### PATCH /api/task-templates/{id}/

**Response 200:** Updated template.

---

### DELETE /api/task-templates/{id}/

**Response 204:** No content.

---

## Git Integrations

### GET /api/git-integrations/

**Query params:** `workspace` (int)

**Response 200:**
```json
[
  { "id": 1, "provider": "github", "repo_url": "https://github.com/org/repo", "webhook_url": "https://yourapp.com/api/webhooks/github/" }
]
```

---

### POST /api/git-integrations/

**Request body:**
```json
{ "workspace": 1, "provider": "github", "repo_url": "https://github.com/org/repo" }
```

**Response 201:** Created integration including `webhook_secret`.

---

### DELETE /api/git-integrations/{id}/

**Response 204:** No content.

---

### POST /api/webhooks/github/

Receive GitHub push or pull_request webhook events.

**Auth:** Public (validated via `X-Hub-Signature-256` HMAC header)

**Headers:**
```
X-Hub-Signature-256: sha256=<hmac>
X-GitHub-Event: push | pull_request
```

**Response 200:**
```json
{ "linked": 1, "tasks": [42] }
```

**Response 403:** Invalid HMAC signature.

---

## Docs

### GET /api/docs/

**Query params:** `project` (int)

**Response 200:**
```json
[
  { "id": 7, "title": "Architecture Overview", "created_by": 3, "created_at": "2026-04-01T10:00:00Z", "updated_at": "2026-04-10T14:00:00Z" }
]
```

---

### POST /api/docs/

**Request body:**
```json
{ "project": 10, "title": "Architecture Overview", "content": "## Overview\n\nThis doc..." }
```

**Response 201:** Created doc (full content included).

---

### GET /api/docs/{id}/

**Response 200:** Full doc object with content.

---

### PATCH /api/docs/{id}/

**Request body (partial):**
```json
{ "content": "## Updated content..." }
```

**Response 200:** Updated doc.

---

### DELETE /api/docs/{id}/

**Response 204:** No content.

---

## Import

### POST /api/import/csv/

Import tasks from a CSV file.

**Auth:** Project admin, workspace admin, or owner.

**Content-Type:** `multipart/form-data`

**Fields:**
- `file` (binary) — CSV file
- `project_id` (int) — target project
- `sprint_id` (int) — target sprint for all imported tasks
- `column_mapping` (JSON string) — maps CSV column headers to task fields

**Example `column_mapping`:**
```json
{ "Task Name": "title", "Description": "description", "Owner Email": "assignee_email", "Due": "due_date" }
```

**Response 200:**
```json
{ "imported": 43, "skipped": 2, "errors": ["Row 7: invalid date format '32-13-2026'"] }
```

**Response 400:** Invalid file format or missing required mapping.

---

## Notifications

### GET /api/notifications/

List all notifications for the authenticated user, most recent first.

**Query params:**
- `is_read` (bool) — `false` to show only unread

**Response 200:**
```json
{
  "results": [
    {
      "id": 55, "notification_type": "assignment", "message": "You were assigned to 'Fix login bug'",
      "is_read": false, "created_at": "2026-05-20T08:00:00Z",
      "task": 101, "project": 10
    }
  ]
}
```

---

### POST /api/notifications/{id}/mark\_read/

Mark a single notification as read.

**Response 200:**
```json
{ "id": 55, "is_read": true }
```

---

### POST /api/notifications/mark\_all\_read/

Mark all unread notifications as read.

**Response 200:**
```json
{ "updated": 12 }
```

---

## Activity Log

### GET /api/activity/

**Query params:**
- `project` (int)
- `limit` (int, default 50)

**Response 200:**
```json
{
  "results": [
    {
      "id": 200, "user": { "id": 3, "username": "rafiul" },
      "action": "TASK_STATUS_CHANGED",
      "old_value": { "status": "In Progress" },
      "new_value": { "status": "Done" },
      "created_at": "2026-05-20T09:15:00Z"
    }
  ]
}
```

---

## Dashboard

### GET /api/dashboard/

Return aggregated data for the authenticated user's dashboard.

**Response 200:**
```json
{
  "my_tasks": [...],
  "upcoming_deadlines": [...],
  "active_sprints": [...],
  "project_health": [...],
  "completion_trend": { "labels": ["Week 1", ...], "values": [5, 8, 12, ...] },
  "time_tracking_summary": [{ "project_id": 10, "project_name": "...", "estimated": 120, "logged": 85 }]
}
```

---

### GET /api/dashboard/team\_workload/

Return per-member task summary for the authenticated user's workspaces.

**Response 200:**
```json
[
  { "user_id": 3, "username": "rafiul", "total": 12, "in_progress": 4, "overdue": 1, "completion_rate": 75.0 }
]
```

---

### GET /api/dashboard/velocity/

**Query params:** `project` (int), `last_n_sprints` (int, default 6)

**Response 200:**
```json
{
  "sprints": [
    { "sprint_name": "Sprint 1", "planned": 10, "completed": 8, "completion_rate": 80.0 },
    { "sprint_name": "Sprint 2", "planned": 12, "completed": 12, "completion_rate": 100.0 }
  ]
}
```

---

### GET /api/dashboard/cumulative\_flow/

**Query params:** `project` (int), `days` (int, default 60)

**Response 200:**
```json
{
  "labels": ["2026-03-21", "2026-03-22", ...],
  "series": [
    { "label": "To Do", "data": [5, 5, 4, ...] },
    { "label": "In Progress", "data": [3, 4, 4, ...] },
    { "label": "Done", "data": [2, 2, 3, ...] }
  ]
}
```

---

### GET /api/dashboard/cycle\_time/

**Query params:** `project` (int)

**Response 200:**
```json
{
  "average_days": 4.2,
  "histogram": [
    { "bucket": "1 day", "count": 5 },
    { "bucket": "2-3 days", "count": 12 },
    { "bucket": "4-7 days", "count": 8 },
    { "bucket": "8+ days", "count": 3 }
  ]
}
```

---

## Search

### GET /api/search/

Search tasks, projects, and users.

**Query params:** `q` (string, min 2 characters)

**Response 200:**
```json
{
  "tasks": [{ "id": 101, "title": "Implement JWT auth", "project": "Backend API v2" }],
  "projects": [{ "id": 10, "name": "Backend API v2", "workspace": "Acme Corp" }],
  "users": [{ "id": 3, "username": "rafiul", "email": "rafiul@example.com" }]
}
```

---

*CuriousPMO API Reference — v1.0 — 2026-05-20*
