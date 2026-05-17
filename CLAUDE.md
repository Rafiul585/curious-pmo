# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Layout

```
curious-pmo/
├── clickpm/        # Django backend
└── frontend/       # React + TypeScript frontend
```

## Planned Features & Roadmap

See **`ROADMAP.md`** (this folder) for the full implementation plan. Five tracks:

| Track | Topic | Steps |
|-------|-------|-------|
| **A** | Health & risk status (backend → frontend) | A1–A10 |
| **B** | Frontend UX improvements | B1–B10 |
| **C** | Must-have missing features (vs. ClickUp) | C1–C10 |
| **D** | Nice-to-have features | D1–D10 |
| **DOCS** | Project documents (BRD, SRS, Work Order, API ref, User Guide) | DOC1–DOC5 |

Always check `ROADMAP.md` before starting any feature work. Find the first unchecked `[ ]` step and implement it.

## Memory Files

Project memory lives in **`.claude/memory/`** — visible in the IDE, version-controlled with the project.

| File | Purpose |
|------|---------|
| `.claude/memory/MEMORY.md` | Index — read this first every session |
| `.claude/memory/project_overview.md` | Stack, what exists, what's missing |
| `.claude/memory/project_roadmap.md` | Roadmap summary and track descriptions |
| `.claude/memory/feedback_git_workflow.md` | Git behaviour rules |

**Rules for Claude:**
- Always read `.claude/memory/MEMORY.md` at the start of every session
- When saving a memory, write to `.claude/memory/` — never to the system `~/.claude` location
- When adding a new memory file: create the `.md` in `.claude/memory/` and add a one-line entry to `.claude/memory/MEMORY.md`
- When updating a memory: edit the relevant file in `.claude/memory/` directly
- Only save memories when the user says "remember this" or explicitly requests it

---

## Git Workflow

**Branch structure:**
```
main          ← stable, production-ready (never commit directly)
  └── dev     ← integration branch (base for all feature work)
        └── feature/A1-health-status-model
        └── feature/B1-fix-mobile-sidebar
        └── feature/C1-subtasks
```

**Every roadmap step follows this exact sequence:**

```bash
# 1. Start from dev
git checkout dev

# 2. Create a feature branch named after the step
git checkout -b feature/B1-fix-mobile-sidebar

# 3. Implement the step

# 4. Commit with a clear message
git add <specific files>
git commit -m "feat: <short description>"

# 5. Merge back into dev and delete the branch
git checkout dev
git merge feature/B1-fix-mobile-sidebar
git branch -d feature/B1-fix-mobile-sidebar

# 6. Mark the step [x] in ROADMAP.md
```

**Rules:**
- Never commit directly to `main` or `dev`
- One feature branch per roadmap step
- Always merge into `dev` when a step is confirmed working
- Mark the step `[x]` in `ROADMAP.md` after merging

---

## Backend (clickpm/)

### Commands

```bash
# Install dependencies
pip install -r requirements.txt

# Apply migrations
python manage.py migrate

# Generate migrations after model changes
python manage.py makemigrations

# Run development server (http://localhost:8000)
python manage.py runserver

# Run all tests
python manage.py test

# Run a single test module
python manage.py test pm.tests.test_task_views

# Create superuser
python manage.py createsuperuser
```

**Docker (recommended for local dev with PostgreSQL):**
```bash
docker-compose up -d          # starts PostgreSQL + Django
docker-compose -f docker-compose.prod.yml up -d   # production (gunicorn)
```

### Tech Stack

- **Python 3.12**, Django 4.2, Django REST Framework 3.14
- **PostgreSQL 15** (production) / SQLite (dev, set via `USE_SQLITE=True` in `.env`)
- **SimpleJWT**: 60-min access tokens, 1-day refresh with rotation + blacklist
- **python-decouple** for env var management (use `.env.example` as template)

### Architecture

All application code lives in the `pm/` Django app. The config package (`clickpm/config/`) contains only settings, URLs, and WSGI/ASGI.

**Layer responsibilities:**

| Layer | Location | Purpose |
|-------|----------|---------|
| Models | `pm/models/` | 11 model files; data definitions only |
| Serializers | `pm/serializers/` | Validation and data transform; separate list/detail/create serializers for complex resources |
| Views | `pm/views/` | DRF ViewSets wired to the router; delegate business logic to services |
| Services | `pm/services/` | All non-trivial business logic (audit, notifications, auto-completion, search, gantt, kanban) |
| Utils | `pm/utils/` | Permission helpers, validators, enums, shared helpers |
| Permissions | `pm/permissions.py` | Custom DRF permission classes |
| Router | `pm/router.py` | Registers all 10 ViewSets; custom actions defined in view files |

**Data hierarchy:**
```
Workspace → WorkspaceMember → WorkspaceProjectAccess
         → Project → ProjectMember
                   → Milestone → Sprint → Task → TaskDependency
                                               → Comment → Attachment
ActivityLog  (global audit trail, read-only via API)
Notification (mention / assignment / deadline events)
```

### Key Patterns

**Auto-completion chain** (`pm/services/auto_completion.py`): When a Task is saved with `status='Done'`, a signal checks whether all sibling tasks are done, then cascades up through Sprint → Milestone → Project, auto-completing each container. This is the only place that directly marks parent objects complete.

**Audit logging** (`pm/services/audit_service.py`): Every mutation dispatches an event that records `user`, `action`, `old_value` (JSON), `new_value` (JSON), and `extra_info` (workspace/project context). Do not log directly from views — call the audit service.

**Permission model** (hierarchical, checked in `pm/utils/permission_helpers.py`):
1. Superuser/staff → full access
2. Workspace owner → full workspace control
3. Workspace admin → manage members and projects
4. Project member → view/edit project
5. Task assignee → view task even on private projects
6. Anonymous → no access

**Polymorphic comments**: `Comment` has a `content_type` + `object_id` generic relation so it can attach to Task, Sprint, or Project.

---

## Frontend (../frontend/)

### Commands

```bash
cd ../frontend

npm install           # install dependencies
npm run dev           # start dev server (http://localhost:5173)
npm run build         # TypeScript check + Vite production build
npm run preview       # preview production build locally
npm run lint          # ESLint on src/**/*.{ts,tsx}
```

### Tech Stack

- React 18 + TypeScript, Vite 5
- **MUI v5** (primary component library) + Tailwind CSS (utility classes)
- **Redux Toolkit** (global state) + **TanStack Query v5** (server state / caching)
- **React Hook Form** + **Zod** (forms and validation)
- **Socket.io-client** (real-time notifications)
- Path alias: `@/` maps to `src/`

### Architecture

```
src/
├── api/          # Axios instances and per-resource API functions
├── components/   # Shared/reusable components
├── pages/        # Route-level page components
├── hooks/        # Custom React hooks
├── store/        # Redux slices and store setup
├── theme/        # MUI theme configuration
└── utils/        # Frontend utilities
```

API calls go through `src/api/` functions (not inline `axios` calls in components). Server state is managed with TanStack Query; UI/auth state lives in Redux.

---

## Environment Variables

Copy `.env.example` → `.env` in `clickpm/` before running the backend. Key vars:

| Variable | Purpose |
|----------|---------|
| `SECRET_KEY` | Django secret key |
| `DEBUG` | `True` for dev, `False` in prod |
| `USE_SQLITE` | `True` to skip PostgreSQL (dev only) |
| `DB_*` | PostgreSQL connection details |
| `DEFAULT_SUPERUSER_*` | Auto-created admin on first run (entrypoint.sh) |
