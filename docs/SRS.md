# Software Requirements Specification — CuriousPMO

**Version:** 1.0  
**Date:** 2026-05-20  
**Status:** Approved  

---

## 1. Introduction

### 1.1 Purpose

This document describes the software requirements for CuriousPMO, a web-based project management platform. It is intended for developers joining the project, QA engineers writing test plans, and technical leads reviewing the system design. It complements the Business Requirements Document (`docs/BRD.md`) with precise technical detail.

### 1.2 Scope

CuriousPMO covers workspace and project management, agile sprint planning, task tracking, collaboration, reporting, calendar sync, git integration, and document management. The system consists of a Django REST API backend and a React + TypeScript frontend served as a SPA.

### 1.3 Definitions & Abbreviations

| Term | Meaning |
|------|---------|
| JWT | JSON Web Token — stateless bearer token for authentication |
| RTK | Redux Toolkit — state management library used in the frontend |
| RTK Query | Data fetching layer built on top of Redux Toolkit |
| OKR | Objectives and Key Results |
| SPA | Single-Page Application |
| RBAC | Role-Based Access Control |
| iCal | RFC 5545 iCalendar format |
| HMAC | Hash-based Message Authentication Code |
| WO | Work Order |

---

## 2. System Overview

### 2.1 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (React SPA)                                             │
│  ├── Redux Toolkit (auth / UI state)                             │
│  ├── RTK Query (server state, caching)                           │
│  ├── React Router v6 (client-side routing)                       │
│  └── MUI v5 + Tailwind CSS (UI)                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS / REST + WebSocket (Socket.io)
┌──────────────────────────▼──────────────────────────────────────┐
│  Django 4.2 + DRF 3.14                                           │
│  ├── pm/ (application logic)                                     │
│  │   ├── models/    (data layer)                                 │
│  │   ├── serializers/ (validation + transform)                   │
│  │   ├── views/     (ViewSets + custom actions)                  │
│  │   ├── services/  (business logic)                             │
│  │   ├── utils/     (permission helpers, validators)             │
│  │   └── signals.py (post-save triggers)                         │
│  └── config/ (settings, URLs, WSGI/ASGI)                        │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│  PostgreSQL 15                                                    │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend language | Python 3.12 |
| Backend framework | Django 4.2, Django REST Framework 3.14 |
| Authentication | SimpleJWT (60-min access token, 24-hr rotating refresh) |
| Database (production) | PostgreSQL 15 |
| Database (development) | SQLite (set `USE_SQLITE=True` in `.env`) |
| Real-time | Socket.io via django-socketio |
| Frontend language | TypeScript |
| Frontend framework | React 18, Vite 5 |
| UI library | MUI v5, Tailwind CSS |
| Client state | Redux Toolkit |
| Server state | TanStack Query v5 (RTK Query) |
| Forms | React Hook Form + Zod |
| Charts | Chart.js 4 + react-chartjs-2 |
| Markdown editor | @uiw/react-md-editor |
| Container | Docker Compose |

---

## 3. Data Models

### 3.1 User

Extends Django's `AbstractUser`.

| Field | Type | Notes |
|-------|------|-------|
| id | AutoField | Primary key |
| username | CharField(150) | Unique login name |
| email | EmailField | Unique; used for assignee matching in CSV import |
| password | CharField | PBKDF2-SHA256 hashed |
| ical_token | CharField(64) | Long-lived read-only token for iCal feed; blank until generated |
| avatar | ImageField | Optional profile photo |

### 3.2 Workspace

| Field | Type | Notes |
|-------|------|-------|
| id | AutoField | |
| name | CharField(200) | |
| description | TextField | Optional |
| created_by | FK → User | Workspace owner |
| created_at | DateTimeField | auto |

### 3.3 WorkspaceMember

Junction table linking users to workspaces.

| Field | Type | Notes |
|-------|------|-------|
| id | AutoField | |
| workspace | FK → Workspace | CASCADE |
| user | FK → User | CASCADE |
| role | CharField | `owner` / `admin` / `member` |
| is_guest | BooleanField | Default False; guests see only explicitly granted projects |

`unique_together = ('workspace', 'user')`

### 3.4 Project

| Field | Type | Notes |
|-------|------|-------|
| id | AutoField | |
| workspace | FK → Workspace | CASCADE |
| name | CharField(200) | |
| description | TextField | |
| status | CharField | `Planning / Active / On Hold / Completed / Cancelled` |
| health_status | CharField | `on_track / at_risk / behind / critical` |
| visibility | CharField | `public / private` |
| start_date | DateField | Nullable |
| end_date | DateField | Nullable |
| created_by | FK → User | |

### 3.5 WorkspaceProjectAccess

Controls which guests can see which projects.

| Field | Type | Notes |
|-------|------|-------|
| workspace_member | FK → WorkspaceMember | CASCADE |
| project | FK → Project | CASCADE |

### 3.6 ProjectMember

| Field | Type | Notes |
|-------|------|-------|
| project | FK → Project | CASCADE |
| user | FK → User | CASCADE |
| role | CharField | `admin / member` |

### 3.7 Milestone

| Field | Type | Notes |
|-------|------|-------|
| id | AutoField | |
| project | FK → Project | CASCADE |
| name | CharField(200) | |
| description | TextField | |
| start_date | DateField | Nullable |
| end_date | DateField | Nullable |
| status | CharField | `Not Started / In Progress / Completed` |
| health_status | CharField | `on_track / at_risk / behind / critical` |
| completion_percentage | FloatField | Cached, auto-calculated |

### 3.8 Sprint

| Field | Type | Notes |
|-------|------|-------|
| id | AutoField | |
| milestone | FK → Milestone | CASCADE |
| name | CharField(200) | |
| start_date | DateField | Nullable |
| end_date | DateField | Nullable |
| status | CharField | `Not Started / In Progress / Completed` |
| health_status | CharField | `on_track / at_risk / behind / critical` |
| completion_percentage | FloatField | Cached |

### 3.9 Task

| Field | Type | Notes |
|-------|------|-------|
| id | AutoField | |
| sprint | FK → Sprint | CASCADE |
| parent | FK → self | Nullable; for subtasks |
| title | CharField(500) | |
| description | TextField | Markdown |
| status | CharField | Default statuses or custom project status name |
| priority | CharField | `Low / Medium / High / Critical` |
| assignees | M2M → User | |
| watchers | M2M → User | |
| due_date | DateField | Nullable |
| estimated_hours | DecimalField(6,2) | Nullable |
| actual_hours | DecimalField(6,2) | Default 0 |
| tags | M2M → Tag | |
| position | PositiveIntegerField | Column order in Kanban |
| recurrence | CharField | `daily / weekly / biweekly / monthly` — nullable |
| recurrence_end | DateField | Nullable |
| recurrence_parent | FK → self | Nullable; links recurring instances |
| is_blocked | Computed | True if any blocked_by dependency is not Done |

### 3.10 TaskDependency

| Field | Type | Notes |
|-------|------|-------|
| task | FK → Task | The dependent task |
| depends_on | FK → Task | The prerequisite task |
| dependency_type | CharField | `blocks / blocked_by` |

### 3.11 Tag

| Field | Type | Notes |
|-------|------|-------|
| workspace | FK → Workspace | CASCADE |
| name | CharField(50) | `unique_together = (workspace, name)` |
| color | CharField(7) | Hex color |

### 3.12 Comment

Generic relation — can attach to Task, Sprint, or Project.

| Field | Type | Notes |
|-------|------|-------|
| author | FK → User | |
| content | TextField | Supports @mention syntax |
| content_type | FK → ContentType | Generic FK target type |
| object_id | PositiveIntegerField | Generic FK target ID |
| created_at | DateTimeField | auto |

### 3.13 Attachment

| Field | Type | Notes |
|-------|------|-------|
| task | FK → Task | CASCADE |
| file | FileField | Uploaded to local filesystem |
| uploaded_by | FK → User | |
| uploaded_at | DateTimeField | auto |

### 3.14 TimeLog

| Field | Type | Notes |
|-------|------|-------|
| task | FK → Task | CASCADE |
| user | FK → User | CASCADE |
| hours | DecimalField(5,2) | |
| date | DateField | |
| note | CharField(500) | Optional |

### 3.15 Notification

| Field | Type | Notes |
|-------|------|-------|
| recipient | FK → User | |
| notification_type | CharField | `assignment / mention / deadline / status_change / health_degradation` |
| message | TextField | |
| is_read | BooleanField | Default False |
| created_at | DateTimeField | auto |
| task | FK → Task | Nullable; related task |
| project | FK → Project | Nullable; related project |

### 3.16 ActivityLog

Immutable audit trail.

| Field | Type | Notes |
|-------|------|-------|
| user | FK → User | Actor |
| action | CharField | e.g. `TASK_CREATED`, `TASK_STATUS_CHANGED` |
| old_value | JSONField | State before the mutation |
| new_value | JSONField | State after the mutation |
| extra_info | JSONField | Workspace/project context |
| created_at | DateTimeField | auto |
| content_type | FK → ContentType | Target model type |
| object_id | PositiveIntegerField | Target model ID |

### 3.17 ProjectStatus (Custom)

| Field | Type | Notes |
|-------|------|-------|
| project | FK → Project | CASCADE |
| name | CharField(100) | |
| color | CharField(7) | Hex |
| order | PositiveIntegerField | |
| is_done_state | BooleanField | Triggers auto-completion if True |

### 3.18 CustomFieldDefinition

| Field | Type | Notes |
|-------|------|-------|
| project | FK → Project | CASCADE |
| name | CharField(100) | |
| field_type | CharField | `text / number / date / dropdown / checkbox / url` |
| options | JSONField | Choices for dropdown type |
| required | BooleanField | |
| order | PositiveIntegerField | |

### 3.19 TaskCustomFieldValue

| Field | Type | Notes |
|-------|------|-------|
| task | FK → Task | CASCADE |
| field | FK → CustomFieldDefinition | CASCADE |
| value | JSONField | Nullable |

### 3.20 Checklist / ChecklistItem

```
Checklist: task (FK), title, order
ChecklistItem: checklist (FK), text, is_checked, order
```

### 3.21 AutomationRule

| Field | Type | Notes |
|-------|------|-------|
| project | FK → Project | CASCADE |
| name | CharField(200) | |
| trigger | CharField | `status_change / task_created / assignee_changed / due_date_passed` |
| conditions | JSONField | e.g. `{"from_status": "In Progress"}` |
| action | CharField | `send_notification / change_status / change_priority / assign_to` |
| action_params | JSONField | e.g. `{"status": "Done"}` |
| is_active | BooleanField | |

### 3.22 Goal / GoalTarget

```
Goal: workspace (FK), name, description, owner (FK User), due_date, progress (0–100)
GoalTarget: goal (FK), name, target_type (task_completion/number/currency),
            current, target, linked_project (FK nullable)
```

### 3.23 TaskTemplate

```
TaskTemplate: workspace (FK), name, description, default_priority,
              default_tags (M2M Tag), checklist_items (JSONField),
              custom_field_defaults (JSONField), created_by (FK User)
```

### 3.24 GitIntegration / TaskGitLink

```
GitIntegration: workspace (FK), provider (github/gitlab), repo_url, webhook_secret
TaskGitLink: task (FK), pr_url, commit_sha, status (open/merged/closed)
```

### 3.25 Doc

```
Doc: project (FK), title, content (Markdown TextField), created_by (FK User),
     created_at, updated_at
```

---

## 4. API Specification

Authentication is required for all endpoints unless noted. Include `Authorization: Bearer <access_token>` in every request.

### 4.1 Auth

| Method | URL | Description |
|--------|-----|-------------|
| POST | `/api/auth/login/` | Obtain access + refresh tokens |
| POST | `/api/auth/refresh/` | Refresh an expired access token |
| POST | `/api/auth/register/` | Create a new user account |
| POST | `/api/auth/password-reset/` | Request password reset |

### 4.2 Users

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/users/me/` | Current user profile |
| PATCH | `/api/users/me/` | Update profile |
| GET | `/api/users/calendar-token/` | Retrieve iCal token |
| POST | `/api/users/calendar-token/` | Generate / regenerate iCal token |
| GET | `/api/users/calendar.ics?token=…` | Download iCal feed (no JWT required) |

### 4.3 Workspaces

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/workspaces/` | List workspaces the user belongs to |
| POST | `/api/workspaces/` | Create a workspace |
| GET | `/api/workspaces/{id}/` | Retrieve workspace detail |
| PATCH | `/api/workspaces/{id}/` | Update name / description |
| DELETE | `/api/workspaces/{id}/` | Delete workspace (owner only) |
| GET | `/api/workspaces/{id}/members/` | List members |
| POST | `/api/workspaces/{id}/invite/` | Invite a member by username or email |
| DELETE | `/api/workspaces/{id}/members/{user_id}/` | Remove a member |
| GET | `/api/workspaces/my-memberships/` | Current user's membership records (includes `is_guest`) |

### 4.4 Projects

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/projects/` | List projects (respects visibility and guest access) |
| POST | `/api/projects/` | Create a project |
| GET | `/api/projects/{id}/` | Retrieve project detail |
| PATCH | `/api/projects/{id}/` | Update project |
| DELETE | `/api/projects/{id}/` | Delete project |
| GET | `/api/projects/{id}/export/` | Download tasks as CSV or Excel |
| GET | `/api/projects/{id}/members/` | List project members |
| POST | `/api/projects/{id}/add_member/` | Add a project member |

### 4.5 Custom Statuses

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/projects/{id}/statuses/` | List custom statuses for a project |
| POST | `/api/projects/{id}/statuses/` | Create a custom status |
| PATCH | `/api/project-statuses/{id}/` | Update a status |
| DELETE | `/api/project-statuses/{id}/` | Delete a status |

### 4.6 Milestones

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/milestones/?project={id}` | List milestones for a project |
| POST | `/api/milestones/` | Create a milestone |
| PATCH | `/api/milestones/{id}/` | Update |
| DELETE | `/api/milestones/{id}/` | Delete |

### 4.7 Sprints

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/sprints/?milestone={id}` | List sprints |
| POST | `/api/sprints/` | Create a sprint |
| PATCH | `/api/sprints/{id}/` | Update |
| DELETE | `/api/sprints/{id}/` | Delete |
| GET | `/api/sprints/{id}/burndown/` | Burndown chart data |

### 4.8 Tasks

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/tasks/` | List tasks (supports `project`, `sprint`, `status`, `assignee`, `parent` filters) |
| POST | `/api/tasks/` | Create a task |
| GET | `/api/tasks/{id}/` | Retrieve task with nested data |
| PATCH | `/api/tasks/{id}/` | Update |
| DELETE | `/api/tasks/{id}/` | Delete |
| POST | `/api/tasks/bulk_update/` | `{task_ids, status}` — bulk status update |
| POST | `/api/tasks/reorder/` | `{task_ids}` — reorder within a Kanban column |
| POST | `/api/tasks/from-template/` | Create from a task template |
| GET | `/api/tasks/export/?project={id}&format=csv` | Export tasks |
| POST | `/api/tasks/{id}/watch/` | Watch a task |
| DELETE | `/api/tasks/{id}/unwatch/` | Unwatch |
| POST | `/api/tasks/{id}/add_tag/` | `{tag_id}` |
| DELETE | `/api/tasks/{id}/remove_tag/` | `{tag_id}` |

### 4.9 Time Logs

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/tasks/{id}/time-logs/` | List time logs for a task |
| POST | `/api/time-logs/` | Log time `{task, hours, date, note}` |

### 4.10 Comments

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/comments/?task={id}` | List comments for a task |
| POST | `/api/comments/` | Create a comment |
| PATCH | `/api/comments/{id}/` | Edit a comment (author only) |
| DELETE | `/api/comments/{id}/` | Delete |

### 4.11 Attachments

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/attachments/?task={id}` | List attachments |
| POST | `/api/attachments/` | Upload a file (multipart/form-data) |
| DELETE | `/api/attachments/{id}/` | Delete |

### 4.12 Checklists

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/checklists/?task={id}` | List checklists |
| POST | `/api/checklists/` | Create a checklist |
| DELETE | `/api/checklists/{id}/` | Delete |
| POST | `/api/checklist-items/` | Add an item |
| PATCH | `/api/checklist-items/{id}/` | Toggle `is_checked` |
| DELETE | `/api/checklist-items/{id}/` | Delete |

### 4.13 Tags

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/tags/?workspace={id}` | List tags |
| POST | `/api/tags/` | Create a tag |
| PATCH | `/api/tags/{id}/` | Update |
| DELETE | `/api/tags/{id}/` | Delete |

### 4.14 Custom Fields

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/projects/{id}/custom-fields/` | List definitions |
| POST | `/api/projects/{id}/custom-fields/` | Create definition |
| PATCH | `/api/custom-field-definitions/{id}/` | Update |
| DELETE | `/api/custom-field-definitions/{id}/` | Delete |
| PATCH | `/api/tasks/{id}/custom-field-values/` | Set values `{field_id: value}` |

### 4.15 Automation Rules

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/automations/?project={id}` | List rules |
| POST | `/api/automations/` | Create rule |
| PATCH | `/api/automations/{id}/` | Update |
| DELETE | `/api/automations/{id}/` | Delete |

### 4.16 Goals

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/goals/?workspace={id}` | List goals |
| POST | `/api/goals/` | Create |
| PATCH | `/api/goals/{id}/` | Update |
| DELETE | `/api/goals/{id}/` | Delete |
| POST | `/api/goal-targets/` | Add a target to a goal |
| PATCH | `/api/goal-targets/{id}/` | Update |
| DELETE | `/api/goal-targets/{id}/` | Delete |

### 4.17 Task Templates

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/task-templates/?workspace={id}` | List templates |
| POST | `/api/task-templates/` | Create |
| PATCH | `/api/task-templates/{id}/` | Update |
| DELETE | `/api/task-templates/{id}/` | Delete |

### 4.18 Git Integrations

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/git-integrations/?workspace={id}` | List |
| POST | `/api/git-integrations/` | Create |
| DELETE | `/api/git-integrations/{id}/` | Delete |
| POST | `/api/webhooks/github/` | Receive GitHub webhook (no JWT) |

### 4.19 Docs

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/docs/?project={id}` | List docs |
| POST | `/api/docs/` | Create a doc |
| GET | `/api/docs/{id}/` | Retrieve |
| PATCH | `/api/docs/{id}/` | Update content or title |
| DELETE | `/api/docs/{id}/` | Delete |

### 4.20 Import

| Method | URL | Description |
|--------|-----|-------------|
| POST | `/api/import/csv/` | `multipart/form-data`: `file`, `project_id`, `sprint_id`, `column_mapping` (JSON) |

### 4.21 Notifications

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/notifications/` | List notifications for current user |
| POST | `/api/notifications/{id}/mark_read/` | Mark one as read |
| POST | `/api/notifications/mark_all_read/` | Mark all as read |

### 4.22 Activity Log

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/activity/?project={id}` | List activity for a project |

### 4.23 Dashboard

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/dashboard/` | Aggregated dashboard data |
| GET | `/api/dashboard/team_workload/` | Per-member workload summary |
| GET | `/api/dashboard/velocity/?project={id}&last_n_sprints=6` | Sprint velocity data |
| GET | `/api/dashboard/cumulative_flow/?project={id}` | Cumulative flow data |
| GET | `/api/dashboard/cycle_time/?project={id}` | Cycle time data |

### 4.24 Search

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/search/?q={query}` | Search tasks, projects, users |

---

## 5. Frontend Pages & Components

### 5.1 Auth Pages (`/login`, `/register`, `/forgot-password`)

Rendered inside `AuthLayout`. Not protected. On successful login, store tokens in Redux and redirect to `/dashboard`.

### 5.2 Dashboard (`/dashboard`)

Calls: `GET /api/dashboard/`, `GET /api/dashboard/team_workload/`  
Shows: My Tasks widget, Upcoming Deadlines, Project Health overview, Active Sprints, 12-week completion chart, Time Tracking summary, health filter chips.

### 5.3 Workspaces (`/workspaces`)

Calls: `GET /api/workspaces/`  
Actions: Create workspace (`POST /api/workspaces/`), open workspace.

### 5.4 Workspace Detail (`/workspaces/:id`)

Tabs: Overview, Members, Settings, Integrations, Templates  
Calls: workspace detail, members, git integrations, task templates  
Guest restriction: Members and Settings tabs hidden for guests.

### 5.5 Projects (`/projects`)

Calls: `GET /api/projects/`  
Actions: Create project, filter by workspace, filter by health status.

### 5.6 Project Detail (`/projects/:id`)

Tabs: Overview (task list), Milestones, Kanban, Reports, Settings, Docs  
Key behaviours:
- Task list with inline creation, bulk update, health badges, dependency indicators
- Milestone accordion with sprint burndown charts
- Reports tab: velocity bar chart, cumulative flow line chart, cycle time histogram
- Settings tab: custom statuses, custom fields, automation rules, CSV import
- Docs tab: list of project docs with `+ New Doc` button

### 5.7 Doc Detail (`/projects/:projectId/docs/:docId`)

Full-page markdown editor (`@uiw/react-md-editor`) with live preview, breadcrumbs, inline title editing, save and delete.

### 5.8 Tasks (`/tasks`)

Global task list with filters: status, priority, assignee, tag. URL query params persist filters. Export button. Command palette shortcut `N` opens task creation.

### 5.9 Kanban (`/kanban`)

Project selector dropdown. Columns driven by project custom statuses. Drag between columns → `PATCH /api/tasks/{id}/`. Drag within column → `POST /api/tasks/reorder/`. Inline creation at column bottom.

### 5.10 Gantt (`/gantt`)

Project selector. Timeline with milestones and sprints as draggable bars. Resize to change end date.

### 5.11 Workload (`/workload`)

Per-member task count table. Uses `GET /api/dashboard/team_workload/`.

### 5.12 Goals (`/goals`)

Workspace-level OKR list. Progress rings (0–100%). Expand each goal to see targets with progress bars.

### 5.13 Search (`/search`)

Tabs: Tasks, Projects, Users. Uses `GET /api/search/?q=…`.

### 5.14 Profile (`/profile`)

Tabs: Profile, Calendar Sync, Notifications  
Calendar Sync tab: shows iCal URL, copy button, regenerate button.

### 5.15 Settings (`/settings`)

User preferences: theme mode, notification preferences.

### 5.16 Notifications (`/notifications`)

Full notification list with mark-read controls.

### 5.17 Help (`/help`)

Full in-app user guide with 12 searchable accordion sections and quick-jump chips.

### 5.18 Shared Components

| Component | Purpose |
|-----------|---------|
| `NavSidebar` | Permanent drawer on desktop, temporary on mobile; guest-aware |
| `MainLayout` | Shell: sidebar + topbar with dark mode toggle, notification bell, command palette |
| `TaskDetailModal` | Full task editor: assignees, checklists, subtasks, comments, attachments, watchers, dependencies, git links, time tracking, custom fields |
| `HealthBadge` | Color-coded MUI Chip for health status |
| `StatusBadge` | Status chip with color mapping |
| `BurndownChart` | react-chartjs-2 line chart for sprint burndown |
| `MilestoneManager` | Accordion list of milestones with sprint detail |
| `NotificationBell` | Bell icon with unread count badge |
| `CommandPalette` | Ctrl+K modal: search + quick navigation |
| `GlobalSearch` | Standalone search input wired to the search API |
| `ErrorBoundary` | Catches render errors and shows a fallback UI |
| `ProtectedRoute` | Redirects to `/login` if no valid token |

---

## 6. Business Logic Rules

### 6.1 Auto-Completion Chain

When a Task is saved with a status equal to the sprint's done-state:
1. Check if all sibling tasks in the sprint are done
2. If yes → mark Sprint as Completed
3. Check if all sprints in the milestone are completed
4. If yes → mark Milestone as Completed
5. Check if all milestones in the project are completed
6. If yes → mark Project as Completed

Implemented in `clickpm/pm/services/auto_completion.py`. Triggered via `post_save` signal on Task.

### 6.2 Health Status Calculation

```python
time_elapsed_pct = (today - start_date) / (end_date - start_date) * 100
completion_pct   = entity.completion_percentage
ratio            = completion_pct / time_elapsed_pct  # default 1.0 if elapsed = 0

ratio >= 0.9  → on_track
ratio >= 0.6  → at_risk
ratio >= 0.3  → behind
ratio <  0.3  → critical

Special cases:
- No start_date or end_date → skip (keep current)
- end_date < today AND status != Done → critical
- status == Done → on_track
```

Implemented in `clickpm/pm/services/health_service.py`. Triggered via `post_save` on Task, Sprint, Milestone.

### 6.3 Health Degradation Severity

```python
severity = {'on_track': 0, 'at_risk': 1, 'behind': 2, 'critical': 3}
if severity[new] > severity[old]:
    send health_degradation notification to workspace owner and admins
```

### 6.4 Permission Hierarchy

Checked in `clickpm/pm/utils/permission_helpers.py`:

1. Superuser / staff → full access
2. Workspace owner → full workspace control
3. Workspace admin → manage members and projects
4. Project member → view and edit within that project
5. Task assignee → view a task even if not a project member (private project)
6. Guest → only projects where a `WorkspaceProjectAccess` record exists for their `WorkspaceMember`

### 6.5 Notification Triggers

| Event | Recipients |
|-------|-----------|
| Task assigned | New assignee |
| @mention in comment | Mentioned user |
| Watched task status change | All watchers |
| Task deadline passed | All assignees + watchers |
| Health degradation | Workspace owner + admins |

### 6.6 Automation Rule Evaluation

On every task save, `automation_service.evaluate_triggers(task, event_type, old_data, new_data)` iterates all active rules for the project. A rule fires when its trigger matches the event and all conditions in `conditions` JSONField match the new task state. Supported actions:

- `send_notification` → creates a Notification for the specified recipient
- `change_status` → updates task status (re-triggers health calculation)
- `change_priority` → updates task priority
- `assign_to` → adds a user to task assignees

### 6.7 Recurring Task Creation

The management command `create_recurring_tasks` runs daily via cron. It finds tasks where `recurrence` is set, `due_date` has passed, and the task is Done. It creates a new Task copying the original, advancing the `due_date` by the recurrence interval, and setting `recurrence_parent` to the original task's ID.

### 6.8 Git Webhook Task Linking

GitHub/GitLab sends a webhook POST to `/api/webhooks/github/`. The view:
1. Validates the HMAC signature using the stored `webhook_secret`
2. Parses the payload for task ID references (regex: `CUR-\d+`)
3. For each match, creates or updates a `TaskGitLink` record
4. If the event is `pull_request` with action `closed` and `merged: true` → sets linked task status to "In Review"

---

## 7. Security Requirements

### 7.1 Authentication

- Access tokens expire after 60 minutes
- Refresh tokens expire after 24 hours; each use rotates the token (old token blacklisted)
- Token blacklist uses Django's `rest_framework_simplejwt.token_blacklist` app
- Tokens are transmitted as Bearer tokens in the `Authorization` header only (not cookies, not query params, except the iCal token which uses `?token=` as it must be browser-copyable)

### 7.2 Authorisation

- Every DRF view enforces `IsAuthenticated` as the default permission class
- Resource-level checks are performed in view methods or permission classes before any data is returned or mutated
- Guest restrictions are checked in `permission_helpers.py` — never rely on frontend hiding alone
- Superuser access to the Django admin panel is separate from the API RBAC

### 7.3 Input Validation

- Serializer-level validation via DRF and Zod (frontend)
- File uploads: file size limit enforced server-side; content type checked for attachments
- Webhook payloads: HMAC-SHA256 signature required; invalid signature returns 403

### 7.4 CORS

- In production, `ALLOWED_HOSTS` and `CORS_ALLOWED_ORIGINS` restrict to the frontend domain
- `CORS_ALLOW_CREDENTIALS = False` (JWT tokens, not cookies)

### 7.5 SQL Injection

- All database access uses the Django ORM; raw SQL is prohibited
- Any parameterised raw queries must use `cursor.execute(sql, params)` with bound parameters only

---

## 8. Integration Requirements

### 8.1 Socket.io

Events emitted by the backend:
- `notification` → `{ id, type, message, task_id, project_id }` — sent to the recipient's private room
- `task_updated` → `{ task_id, status, assignees }` — sent to all project members watching the task

Frontend hook `useSocket.ts` connects on mount, listens for these events, and invalidates RTK Query cache tags accordingly.

### 8.2 GitHub / GitLab Webhook

Incoming payload format (GitHub push event):
```json
{
  "commits": [{ "message": "Fix auth bug CUR-42", "id": "abc123..." }],
  "repository": { "html_url": "https://github.com/org/repo" }
}
```

Incoming payload format (GitHub pull_request event):
```json
{
  "action": "closed",
  "pull_request": {
    "merged": true,
    "html_url": "https://github.com/org/repo/pull/7",
    "title": "Resolves CUR-42"
  }
}
```

### 8.3 iCal Feed

RFC 5545 VCALENDAR format. One VEVENT per task assigned to the user with a due date:
```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//CuriousPMO//EN
BEGIN:VEVENT
UID:task-{id}@curiouspmo
SUMMARY:{task title}
DTSTART;VALUE=DATE:{YYYYMMDD}
DTEND;VALUE=DATE:{YYYYMMDD+1}
DESCRIPTION:Project: {project name}
END:VEVENT
...
END:VCALENDAR
```

---

## 9. Error Handling

### 9.1 HTTP Error Codes

| Code | Meaning in CuriousPMO |
|------|----------------------|
| 400 | Validation error — body contains `{ "field": ["error message"] }` |
| 401 | Missing or expired JWT — client should attempt token refresh |
| 403 | Valid token but insufficient permissions |
| 404 | Resource does not exist or is hidden from the current user (guests) |
| 409 | Conflict — e.g. duplicate workspace member |
| 422 | Business rule violation — e.g. circular task dependency |
| 500 | Unhandled server error — logged; generic message returned |

### 9.2 Frontend Error Boundary

`components/error/ErrorBoundary.tsx` wraps the main route tree. On any render error it displays a fallback with the error message and a "Reload" button. RTK Query mutation errors are surfaced via MUI `Snackbar` alerts dismissed automatically after 5 seconds.

---

*CuriousPMO SRS — v1.0 — 2026-05-20*
