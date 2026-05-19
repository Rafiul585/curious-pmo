# CuriousPMO — Master Feature Roadmap

This file is the single source of truth for all planned work. Each step is self-contained — any Claude Code session can pick up one step and implement it without needing prior conversation context.

**How to use:**
- Pick the next `[ ]` step in any track
- Read the full block — it has exact files, logic, and a "Done when" check
- Mark it `[x]` when done
- Run `makemigrations && migrate` after every backend model change

---

## Quick Index

| Track | Topic | Steps |
|-------|-------|-------|
| **A** | Health & Risk Status | A1 – A10 |
| **B** | Frontend UX Improvements | B1 – B10 |
| **C** | Must-Have Missing Features | C1 – C10 |
| **D** | Nice-to-Have Features | D1 – D10 |
| **DOCS** | Project Documentation | DOC1 – DOC5 |

---

---

# TRACK A — Health & Risk Status Features
*Backend-first (A1–A5), then matching frontend (A6–A10).*

---

## [x] A1 — Health Status Field on Models

**Goal:** Add `health_status` to Project, Milestone, and Sprint.

**File:** `clickpm/pm/models/project_models.py`
```python
HEALTH_STATUS_CHOICES = [
    ('on_track', 'On Track'),
    ('at_risk',  'At Risk'),
    ('behind',   'Behind'),
    ('critical', 'Critical'),
]
```
Add to `Project`, `Milestone`, and `Sprint`:
```python
health_status = models.CharField(
    max_length=20, choices=HEALTH_STATUS_CHOICES,
    default='on_track', blank=True, null=True,
)
```
```bash
cd clickpm && python manage.py makemigrations && python manage.py migrate
```
**Done when:** Migration applies and all three models have `health_status`.

---

## [x] A2 — Health Calculation Service

**File to create:** `clickpm/pm/services/health_service.py`

```
time_elapsed_pct = (today - start_date) / (end_date - start_date) * 100
completion_pct   = entity.calculate_completion_percentage()
ratio            = completion_pct / time_elapsed_pct  (default 1.0 if elapsed = 0)

ratio >= 0.9  → on_track
ratio >= 0.6  → at_risk
ratio >= 0.3  → behind
ratio <  0.3  → critical

Special cases:
- No start_date or end_date → skip
- end_date < today AND status != Done → critical
- status == Done → on_track
```

**Functions:**
```python
def calculate_health_status(entity) -> str: ...
def refresh_health(entity, save=True) -> None: ...
def refresh_project_tree_health(project) -> None: ...
```
**Done when:** `refresh_health(project)` sets correct `health_status`.

---

## [x] A3 — Auto-Refresh Health via Signal

**File:** `clickpm/pm/signals.py` (create if needed)
```python
@receiver(post_save, sender=Task)
def task_saved(sender, instance, **kwargs):
    if instance.sprint:
        refresh_health(instance.sprint)
        if instance.sprint.milestone:
            refresh_health(instance.sprint.milestone)
            refresh_health(instance.sprint.milestone.project)
# Add receivers for Sprint and Milestone too
```
**Done when:** Saving a task updates parent sprint/milestone/project `health_status`.

---

## [x] A4 — Expose health_status in Serializers & API

**File:** `clickpm/pm/serializers/project_serializers.py`
- Add `health_status` to `ProjectSerializer`, `MilestoneSerializer`, `SprintSerializer`
- Allow `PATCH /api/projects/{id}/` with `{"health_status": "at_risk"}` for admins

**Done when:** `GET /api/projects/` returns `health_status` per project.

---

## [x] A5 — Health Degradation Notifications

**Files:**
- `clickpm/pm/models/notification_models.py` → add `'health_degradation'` to choices
- `clickpm/pm/services/notification_service.py` → add `create_health_alert(entity, old, new)`
- `clickpm/pm/services/health_service.py` → trigger alert when severity increases

```python
severity = {'on_track': 0, 'at_risk': 1, 'behind': 2, 'critical': 3}
if severity.get(new_status, 0) > severity.get(old_status, 0):
    NotificationService.create_health_alert(entity, old_status, new_status)
```
Message format: `"Sprint 'Alpha' changed from On Track → At Risk"`

**Done when:** Health degradation creates a notification for project owner and admins.

---

## [x] A6 — Frontend: HealthBadge Component

**File to create:** `frontend/src/components/feedback/HealthBadge.tsx`
```tsx
// Props: health_status: 'on_track' | 'at_risk' | 'behind' | 'critical' | null
// MUI <Chip>: on_track=success, at_risk=warning, behind=#f57c00, critical=error
```
**Update:**
- `frontend/src/api/` — add `health_status` to TS types for Project, Milestone, Sprint
- `frontend/src/pages/DashboardPage.tsx` — badge next to project name
- `frontend/src/pages/ProjectDetailPage.tsx` — badge on milestone and sprint rows

**Done when:** Project cards and milestone/sprint rows show colored health chips.

---

## [x] A7 — Frontend: Health Status Filter

**Files:**
- `frontend/src/pages/DashboardPage.tsx` — chip row: `All | On Track | At Risk | Behind | Critical`
- `frontend/src/pages/ProjectDetailPage.tsx` — same filter for milestones/sprints

Client-side filter on already-fetched data.

**Done when:** Clicking "At Risk" shows only at-risk items.

---

## [x] A8 — Sprint Burndown Chart

**Backend — new endpoint:** `GET /api/sprints/{id}/burndown/`
```json
{ "sprint_start": "...", "sprint_end": "...", "total_tasks": 12,
  "ideal": [12, 11, 10, ...], "actual": [12, 12, 11, ...] }
```
**File to create:** `clickpm/pm/services/burndown_service.py`
- Build `actual` by replaying `ActivityLog` (TASK_STATUS_CHANGED → Done) per day.

**File to change:** `clickpm/pm/views/project_views.py`
- Add `@action(detail=True)` named `burndown` on `SprintViewSet`.

**Frontend:** `<BurndownChart>` using already-installed `chart.js`/`react-chartjs-2` in `ProjectDetailPage.tsx`.

**Done when:** Clicking a sprint shows ideal vs. actual burndown line chart.

---

## [x] A9 — Blocked Task Indicator

**Backend:** `clickpm/pm/serializers/task_serializers.py`
- Add `is_blocked = SerializerMethodField()` → True if any `blocked_by` dependency has an incomplete task.

**Frontend:**
- `frontend/src/components/TaskDetailModal.tsx` — red `Blocked` chip when `is_blocked`
- `frontend/src/pages/ProjectDetailPage.tsx` — same chip in task rows

**Done when:** Tasks with unfinished dependencies show a red "Blocked" badge.

---

## [x] A10 — Bulk Task Status Update

**Backend:** `POST /api/tasks/bulk_update/` → `{ "task_ids": [1,2,3], "status": "Done" }`

**File:** `clickpm/pm/views/task_views.py` — `@action(detail=False, methods=['post'])` for `bulk_update`. Call audit service + trigger health recalculation per task.

**Frontend (`frontend/src/pages/ProjectDetailPage.tsx`):**
- Checkboxes on task rows
- Floating bar when selected: `Mark as Done | In Progress | Review`

**Done when:** Selecting tasks and clicking "Mark as Done" updates all in one API call.

---

---

# TRACK B — Frontend UX Improvements
*Pure frontend. Each step is independent.*

---

## [x] B1 — Fix Mobile Sidebar (Currently Broken)

**Problem:** Hamburger button in `MainLayout.tsx` has no `onClick` — tapping it does nothing.

**File:** `frontend/src/components/layout/MainLayout.tsx`
```tsx
const isMobile = useMediaQuery(theme.breakpoints.down('md'));
const [mobileOpen, setMobileOpen] = useState(false);
// Wire hamburger to setMobileOpen(true)
// Drawer: variant={isMobile ? 'temporary' : 'permanent'}
//         open={isMobile ? mobileOpen : true}
//         onClose={() => setMobileOpen(false)}
```
**Done when:** Sidebar hides on mobile; hamburger opens it as a slide-in drawer.

---

## [x] B2 — Cmd+K Command Palette

**File to create:** `frontend/src/components/search/CommandPalette.tsx`
- Opens on `Ctrl+K` / `Cmd+K` from anywhere
- MUI `<Dialog>` with autofocused search input
- Shows: recent pages, matching tasks/projects (existing search API), quick actions (Create Task, Create Project)
- Arrow keys navigate; Enter triggers; Escape closes

**File to update:** `frontend/src/components/layout/MainLayout.tsx` — mount palette + `keydown` listener

**Done when:** Ctrl+K opens palette; typing searches; Enter navigates.

---

## [x] B3 — Quick Inline Task Creation

**Files to update:**
1. `frontend/src/pages/ProjectDetailPage.tsx` — `+ Add task` row at bottom of each sprint's list. Clicking reveals inline text input, pre-fills project/sprint/milestone, saves on Enter.
2. `frontend/src/pages/KanbanPage.tsx` — `+ Add task` at bottom of each column. Inline input pre-fills status from column.

**Done when:** A task can be created with just a title + Enter from the project list and Kanban board.

---

## [x] B4 — Real-Time Notifications via Socket.io

**Note:** First check if Django has WebSocket/Socket.io support in `clickpm/config/settings.py`. If not, add `django-channels` before starting frontend work.

**File to create:** `frontend/src/hooks/useSocket.ts` — connects to Socket.io, listens for `notification` events, dispatches to React Query cache.

**File to update:** `frontend/src/components/notifications/NotificationBell.tsx` — replace 30-second polling with socket listener.

**Done when:** New notifications appear instantly in the bell without a page refresh.

---

## [x] B5 — Drag-and-Drop Reordering Within Kanban Columns

**Backend:**
- `clickpm/pm/models/task_models.py` — add `position = models.PositiveIntegerField(default=0)`
- `clickpm/pm/views/task_views.py` — add `POST /api/tasks/reorder/` `{ "task_ids": [3,1,2] }`
- Run `makemigrations && migrate`

**Frontend (`frontend/src/pages/KanbanPage.tsx`):**
- On same-column drop: calculate new position, call `reorder`, re-sort optimistically.

**Done when:** Dragging within a column reorders tasks persistently.

---

## [x] B6 — Dark Mode Toggle in Navbar

**File:** `frontend/src/components/layout/MainLayout.tsx`
- Add sun/moon `<IconButton>` next to notification bell
- Dispatch existing `setThemeMode` Redux action on click

**Done when:** One click in the navbar toggles dark/light mode.

---

## [x] B7 — Task Comments Wired to API

**Audit first:** Read `frontend/src/components/TaskDetailModal.tsx` to confirm what's connected.

**Files to update:**
- `frontend/src/components/TaskDetailModal.tsx` — fetch `GET /api/comments/?task={id}`, render list, post `POST /api/comments/`, support `@mention` dropdown
- `frontend/src/api/` — add comment API functions if missing

**Done when:** Task modal shows comments and allows posting new ones with @mention support.

---

## [x] B8 — Saved Filters via URL Query Params

**Files to update:**
- `frontend/src/pages/TasksPage.tsx` — read/write `status`, `priority`, `assignee` via `useSearchParams()`
- `frontend/src/pages/DashboardPage.tsx` — health status filter in URL
- `frontend/src/pages/ProjectDetailPage.tsx` — active tab + filter in URL

**Done when:** Refreshing the page with active filters keeps them applied. URL is shareable.

---

## [x] B9 — Keyboard Shortcuts

**File to create:** `frontend/src/hooks/useKeyboardShortcuts.ts`
```
Ctrl+K   → command palette (B2)
N        → new task modal
G D      → go to Dashboard
G P      → go to Projects
G K      → go to Kanban
G G      → go to Gantt
Escape   → close open modal
```
Only active when focus is not inside an input/textarea. Mount in `MainLayout.tsx`.

**Done when:** `N` anywhere opens task creation; `G D` navigates to Dashboard.

---

## [x] B10 — Time Tracking UI

**Depends on C6** (time tracking backend fields). Complete C6 first.

**File to update:** `frontend/src/components/TaskDetailModal.tsx`
- "Log Time" section: show `estimated_hours` and `actual_hours`
- Input + "Log" button → `PATCH /api/tasks/{id}/` updating `actual_hours`
- Progress bar showing logged / estimated hours

**Done when:** Task modal shows estimated vs. logged hours with a way to add time.

---

---

# TRACK C — Must-Have Missing Features
*Features expected in any serious PM tool. Implement before Track D.*

---

## [x] C1 — Subtasks

**Why:** Teams need to break tasks into smaller pieces. Without subtasks, everything ends up in the description or as separate disconnected tasks.

**Backend:**
- `clickpm/pm/models/task_models.py` — add self-referential FK:
  ```python
  parent = models.ForeignKey(
      'self', null=True, blank=True,
      on_delete=models.CASCADE, related_name='subtasks'
  )
  ```
- `clickpm/pm/serializers/task_serializers.py` — add `subtasks` nested serializer (read-only, shallow — just id/title/status)
- `clickpm/pm/views/task_views.py` — filter: `GET /api/tasks/?parent={id}` returns subtasks. `POST /api/tasks/` with `parent` creates a subtask.
- Run `makemigrations && migrate`

**Frontend:**
- `frontend/src/components/TaskDetailModal.tsx` — add "Subtasks" section:
  - List existing subtasks (title, status chip, assignee avatar)
  - `+ Add subtask` inline input
  - Click subtask title to open its own modal (recursive)
- `frontend/src/pages/ProjectDetailPage.tsx` — show subtask count badge on parent task rows (e.g., `3/5 subtasks done`)

**Done when:** A task can have subtasks. Completing all subtasks shows progress on the parent.

---

## [x] C2 — Multiple Assignees Per Task

**Why:** Pair programming, design reviews, and shared ownership require more than one person on a task.

**Backend:**
- `clickpm/pm/models/task_models.py` — add:
  ```python
  assignees = models.ManyToManyField(
      'User', blank=True, related_name='assigned_tasks'
  )
  ```
  Keep the existing `assignee` FK temporarily for migration safety. After migration, deprecate single `assignee` in favour of `assignees`.
- `clickpm/pm/serializers/task_serializers.py` — expose `assignees` as list of user objects
- Update `check_deadlines` management command and notification service to notify all assignees
- Run `makemigrations && migrate`

**Frontend:**
- `frontend/src/components/TaskDetailModal.tsx` — replace single-user assignee picker with multi-select showing avatars
- `frontend/src/pages/KanbanPage.tsx` and `ProjectDetailPage.tsx` — show stacked avatars (max 3 + overflow count) on task cards

**Done when:** A task can be assigned to multiple users; all assignees get deadline notifications.

---

## [x] C3 — Task Checklists

**Why:** Most tasks have a list of acceptance criteria or steps. Users currently paste these into the description and manually track them.

**Backend:**
- `clickpm/pm/models/task_models.py` (or new `checklist_models.py`):
  ```python
  class Checklist(models.Model):
      task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='checklists')
      title = models.CharField(max_length=200)
      order = models.PositiveIntegerField(default=0)

  class ChecklistItem(models.Model):
      checklist = models.ForeignKey(Checklist, on_delete=models.CASCADE, related_name='items')
      text = models.CharField(max_length=500)
      is_checked = models.BooleanField(default=False)
      order = models.PositiveIntegerField(default=0)
  ```
- Serializers for both models
- Endpoints: `POST /api/checklists/`, `PATCH /api/checklist-items/{id}/` (to toggle `is_checked`)
- Add to router: `clickpm/pm/router.py`
- Run `makemigrations && migrate`

**Frontend:**
- `frontend/src/components/TaskDetailModal.tsx` — "Checklist" section:
  - Show progress bar: `3 / 5 items done`
  - Each item: checkbox + text + delete icon
  - `+ Add item` inline input at the bottom
  - Checking an item calls `PATCH /api/checklist-items/{id}/`

**Done when:** Tasks can have checklists; items can be checked off; progress bar shows completion.

---

## [x] C4 — Custom Statuses Per Project

**Why:** A software team needs `Backlog → In Dev → Code Review → QA → Done`. A marketing team needs `Idea → Draft → Review → Published`. Hardcoded global statuses block diverse workflows.

**Backend:**
- New model in `clickpm/pm/models/`:
  ```python
  class ProjectStatus(models.Model):
      project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='custom_statuses')
      name = models.CharField(max_length=100)
      color = models.CharField(max_length=7, default='#6B7280')  # hex color
      order = models.PositiveIntegerField(default=0)
      is_done_state = models.BooleanField(default=False)  # triggers auto-completion
  ```
- Keep the existing hardcoded status choices as a fallback for projects with no custom statuses
- `Task.status` should accept any string (not just the hardcoded choices) when a project has custom statuses
- Endpoints: `GET/POST /api/projects/{id}/statuses/`, `PATCH/DELETE /api/project-statuses/{id}/`
- Run `makemigrations && migrate`

**Frontend:**
- `frontend/src/pages/ProjectDetailPage.tsx` (settings tab) — "Statuses" section: drag-to-reorder list of status pills, each with a color picker and `is_done_state` toggle. `+ Add Status` button.
- `frontend/src/pages/KanbanPage.tsx` — render columns dynamically from project's custom statuses instead of hardcoded list
- `frontend/src/components/TaskDetailModal.tsx` — status dropdown shows project-specific statuses

**Done when:** Each project can define its own statuses; Kanban columns reflect them.

---

## [x] C5 — Tags on Tasks (Proper M2M)

**Why:** Cross-project filtering (e.g., "show all `bug` tasks across every project") is impossible with the current text-only `tags` field on Project.

**Backend:**
- New model:
  ```python
  class Tag(models.Model):
      workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name='tags')
      name = models.CharField(max_length=50)
      color = models.CharField(max_length=7, default='#6B7280')
      class Meta:
          unique_together = ('workspace', 'name')
  ```
- Add to `Task`: `tags = models.ManyToManyField(Tag, blank=True)`
- Add to `Project`: replace existing `tags` CharField with M2M to `Tag`
- Endpoints: `GET/POST /api/tags/` (workspace-scoped), `POST /api/tasks/{id}/add_tag/`, `DELETE /api/tasks/{id}/remove_tag/`
- Run `makemigrations && migrate`

**Frontend:**
- `frontend/src/components/TaskDetailModal.tsx` — tag chips with `+ Add tag` dropdown (search existing workspace tags or create new)
- `frontend/src/pages/TasksPage.tsx` — tag filter in the filter bar
- `frontend/src/pages/ProjectDetailPage.tsx` — tag chips on task rows; tag filter
- `frontend/src/pages/SearchPage.tsx` — add Tags tab to search results

**Done when:** Tags can be added to tasks; filtering by tag works across all projects in a workspace.

---

## [x] C6 — Time Tracking (Estimated vs. Actual Hours)

**Why:** Without time tracking, there's no data for billing, capacity planning, or identifying which projects are burning more hours than planned.

**Backend:**
- `clickpm/pm/models/task_models.py` — add:
  ```python
  estimated_hours = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
  actual_hours    = models.DecimalField(max_digits=6, decimal_places=2, default=0)
  ```
- New model for detailed time logs:
  ```python
  class TimeLog(models.Model):
      task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='time_logs')
      user = models.ForeignKey(User, on_delete=models.CASCADE)
      hours = models.DecimalField(max_digits=5, decimal_places=2)
      date = models.DateField()
      note = models.CharField(max_length=500, blank=True)
  ```
- Endpoint: `POST /api/time-logs/` to log hours; `GET /api/tasks/{id}/time-logs/` to list logs
- Dashboard: roll up `total_logged_hours` per project/sprint in dashboard endpoints
- Run `makemigrations && migrate`

**Frontend:** See B10 for the UI implementation (depends on this step).

**Done when:** Tasks have estimated hours; time can be logged per task; total hours visible on task.

---

## [x] C7 — Export (CSV / Excel)

**Why:** PMs need to share status reports, import into Excel for stakeholders, or do offline analysis. Missing export is a blocker for enterprise adoption.

**Backend:**
- Install `openpyxl` (add to `requirements.txt`)
- `clickpm/pm/views/task_views.py` — add `@action` for `export`:
  - `GET /api/tasks/export/?project={id}&format=csv` or `format=xlsx`
  - Returns file download response with tasks filtered by project/sprint/assignee/status
  - Columns: ID, Title, Status, Priority, Assignee, Sprint, Milestone, Due Date, Estimated Hours, Actual Hours, Tags
- `clickpm/pm/views/project_views.py` — add project-level export: `GET /api/projects/{id}/export/`

**Frontend:**
- `frontend/src/pages/TasksPage.tsx` — "Export" button in the filter bar toolbar → dropdown: `Export as CSV` / `Export as Excel`
- `frontend/src/pages/ProjectDetailPage.tsx` — same export button in the task list tab

**Done when:** Clicking Export downloads a file with all tasks in the current filtered view.

---

## [x] C8 — Task Watchers / Followers

**Why:** Managers and stakeholders need visibility on tasks without being the assignee. Currently, if you're not assigned or @mentioned, you get no notifications.

**Backend:**
- `clickpm/pm/models/task_models.py` — add:
  ```python
  watchers = models.ManyToManyField(User, blank=True, related_name='watched_tasks')
  ```
- Update `notification_service.py` — on task status change, comment added, or due date change: notify all watchers in addition to assignees
- Endpoints: `POST /api/tasks/{id}/watch/`, `DELETE /api/tasks/{id}/unwatch/`
- Run `makemigrations && migrate`

**Frontend:**
- `frontend/src/components/TaskDetailModal.tsx` — "Watchers" section with avatar list + "Watch / Unwatch" toggle button for the current user
- Show watcher count on task cards in `ProjectDetailPage.tsx`

**Done when:** Users can watch/unwatch tasks and receive notifications on any activity.

---

## [x] C9 — Recurring Tasks

**Why:** Standups, weekly reports, monthly billing tasks, and regular reviews all need to be manually recreated every cycle without this feature.

**Backend:**
- `clickpm/pm/models/task_models.py` — add:
  ```python
  RECURRENCE_CHOICES = [
      ('daily', 'Daily'), ('weekly', 'Weekly'),
      ('biweekly', 'Bi-Weekly'), ('monthly', 'Monthly'),
  ]
  recurrence       = models.CharField(max_length=20, choices=RECURRENCE_CHOICES, blank=True, null=True)
  recurrence_end   = models.DateField(null=True, blank=True)
  recurrence_parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='recurrences')
  ```
- Management command: `clickpm/pm/management/commands/create_recurring_tasks.py`
  - Runs on a schedule (add to cron or celery beat)
  - Finds tasks where `recurrence` is set and due date has passed; creates the next occurrence
- Run `makemigrations && migrate`

**Frontend:**
- `frontend/src/components/TaskDetailModal.tsx` and task creation dialog:
  - "Repeat" dropdown: None / Daily / Weekly / Bi-Weekly / Monthly
  - Optional "Repeat until" date picker
  - Show recurrence icon on recurring task cards

**Done when:** A task set to "weekly" automatically creates a new instance each week when completed.

---

## [x] C10 — Workload / Capacity View (Dedicated Page)

**Why:** Team workload data exists in the dashboard API but there's no dedicated page for resource planning or drag-to-rebalance.

**Backend:**
- The `team_workload` dashboard endpoint exists. Enhance it to support a date range parameter: `GET /api/dashboard/team_workload/?start=2025-05-01&end=2025-05-31`
- Return per-user, per-day task count and estimated hours

**Frontend:**
- **New page:** `frontend/src/pages/WorkloadPage.tsx`
  - Timeline bar chart: X-axis = days in selected week/month, Y-axis = team members
  - Each bar shows total tasks/hours assigned per day
  - Color: green if under capacity (< 8h), amber if near limit (8–10h), red if over (> 10h)
  - Clicking a bar cell shows the tasks assigned to that person on that day
  - Date range picker (week / month view)
- Add route in `frontend/src/App.tsx`: `/workload`
- Add "Workload" link in `frontend/src/components/layout/NavSidebar.tsx`

**Done when:** `/workload` page shows each team member's daily task load with capacity color coding.

---

---

# TRACK D — Nice-to-Have Features
*Power features. Implement after Track C is complete.*

---

## [x] D1 — Custom Fields on Tasks

**Why:** Different teams need different metadata. A bug tracker needs "Affected Version" and "Browser". A sales team needs "Deal Value" and "Close Date".

**Backend:**
- New models:
  ```python
  class CustomFieldDefinition(models.Model):
      FIELD_TYPES = [('text','Text'),('number','Number'),('date','Date'),
                     ('dropdown','Dropdown'),('checkbox','Checkbox'),('url','URL')]
      project   = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='custom_fields')
      name      = models.CharField(max_length=100)
      field_type = models.CharField(max_length=20, choices=FIELD_TYPES)
      options   = models.JSONField(default=list, blank=True)  # for dropdown choices
      required  = models.BooleanField(default=False)
      order     = models.PositiveIntegerField(default=0)

  class TaskCustomFieldValue(models.Model):
      task       = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='custom_field_values')
      field      = models.ForeignKey(CustomFieldDefinition, on_delete=models.CASCADE)
      value      = models.JSONField(null=True, blank=True)
  ```
- Endpoints: `GET/POST /api/projects/{id}/custom-fields/`, `PATCH /api/tasks/{id}/custom-field-values/`
- Run `makemigrations && migrate`

**Frontend:**
- `frontend/src/pages/ProjectDetailPage.tsx` (settings tab) — "Custom Fields" manager: add/edit/delete/reorder fields
- `frontend/src/components/TaskDetailModal.tsx` — render custom fields dynamically below standard fields based on project config

**Done when:** A project can define custom fields; tasks show and save values for them.

---

## [x] D2 — Automation Rules

**Why:** Eliminates repetitive manual work. "When task status = Done → notify manager", "When due date passes → set priority to Critical".

**Backend:**
- New models:
  ```python
  class AutomationRule(models.Model):
      TRIGGER_CHOICES = [('status_change','Status Change'),('due_date_passed','Due Date Passed'),
                         ('task_created','Task Created'),('assignee_changed','Assignee Changed')]
      ACTION_CHOICES  = [('send_notification','Send Notification'),('change_status','Change Status'),
                         ('change_priority','Change Priority'),('assign_to','Assign To')]
      project    = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='automations')
      name       = models.CharField(max_length=200)
      trigger    = models.CharField(max_length=50, choices=TRIGGER_CHOICES)
      conditions = models.JSONField(default=dict)
      action     = models.CharField(max_length=50, choices=ACTION_CHOICES)
      action_params = models.JSONField(default=dict)
      is_active  = models.BooleanField(default=True)
  ```
- **File to create:** `clickpm/pm/services/automation_service.py`
  - `evaluate_triggers(task, event_type, old_data, new_data)` — checks all active rules for the project and executes matching actions
  - Called from `task_views.py` after any task save
- Run `makemigrations && migrate`

**Frontend:**
- `frontend/src/pages/ProjectDetailPage.tsx` (settings tab) — "Automations" section
  - List of active rules (name, trigger, action, on/off toggle)
  - "Create Rule" dialog: trigger dropdown → conditions → action dropdown → action params

**Done when:** A rule "When status → Done: notify project owner" fires automatically.

---

## [x] D3 — Goals / OKRs

**Why:** Link project work to business objectives. Track whether the team is actually moving the needle on what matters.

**Backend:**
- New models:
  ```python
  class Goal(models.Model):
      workspace   = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name='goals')
      name        = models.CharField(max_length=300)
      description = models.TextField(blank=True)
      owner       = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
      due_date    = models.DateField(null=True, blank=True)
      progress    = models.FloatField(default=0)  # 0–100, auto-calculated or manual

  class GoalTarget(models.Model):
      TARGET_TYPES = [('task_completion','Task Completion %'),('number','Number'),('currency','Currency')]
      goal        = models.ForeignKey(Goal, on_delete=models.CASCADE, related_name='targets')
      name        = models.CharField(max_length=200)
      target_type = models.CharField(max_length=30, choices=TARGET_TYPES)
      current     = models.FloatField(default=0)
      target      = models.FloatField()
      linked_project = models.ForeignKey(Project, null=True, blank=True, on_delete=models.SET_NULL)
  ```
- Auto-calculate `GoalTarget.current` from linked project's `completion_percentage` when target_type is `task_completion`
- Endpoints: `GET/POST /api/goals/`, `GET/POST /api/goal-targets/`
- Run `makemigrations && migrate`

**Frontend:**
- **New page:** `frontend/src/pages/GoalsPage.tsx`
  - List of goals with progress rings (0–100%)
  - Each goal expands to show its targets with progress bars
  - `+ New Goal` dialog
- Add "Goals" link in `frontend/src/components/layout/NavSidebar.tsx`

**Done when:** Goals with linked projects show auto-updated progress as tasks are completed.

---

## [x] D4 — Task Templates

**Why:** Common task types (bug reports, feature requests, onboarding checklists) have the same structure every time. Templates eliminate repetitive setup.

**Backend:**
- New model:
  ```python
  class TaskTemplate(models.Model):
      workspace   = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name='task_templates')
      name        = models.CharField(max_length=200)
      description = models.TextField(blank=True)
      default_priority = models.CharField(max_length=20, default='Medium')
      default_tags  = models.ManyToManyField(Tag, blank=True)
      checklist_items = models.JSONField(default=list)  # [{"text": "...", "is_checked": false}]
      custom_field_defaults = models.JSONField(default=dict)
      created_by  = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
  ```
- Endpoint: `POST /api/tasks/from-template/` → `{ "template_id": 1, "title": "...", "project": 5 }`
- Run `makemigrations && migrate`

**Frontend:**
- `frontend/src/pages/TasksPage.tsx` and task creation dialog — "Use Template" button opens a template picker dialog
- `frontend/src/pages/WorkspaceDetailPage.tsx` (settings tab) — "Templates" section: list, create, edit, delete templates

**Done when:** A task created from a template inherits checklist items, tags, and default fields.

---

## [ ] D5 — Guest / External User Access

**Why:** Clients, contractors, and external reviewers need limited access to specific projects without full workspace membership.

**Backend:**
- `clickpm/pm/models/workspace_models.py` — add `is_guest = models.BooleanField(default=False)` to `WorkspaceMember`
- Guests can only see projects they are explicitly added to via `WorkspaceProjectAccess`
- Guests cannot see other workspace members, workspace settings, or other projects
- Update permission helpers in `clickpm/pm/utils/permission_helpers.py` to enforce guest restrictions

**Frontend:**
- `frontend/src/pages/WorkspaceDetailPage.tsx` (members tab) — "Invite Guest" option in the invite dialog, shows guest badge on guest member rows
- Navigation sidebar hides workspace-level items (members, settings) for guest users

**Done when:** A guest user can log in and see only the projects they were explicitly invited to.

---

## [ ] D6 — GitHub / GitLab Integration

**Why:** Developers switch between the PM tool and GitHub constantly. Linking PRs/commits to tasks and auto-updating status on merge eliminates manual status updates.

**Backend:**
- New model:
  ```python
  class GitIntegration(models.Model):
      workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE)
      provider  = models.CharField(max_length=20, choices=[('github','GitHub'),('gitlab','GitLab')])
      repo_url  = models.URLField()
      webhook_secret = models.CharField(max_length=200)

  class TaskGitLink(models.Model):
      task      = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='git_links')
      pr_url    = models.URLField(blank=True)
      commit_sha = models.CharField(max_length=40, blank=True)
      status    = models.CharField(max_length=20)  # open, merged, closed
  ```
- **Webhook endpoint:** `POST /api/webhooks/github/` — receives GitHub push/PR events, finds tasks mentioned in commit messages (`[CUR-123]` format), updates `TaskGitLink`
- When PR is merged → auto-move linked task to "In Review" status

**Frontend:**
- `frontend/src/components/TaskDetailModal.tsx` — "Git Links" section: show linked PRs with status badges (Open/Merged/Closed)
- `frontend/src/pages/WorkspaceDetailPage.tsx` (settings) — "Integrations" tab: connect GitHub/GitLab repo

**Done when:** Mentioning a task ID in a commit message creates a link visible in the task modal.

---

## [ ] D7 — Velocity & Sprint Reporting

**Why:** Sprint velocity (story points / task count completed per sprint) is the core metric for agile forecasting. It's not surfaced anywhere currently.

**Backend:**
- Enhance dashboard: `GET /api/dashboard/velocity/?project={id}&last_n_sprints=6`
  - Returns per-sprint: sprint name, planned tasks, completed tasks, completion rate
- `GET /api/dashboard/cumulative_flow/?project={id}` — returns daily count of tasks in each status over time
- `GET /api/dashboard/cycle_time/?project={id}` — average days from "In Progress" to "Done" per task

**Frontend:**
- `frontend/src/pages/ProjectDetailPage.tsx` (new "Reports" tab):
  - **Velocity Chart:** bar chart, X = sprint, Y = tasks completed (uses `react-chartjs-2`)
  - **Cumulative Flow Diagram:** stacked area chart by status over time
  - **Cycle Time:** average cycle time badge + histogram

**Done when:** The project Reports tab shows velocity chart for the last 6 sprints.

---

## [ ] D8 — Calendar Sync (Google / Outlook)

**Why:** Task due dates should appear in the tools team members already live in — Google Calendar or Outlook.

**Backend:**
- Generate an iCal feed: `GET /api/users/calendar.ics?token={ical_token}`
  - Returns all tasks assigned to the user as calendar events
  - `ical_token` is a long-lived read-only token stored on the User model
- Endpoint to generate/regenerate the token: `POST /api/users/calendar-token/`

**Frontend:**
- `frontend/src/pages/ProfilePage.tsx` — "Calendar Sync" section:
  - Show the `.ics` URL with a copy button
  - Instructions: "Paste this URL into Google Calendar > Other calendars > From URL"
  - "Regenerate" button to invalidate the old URL

**Done when:** Copying the `.ics` URL into Google Calendar shows the user's task due dates as events.

---

## [ ] D9 — Docs / Wiki

**Why:** Project documentation, meeting notes, and SOPs currently live elsewhere (Notion, Confluence, Google Docs) and are disconnected from tasks.

**Backend:**
- New model:
  ```python
  class Doc(models.Model):
      project   = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='docs')
      title     = models.CharField(max_length=300)
      content   = models.TextField(blank=True)  # Markdown or rich text
      created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
      created_at = models.DateTimeField(auto_now_add=True)
      updated_at = models.DateTimeField(auto_now=True)
  ```
- Endpoints: `GET/POST /api/docs/`, `GET/PATCH/DELETE /api/docs/{id}/`
- Run `makemigrations && migrate`

**Frontend:**
- **New page:** `frontend/src/pages/DocDetailPage.tsx` — rich text editor (use `@uiw/react-md-editor` or `react-quill`, add to `package.json`)
- `frontend/src/pages/ProjectDetailPage.tsx` — new "Docs" tab listing project docs with `+ New Doc` button

**Done when:** A project can have docs written in a rich text editor and listed in the project detail.

---

## [ ] D10 — Import from Other Tools

**Why:** New teams switching from Jira, Trello, or Asana have to manually recreate all their work. Import unlocks adoption.

**Backend:**
- **File to create:** `clickpm/pm/services/import_service.py`
  - `import_from_csv(file, project_id, user)` — maps CSV columns to Task fields, creates tasks in bulk
  - Column mapping: `title`, `description`, `status`, `priority`, `assignee_email`, `due_date`, `tags`
- **File to create:** `clickpm/pm/views/import_views.py`
  - `POST /api/import/csv/` — accepts multipart file upload + project_id
  - Returns: `{ "imported": 45, "skipped": 2, "errors": ["Row 5: invalid date format"] }`
- Add to router

**Frontend:**
- `frontend/src/pages/ProjectDetailPage.tsx` (settings tab) — "Import" section:
  - File upload dropzone for CSV
  - Column mapping table (map CSV column → task field)
  - Preview first 5 rows before confirming
  - Import progress and result summary

**Done when:** Uploading a CSV file creates tasks in a project with a preview and result report.

---

---

# TRACK DOCS — Project Documentation
*Written documents stored in `docs/` folder. Create these as Markdown files.*

---

## [ ] DOC1 — Business Requirements Document (BRD)

**File to create:** `docs/BRD.md`

**What to include:**

```markdown
# Business Requirements Document — CuriousPMO

## 1. Project Overview
- Product name, purpose, target users, business goals

## 2. Stakeholders
- Owner / client, development team, end users, admins

## 3. Business Objectives
- What problems this product solves
- Success metrics (e.g., "50 active teams within 6 months")

## 4. Scope
- In-scope features (what we are building)
- Out-of-scope (what we are NOT building in v1)

## 5. User Roles & Permissions
- Workspace Owner, Workspace Admin, Project Member, Guest, Superuser

## 6. Functional Requirements
- One paragraph per major feature area: Workspace, Project, Sprint, Task, Kanban, Gantt, Notifications, etc.

## 7. Non-Functional Requirements
- Performance: API response < 500ms for list endpoints
- Security: JWT auth, RBAC, no anonymous access
- Availability: 99.5% uptime target

## 8. Constraints & Assumptions
- Tech stack is fixed (Django + React)
- PostgreSQL for production

## 9. Acceptance Criteria
- High-level checklist for each major feature
```

**Done when:** `docs/BRD.md` exists and covers all 9 sections above.

---

## [ ] DOC2 — Software Requirements Specification (SRS)

**File to create:** `docs/SRS.md`

**What to include:**

```markdown
# Software Requirements Specification — CuriousPMO

## 1. Introduction
- Purpose, scope, definitions, abbreviations

## 2. System Overview
- Architecture diagram (text-based), tech stack summary

## 3. Data Models
- Entity descriptions with fields and relationships
  (copy the relevant sections from docs/BACKEND_CODEBASE_OVERVIEW.md as a starting point)

## 4. API Specification
- For each endpoint: method, URL, request body, response schema, auth required, permissions
  (copy and expand from docs/API_ENDPOINTS.md)

## 5. Frontend Pages & Components
- For each page: route, purpose, API calls it makes, user interactions

## 6. Business Logic Rules
- Auto-completion chain (Task → Sprint → Milestone → Project)
- Health status calculation thresholds
- Permission hierarchy rules
- Notification triggers

## 7. Security Requirements
- JWT token lifetimes, rotation policy
- CORS policy
- Input validation rules

## 8. Integration Requirements
- Socket.io events schema
- GitHub/GitLab webhook format (when D6 is done)
- iCal feed format (when D8 is done)

## 9. Error Handling
- HTTP error codes used and what they mean in this system
- Frontend error boundary behavior
```

**Done when:** `docs/SRS.md` exists and is detailed enough for a new developer to understand the system without reading the code.

---

## [ ] DOC3 — Work Order Template

**File to create:** `docs/WORK_ORDER_TEMPLATE.md`

**What to include:**

```markdown
# Work Order — CuriousPMO

## Work Order #: [WO-XXXX]
## Date: [YYYY-MM-DD]
## Requested By: [Name]
## Assigned To: [Developer name]
## Priority: [Low / Medium / High / Critical]

---

## 1. Summary
One paragraph describing what needs to be built or fixed.

## 2. Background / Context
Why this work is needed. Link to BRD section or user complaint if applicable.

## 3. Scope of Work
- [ ] Specific deliverable 1
- [ ] Specific deliverable 2
- [ ] ...

## 4. Technical Approach
Which files will change. Backend / Frontend split. Any new dependencies.

## 5. Out of Scope
Explicitly list what this work order does NOT cover.

## 6. Acceptance Criteria
- [ ] Criterion 1 (testable, specific)
- [ ] Criterion 2
- [ ] ...

## 7. Estimated Effort
Backend: X hours
Frontend: X hours
Testing: X hours
Total: X hours

## 8. Dependencies
- Blocked by: [other WO or step from ROADMAP.md]
- Blocking: [what this unlocks]

## 9. Sign-off
- [ ] Developer completed
- [ ] Tested by
- [ ] Approved by
```

**Done when:** `docs/WORK_ORDER_TEMPLATE.md` exists. Copy it for each new work order as `docs/work-orders/WO-0001.md`, `WO-0002.md`, etc.

---

## [ ] DOC4 — API Reference Documentation

**File to create:** `docs/API_REFERENCE.md`

**What to include:** Full endpoint reference with examples. Expand the existing `docs/API_ENDPOINTS.md`.

For each endpoint include:
```
### GET /api/tasks/
**Auth:** Bearer token required
**Permissions:** Project member or workspace admin
**Query params:**
  - project (int) — filter by project
  - status (string) — filter by status
  - assignee (int) — filter by user ID
**Response 200:**
  { "count": 25, "results": [{ "id": 1, "title": "...", "status": "In Progress", ... }] }
**Response 403:**
  { "detail": "You do not have permission to perform this action." }
```

Cover all 40+ endpoints. Include authentication flow (`/api/auth/login/`, `/api/auth/refresh/`).

**Done when:** `docs/API_REFERENCE.md` has every endpoint documented with request/response examples.

---

## [ ] DOC5 — User Guide

**File to create:** `docs/USER_GUIDE.md`

**What to include:**

```markdown
# CuriousPMO User Guide

## Getting Started
- Creating an account
- Creating your first workspace
- Inviting team members

## Managing Projects
- Creating a project (visibility settings, members)
- Project lifecycle: Not Started → In Progress → Done

## Milestones, Sprints & Tasks
- How the hierarchy works (diagram)
- Creating milestones and setting date ranges
- Adding tasks to sprints
- Task priorities and statuses explained

## Views
- **Kanban**: Drag tasks between columns to update status
- **Gantt**: Timeline view, drag to reschedule
- **Dashboard**: Reading progress metrics and health indicators

## Collaboration
- @mentioning teammates in comments
- File attachments
- Notification types and what triggers them

## Tips & Shortcuts
- Keyboard shortcuts (from B9)
- Cmd+K command palette (from B2)
- Bulk status updates (from A10)

## Roles & Permissions Reference
- Table: what each role can do
```

**Done when:** `docs/USER_GUIDE.md` covers all major features in non-technical language.

---

---

# Notes for Future Claude Sessions

**Before starting any step:**
1. Read this file and find the first `[ ]` in the chosen track
2. Read the relevant source files listed in the step block before writing code
3. Check the "Dependencies" note below if the step has prerequisites

**Backend rules:**
- Always `cd clickpm` before Django commands
- `makemigrations && migrate` after every model change
- Business logic goes in `clickpm/pm/services/` — not in views or models
- Call audit service (`audit_service.py`) for every data mutation

**Frontend rules:**
- Path alias `@/` = `frontend/src/`
- Server state → TanStack Query; UI/auth state → Redux Toolkit
- API calls only via `frontend/src/api/` — never inline axios in components
- MUI v5 for components; Tailwind for layout utilities only
- Already installed: `chart.js`, `react-chartjs-2`, `socket.io-client`

**Step dependencies:**
- B10 (time tracking UI) requires C6 (time tracking fields) first
- B4 (socket.io) requires checking if Django has WebSocket support first
- D7 (velocity reports) is easier after A8 (burndown) is done
- D6 (GitHub integration) requires D5 (guest access) permissions to be solid first
- B2 (command palette) before B9 (keyboard shortcuts)
- DOCS can be written at any time — no code dependencies
