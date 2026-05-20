# Business Requirements Document — CuriousPMO

**Version:** 1.0  
**Date:** 2026-05-20  
**Status:** Approved  

---

## 1. Project Overview

**Product Name:** CuriousPMO (internally also referred to as ClickPM)

**Purpose:** CuriousPMO is a web-based project management platform that provides teams with a centralised space to plan, track, and deliver work. It combines task management, agile sprint planning, milestone tracking, team collaboration, and reporting in a single product.

**Target Users:**
- Small-to-medium software development teams (5–100 members)
- Project managers and team leads managing multiple concurrent projects
- External stakeholders and contractors who need read-limited access (Guest role)
- Organisations that want a self-hosted alternative to ClickUp, Jira, or Asana

**Business Goals:**
- Reduce context-switching by consolidating project data, communication, and reporting in one tool
- Improve sprint predictability through velocity tracking and health status indicators
- Enable enterprise adoption by supporting guest access, custom fields, automation rules, and data export
- Provide a deployable, open platform that organisations can run on their own infrastructure

---

## 2. Stakeholders

| Role | Name / Group | Responsibility |
|------|-------------|----------------|
| Product Owner | ADN Diginet | Defines requirements, accepts deliverables |
| Development Team | rafiul + Claude Code | Designs and implements the product |
| End Users — PM | Project Managers | Day-to-day project planning and tracking |
| End Users — Dev | Developers / Contributors | Task execution, time logging, git integration |
| End Users — Guest | External Contractors / Clients | Review-only access to specific projects |
| System Admin | Workspace Owner | Manages members, billing, integrations |

---

## 3. Business Objectives

### Problems This Product Solves

| Problem | Solution |
|---------|----------|
| Teams use 3–5 disconnected tools (Trello, Jira, Confluence, Slack, Google Sheets) | Single platform covering tasks, docs, reporting, and communication |
| Sprint planning has no baseline data | Velocity chart, cycle time, burndown chart per sprint |
| Project health is invisible until it is too late | Automatic health status (On Track / At Risk / Behind / Critical) updated on every task save |
| External collaborators get full workspace access or none | Guest role: scoped access to explicitly shared projects only |
| Repetitive task setup (bug reports, onboarding checklists) | Task templates with default checklists, tags, and custom fields |
| Task due dates are not visible in team calendars | iCal feed: subscribable URL for Google Calendar and Outlook |

### Success Metrics

| Metric | Target |
|--------|--------|
| Active workspaces at 6 months | 50+ |
| Tasks created per active workspace per week | 20+ |
| Average daily active users per workspace | ≥ 60% of members |
| API response time (list endpoints, p95) | < 500 ms |
| Zero critical security incidents in first year | 0 |

---

## 4. Scope

### In-Scope (v1.0)

- **Authentication:** JWT-based login, registration, forgot-password flow
- **Workspaces:** Create/manage workspaces; invite members with role assignment (Owner, Admin, Member, Guest)
- **Projects:** Full project lifecycle (Planning → Active → On Hold → Completed → Cancelled); public/private visibility
- **Hierarchy:** Workspace → Project → Milestone → Sprint → Task → Subtask / Checklist / Comment
- **Task Management:** Status, priority, multiple assignees, due dates, tags, custom fields, dependencies, watchers, recurrence, time tracking
- **Views:** Kanban board (drag-and-drop, custom statuses), Gantt chart (drag to reschedule), Workload view, Dashboard
- **Reporting:** Sprint burndown, velocity chart, cumulative flow diagram, cycle time histogram
- **Collaboration:** Comments with @mentions, file attachments, in-app notifications, activity log
- **Automation:** Configurable trigger/action rules per project
- **Integrations:** GitHub/GitLab webhook (commit → task link, PR merge → status update), iCal calendar sync
- **Docs/Wiki:** Per-project markdown documents with live preview editor
- **Import/Export:** CSV import (with column mapping), CSV/Excel export
- **Goals / OKRs:** Workspace-level goals linked to project completion metrics
- **Templates:** Reusable task templates with checklists and default field values
- **Help:** Full in-app user guide

### Out of Scope (v1.0)

- Native mobile apps (iOS / Android)
- Billing, subscription management, or paid tiers
- Single Sign-On (SSO / SAML / OAuth with Google or GitHub)
- AI-powered task suggestions or automated prioritisation
- Gantt critical-path analysis
- Offline mode / PWA
- Video conferencing or screen sharing
- Portfolio-level reporting across workspaces

---

## 5. User Roles & Permissions

| Action | Owner | Admin | Member | Guest |
|--------|:-----:|:-----:|:------:|:-----:|
| Delete workspace | ✓ | — | — | — |
| Manage workspace settings | ✓ | ✓ | — | — |
| Manage workspace members | ✓ | ✓ | — | — |
| View member list | ✓ | ✓ | ✓ | — |
| Create / delete projects | ✓ | ✓ | ✓ | — |
| View all public projects | ✓ | ✓ | ✓ | — |
| View private projects | member only | member only | member only | if granted |
| Manage project settings | ✓ | ✓ | project admin | — |
| Create / edit tasks | ✓ | ✓ | ✓ | ✓ * |
| Delete tasks | ✓ | ✓ | ✓ | — |
| Configure automation rules | ✓ | ✓ | project admin | — |
| Manage git integrations | ✓ | ✓ | — | — |
| Export data | ✓ | ✓ | ✓ | — |
| Import CSV | ✓ | ✓ | project admin | — |

\* Guests can create and edit tasks only in projects they have explicit access to.

**Role definitions:**
- **Owner** — One per workspace. Full control including workspace deletion and ownership transfer.
- **Admin** — Can manage members and all projects. Cannot delete the workspace.
- **Member** — Can participate in all public projects and any private projects they are added to.
- **Guest** — External collaborator. Access is limited to projects explicitly shared with them. Cannot see the member list, workspace settings, or other projects.

---

## 6. Functional Requirements

### 6.1 Authentication & User Management

Users authenticate with a username/email and password. The system issues short-lived JWT access tokens (60 minutes) with a rotating refresh token (24 hours). Password reset is available via a forgot-password flow. Each user has a profile page showing their assignments, time logs, and calendar sync URL.

### 6.2 Workspaces

A workspace is the top-level organisational unit. Each user can belong to multiple workspaces with different roles. Workspace owners can rename, describe, or delete the workspace. Admins can invite and remove members. The workspace integrations tab connects GitHub/GitLab repositories for webhook-based task linking.

### 6.3 Projects

Projects belong to a workspace. Each project has a name, description, visibility (public / private), status, start/end dates, and an automatically-calculated health status. Private projects are invisible to users who are not explicitly added as project members. Projects support custom task statuses, custom fields, automation rules, docs, milestones, and CSV import/export.

### 6.4 Milestones & Sprints

Milestones group related sprints and have a date range and health status. Sprints belong to milestones and have start/end dates. The burndown chart tracks daily remaining tasks against the ideal line. Completing all tasks in a sprint auto-completes the sprint; completing all sprints in a milestone auto-completes the milestone; completing all milestones auto-completes the project.

### 6.5 Tasks

Tasks are the atomic unit of work. Each task has a title, description (Markdown), status, priority, multiple assignees, due date, estimated and actual hours, tags, subtasks, checklists, file attachments, comments, watchers, custom field values, task dependencies (blocks / is blocked by), recurrence settings, and git links. Tasks belong to a sprint; subtasks inherit their parent's project and sprint.

### 6.6 Kanban Board

The Kanban board shows tasks as cards grouped into columns by status. Columns are driven by the selected project's custom statuses (or the global defaults if no custom statuses are defined). Cards can be dragged between columns to change status, and reordered within a column to update position. The board supports inline task creation via a `+ Add task` input at the bottom of each column.

### 6.7 Gantt Chart

The Gantt chart shows milestones and sprints as horizontal bars on a time axis. Bars can be dragged to shift dates or resized by dragging the right edge to extend or shorten duration.

### 6.8 Dashboard

The dashboard is the home page after login. It shows: tasks assigned to the current user, upcoming deadlines, team workload summary, active sprint progress, project health overview, and a 12-week task completion trend chart. A time tracking summary widget displays estimated vs. logged hours per project.

### 6.9 Workload View

The workload page shows per-member task counts (total, in-progress, overdue) and completion rates. It is used for capacity planning before sprint planning sessions.

### 6.10 Notifications

Notifications are generated when: a task is assigned to a user, a user is @mentioned in a comment, a watched task changes status, a task deadline passes, or a project/sprint/milestone health degrades. Notifications are delivered in-app (bell icon) and via real-time Socket.io events.

### 6.11 Activity Log

Every data mutation (task created, status changed, assignee updated, comment added, etc.) is recorded in an immutable activity log. The log includes the actor, timestamp, before/after values, and the associated workspace and project. It is accessible per-project on the Activity tab.

### 6.12 Search

The global search endpoint accepts a query string and returns matching tasks, projects, and users. The command palette (Ctrl+K / Cmd+K) uses the same API for quick navigation.

### 6.13 Goals / OKRs

Goals are workspace-level objectives with one or more key results (targets). Each target has a type (task completion %, number, or currency) and an optional linked project. When target type is "task completion", the current value is automatically derived from the linked project's completion percentage.

### 6.14 Automation Rules

Each project can define automation rules consisting of a trigger (status change, task created, assignee changed, due date passed) and an action (send notification, change status, change priority, assign to). Rules are evaluated server-side on every task save.

### 6.15 Git Integration

Workspace owners and admins can connect a GitHub or GitLab repository. A webhook URL is provided to paste into the repository settings. Incoming webhook events are parsed for task ID references (`CUR-123` format). Matching tasks receive a git link record with PR URL, commit SHA, and status. Merging a PR auto-moves the linked task to "In Review".

### 6.16 Calendar Sync

Each user can generate a personal iCal feed URL. The URL is authenticated via a long-lived read-only token (not a JWT). The feed returns all tasks assigned to the user as RFC 5545 VEVENT records with DTSTART and DTEND set to the task due date. The token can be regenerated to invalidate the old URL.

### 6.17 Docs / Wiki

Each project can contain multiple markdown documents. Documents have a title and content edited in a live-preview markdown editor. Documents are listed on the project Docs tab with a creation timestamp and last-updated timestamp. Clicking a document opens the full editor view.

### 6.18 Import from CSV

A project admin can upload a CSV file to create tasks in bulk. The import UI shows the CSV headers, allows mapping each header to a task field, and previews the first five data rows before confirming. The server returns a summary of imported, skipped, and errored rows.

### 6.19 Export

Tasks can be exported from any project or the global task list in CSV or Excel (.xlsx) format. The export respects the current filter state (status, assignee, sprint, tag).

### 6.20 Task Templates

Workspace-level templates capture a task title pattern, description, default priority, checklist items, and custom field defaults. Any task creation dialog can load a template to pre-fill fields. Templates are managed in the workspace settings.

---

## 7. Non-Functional Requirements

### Performance

| Scenario | Target |
|----------|--------|
| List API endpoints (tasks, projects) | p95 < 500 ms |
| Task detail with nested data (comments, checklist, subtasks) | p95 < 800 ms |
| Dashboard (aggregated data) | p95 < 1 000 ms |
| Frontend initial load (production build, cached assets) | < 2 s |
| Gantt page with 200 milestones/sprints | Renders within 3 s |

### Security

- All protected API endpoints require a valid JWT Bearer token
- Role-based access control enforced at the view layer; never rely on frontend hiding alone
- Guest users cannot access any data beyond their explicitly granted projects — enforced in the permission helper
- Webhook payloads validated with HMAC signature check using the stored `webhook_secret`
- iCal token is read-only, scoped to a single user, and does not grant API access
- Passwords are hashed with Django's default PBKDF2-SHA256 algorithm
- CORS restricted to the frontend origin in production

### Availability & Reliability

- Target uptime: 99.5% (excluding planned maintenance)
- Database: PostgreSQL 15 in production; SQLite permitted for local development only
- All background jobs (recurring task creation, deadline notifications) run as management commands or Celery tasks on a schedule

### Maintainability

- Backend business logic lives exclusively in `pm/services/` — views delegate to services
- All mutations are audited via `audit_service.py`; views must not bypass the audit trail
- Frontend API calls are centralised in `src/api/`; no inline axios calls in components
- Server state is managed with TanStack Query; UI/auth state uses Redux Toolkit

### Scalability

- The system is designed for single-workspace deployments of up to 500 concurrent users
- Multi-workspace setups can serve more users but have not been load-tested
- Horizontal scaling requires a shared PostgreSQL instance and a shared Redis instance for Socket.io

---

## 8. Constraints & Assumptions

### Constraints

- **Tech stack is fixed:** Django 4.2 + Django REST Framework (backend); React 18 + TypeScript + Vite + MUI v5 (frontend)
- **Database:** PostgreSQL 15 in production; no ORM changes that break PostgreSQL compatibility
- **Authentication:** SimpleJWT only — no OAuth, SSO, or social login in v1
- **File storage:** Local filesystem in v1 (file attachment uploads stored on the server); S3 or equivalent is a future upgrade
- **Email:** No outbound email is wired in v1; all notifications are in-app only
- **Deployment:** Docker Compose with a single server is the expected deployment model for v1

### Assumptions

- Users have modern browsers (Chrome 110+, Firefox 110+, Safari 16+, Edge 110+)
- The server has at least 2 GB RAM and 2 vCPUs for production deployments
- The team is comfortable maintaining PostgreSQL and Docker
- CSV imports will typically be under 5 000 rows; large imports are not a v1 priority

---

## 9. Acceptance Criteria

### Authentication
- [ ] A user can register with username, email, and password
- [ ] A user can log in and receive a JWT access token and refresh token
- [ ] Accessing a protected route without a token returns 401
- [ ] Token refresh issues a new access token without requiring re-login

### Workspaces & Members
- [ ] A user can create a workspace and is automatically set as owner
- [ ] An owner can invite members by username or email with a specified role
- [ ] A guest can log in and see only the projects they are explicitly invited to
- [ ] A guest cannot see the Members or Settings tabs

### Projects
- [ ] A project can be created with name, description, visibility, and dates
- [ ] Health status updates automatically when a task is saved
- [ ] Changing project status is reflected immediately in the project list

### Milestones, Sprints & Tasks
- [ ] Creating all tasks in a sprint as Done auto-completes the sprint
- [ ] Sprint burndown chart shows ideal vs. actual remaining tasks
- [ ] Blocked tasks (with unfinished dependencies) show a "Blocked" badge

### Views
- [ ] Dragging a Kanban card to a different column updates task status
- [ ] Gantt bars can be dragged to new dates; changes persist on reload
- [ ] The workload view shows per-member task counts across all active sprints

### Collaboration
- [ ] Posting a comment with @username creates a notification for that user
- [ ] Uploading a file attachment to a task makes it downloadable
- [ ] Watching a task sends a notification when its status changes

### Reporting
- [ ] The Reports tab shows a velocity chart for the last 6 sprints
- [ ] Cycle time badge shows average days from In Progress to Done

### Integrations
- [ ] Copying the iCal URL into Google Calendar shows task due dates as events
- [ ] A commit message referencing `CUR-123` creates a git link on that task

### Import / Export
- [ ] Uploading a CSV creates tasks and returns an import summary
- [ ] Clicking Export downloads a file containing all tasks in the current view

### Help
- [ ] The Help page is accessible from the sidebar navigation at `/help`
- [ ] All major features are documented in the in-app guide

---

*CuriousPMO BRD — v1.0 — 2026-05-20*
