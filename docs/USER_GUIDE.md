# CuriousPMO User Guide

> This guide covers all major features in non-technical language. The same content is available in-app at **Help** in the sidebar navigation.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Workspaces & Members](#workspaces--members)
3. [Projects](#projects)
4. [Milestones, Sprints & Tasks](#milestones-sprints--tasks)
5. [Views](#views)
6. [Collaboration](#collaboration)
7. [Time Tracking](#time-tracking)
8. [Automation & Custom Fields](#automation--custom-fields)
9. [Calendar Sync & Git Integration](#calendar-sync--git-integration)
10. [Importing from Other Tools](#importing-from-other-tools)
11. [Tips & Keyboard Shortcuts](#tips--keyboard-shortcuts)
12. [Roles & Permissions](#roles--permissions)

---

## Getting Started

### Creating an account

Go to the login page and click **Register**. Fill in your username, email, and password. Your account is created immediately.

> **Tip:** Use a real email address — it's used for assignee matching during CSV imports.

### Creating your first workspace

Navigate to **Workspaces** in the sidebar → click **New Workspace**. Give it a name (e.g. "Acme Corp") and an optional description. You become the workspace owner automatically.

### Inviting team members

Open a workspace → **Members** tab → **Invite Member**. Search by username or email. You can invite as a regular member or as a **Guest** (limited to explicitly granted projects only).

### The hierarchy at a glance

```
Workspace
  └── Project
        └── Milestone
              └── Sprint
                    └── Task
                          └── Subtask / Comment / Checklist
```

---

## Workspaces & Members

### Workspace settings

Open a workspace → **Settings** tab to rename it, change its description, or delete it. Only owners and admins see this tab.

### Guest access

Guests are external collaborators who should only see specific projects. They cannot see the Members or Settings tabs, and only see projects explicitly shared with them.

---

## Projects

### Creating a project

Go to **Projects** → **New Project**. Set a name, description, visibility (*public* = all workspace members; *private* = only project members), start/end dates, and initial status.

### Project lifecycle

`Planning` → `Active` → `On Hold` → `Completed` → `Cancelled`

Change status from **⋮ → Edit Project** in the project header.

### Health status

Each project and milestone gets an automatic health badge:

| Badge | Meaning |
|-------|---------|
| 🟢 On Track | Completion is on schedule |
| 🟡 At Risk | Minor delays detected |
| 🔴 Behind | Significant delays |
| ⛔ Critical | Project is severely behind |

### Custom task statuses

Project Settings → **Custom Task Statuses** → define statuses with custom colours. Mark one as the "done" state. These replace the default statuses on the Kanban board for that project.

### Exporting tasks

Project Overview → **Export** → choose CSV or Excel.

---

## Milestones, Sprints & Tasks

### Creating milestones

Project → **Milestones** tab → **+ Add Milestone**. Set name, description, and date range.

### Adding sprints

Expand a milestone → **+ Add Sprint**. Give the sprint a name and date range. The burndown chart tracks remaining tasks against sprint days.

### Creating tasks

- Project Overview → click **+ Add task** at the bottom of the task list
- Sprint detail → **+ Add Task** button
- Kanban board → **+** at the bottom of any column
- `Cmd/Ctrl + K` → type "New task"

### Task fields

| Field | Description |
|-------|-------------|
| Title | Required. Short name for the task. |
| Status | To-do → In Progress → Review → Done |
| Priority | Low / Medium / High / Critical |
| Assignees | Multiple team members can be assigned |
| Due Date | Shown as overdue in red if past due |
| Estimated / Logged Hours | Set estimate; log time via the Time tab |
| Tags | Colour-coded labels shared workspace-wide |
| Subtasks | Nested tasks with a progress bar on the parent |
| Checklist | Step-by-step items within the task |
| Recurrence | Daily/weekly/monthly — auto-creates on completion |
| Watchers | Notified on any change even if not assigned |

### Bulk status updates

On the project Overview tab, tick checkboxes → a floating toolbar appears → click **Mark Done**, **In Progress**, or **Review**.

### Task dependencies

Open a task → **Dependencies** tab → add a "blocked by" or "blocks" relationship. Blocked tasks show a red **Blocked** badge.

### Custom fields

Project Settings → **Custom Fields** → add text, number, date, dropdown, checkbox, or URL fields.

---

## Views

### Kanban Board

Go to **Kanban Board**. Filter by project using the dropdown. Drag cards between columns to update status.

### Gantt Chart

Go to **Gantt Chart**. Select a project to see milestones and sprints on a timeline. Drag bars to shift dates; drag the right edge to extend or shorten.

### Dashboard

Shows: your assigned tasks, upcoming deadlines, team workload, active sprints, project health, and a 12-week task completion trend chart.

### Workload View

Shows per-member task breakdown (total, in-progress, overdue, completion rate). Use this to spot overloaded team members before sprint planning.

### Project Reports tab

Inside a project → **Reports** tab:

- **Sprint Velocity** — planned vs completed for the last 6 sprints
- **Cumulative Flow** — running total of created vs done over 60 days
- **Cycle Time** — average days from creation to Done, plus a histogram

---

## Collaboration

### Comments & @mentions

Open a task → **Comments** tab → type your message. Use **@username** to mention a team member — they receive an in-app notification.

### File attachments

Open a task → **Attachments** tab → drag a file or click **Upload**.

### Notifications

You receive a notification when:
- A task is assigned to you
- Someone @mentions you in a comment
- A task you're watching changes status
- A task you own is overdue

### Activity log

Project → **Activity** tab — full audit trail of every change.

### Goals / OKRs

Go to **Goals** to create workspace-level Objectives and Key Results. Link goals to projects to pull in task completion progress automatically.

---

## Time Tracking

### Logging time

Open a task → **Time** tab → enter hours and optional note → **Log Time**.

### Estimated vs actual

Set **Estimated Hours** when creating/editing a task. The task detail shows a utilisation bar comparing logged vs estimated.

### Time tracking summary

Dashboard → *Time Tracking Summary* widget shows estimated vs logged hours per project and a utilisation percentage.

---

## Automation & Custom Fields

### Creating an automation rule

Project → Settings → **Automation Rules** → **Add Automation Rule**.

**Triggers:** Status Change, Task Created, Assignee Changed, Due Date Passed  
**Actions:** Send Notification, Change Status, Change Priority, Assign To

### Task templates

Any task → **⋮ → Save as Template**. Templates capture title, description, checklist, and custom field defaults.

---

## Calendar Sync & Git Integration

### Calendar sync (iCal)

Profile → **Calendar Sync** tab → **Generate Calendar URL** → copy the `.ics` URL.

- **Google Calendar:** + Other Calendars → From URL → paste → Add calendar
- **Outlook:** Add Calendar → Subscribe from web → paste URL → Import

### GitHub / GitLab integration

Workspace → **Integrations** tab → **Add Integration**. Copy the webhook URL into your repository's webhook settings. Enable **push** and **pull_request** events.

Any commit or PR mentioning `CUR-123` automatically creates a Git link on that task. Merging a PR moves the task to **Review** status.

---

## Importing from Other Tools

Project → Settings → **Import Tasks from CSV**.

1. Select a target sprint and upload your CSV file
2. Review and adjust column → field mappings; preview first 5 rows
3. Click **Confirm Import**

**Supported fields:** title, description, status, priority, assignee (by email), due date, tags

---

## Tips & Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/⌘ + K` | Open command palette |
| `Ctrl/⌘ + N` | New task |
| `Ctrl/⌘ + F` | Global search |
| `Ctrl/⌘ + D` | Go to Dashboard |
| `Ctrl/⌘ + P` | Go to Projects |
| `Ctrl/⌘ + G` | Go to Gantt |
| `Ctrl/⌘ + Shift + D` | Toggle dark mode |
| `Escape` | Close dialog / modal |

### Quick tips

- Click a task title in any list to open the full detail modal without leaving the page
- In the project Overview tab, click "+ Add task" to inline-create a task
- Health badges update automatically every time a task or milestone is saved
- Use URL query params to share a specific tab: `/projects/5?tab=3`
- The Workload page shows per-day task distribution — use it before sprint planning

---

## Roles & Permissions

| Action | Owner | Admin | Member | Guest |
|--------|-------|-------|--------|-------|
| Delete workspace | ✓ | — | — | — |
| Manage members | ✓ | ✓ | — | — |
| View member list | ✓ | ✓ | ✓ | — |
| Create projects | ✓ | ✓ | ✓ | — |
| View public projects | ✓ | ✓ | ✓ | — |
| View private projects | member only | member only | member only | if granted |
| Create / edit tasks | ✓ | ✓ | ✓ | ✓* |
| Manage workspace settings | ✓ | ✓ | — | — |
| Manage Git integrations | ✓ | ✓ | — | — |

\* Guests can create and edit tasks only in projects they have explicit access to.

---

*CuriousPMO User Guide — all features documented as of the current build.*
