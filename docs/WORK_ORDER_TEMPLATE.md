# Work Order Template — CuriousPMO

> Copy this file to `docs/work-orders/WO-XXXX.md` for each new work order.  
> Fill in every section before assigning to a developer.

---

## Work Order #: [WO-XXXX]

| Field | Value |
|-------|-------|
| **Date** | [YYYY-MM-DD] |
| **Requested By** | [Name / Role] |
| **Assigned To** | [Developer Name] |
| **Priority** | Low / Medium / High / Critical |
| **Target Sprint** | [Sprint name or "Backlog"] |
| **Estimated Completion** | [YYYY-MM-DD] |
| **Status** | Draft / In Progress / In Review / Done |

---

## 1. Summary

*One paragraph describing what needs to be built or fixed. Be specific — avoid "improve X" in favour of "add Y to screen Z so that user can do W".*

---

## 2. Background / Context

*Why this work is needed. Link to BRD section, ROADMAP step, or a specific user complaint if applicable.*

Related documents:
- BRD section: §[section number]
- ROADMAP step: [A1 / B3 / C7 / …]
- Issue / ticket: [link or N/A]

---

## 3. Scope of Work

*Specific, testable deliverables. Each item should map to a file change or a user-visible outcome.*

**Backend**
- [ ] [e.g. Add `foo` field to `Task` model and run `makemigrations && migrate`]
- [ ] [e.g. Expose `foo` in `TaskSerializer`]
- [ ] [e.g. Add endpoint `GET /api/tasks/{id}/foo/`]

**Frontend**
- [ ] [e.g. Show `foo` in `TaskDetailModal.tsx` below the priority field]
- [ ] [e.g. Add `getFoo` query to `src/api/taskApi.ts`]

**Tests**
- [ ] [e.g. Add unit test for the new serializer field]
- [ ] [e.g. Verify UI shows correct value in a browser smoke-test]

---

## 4. Technical Approach

*Which files will change. Backend / frontend split. Any new packages required.*

**Files to modify:**
```
clickpm/pm/models/task_models.py     — add field
clickpm/pm/serializers/...           — expose field
clickpm/pm/views/task_views.py       — add action
frontend/src/api/taskApi.ts          — add hook
frontend/src/components/TaskDetailModal.tsx — render field
```

**New dependencies (if any):**
- `some-package==1.2.3` (add to `requirements.txt` / `package.json`)

**Migration required:** Yes / No

**New route required:** Yes (`/new-route`) / No

---

## 5. Out of Scope

*Explicitly list what this work order does NOT cover. Prevents scope creep.*

- [e.g. Bulk update of the new field across tasks]
- [e.g. Exposing the new field in the CSV export]
- [e.g. Mobile responsive layout changes]

---

## 6. Acceptance Criteria

*Each criterion must be independently testable. Avoid "works correctly" — describe exact behaviour.*

- [ ] `GET /api/tasks/{id}/` response includes `foo` field
- [ ] `PATCH /api/tasks/{id}/` with `{"foo": "value"}` persists the change
- [ ] `TaskDetailModal` displays the `foo` field; an empty value shows "—"
- [ ] A user without project membership receives 403 on the new endpoint
- [ ] `makemigrations` produces exactly one new migration file
- [ ] `npm run build` completes without TypeScript errors

---

## 7. Estimated Effort

| Area | Hours |
|------|-------|
| Backend | |
| Frontend | |
| Testing | |
| Documentation | |
| **Total** | |

---

## 8. Dependencies

| Type | Description |
|------|-------------|
| Blocked by | [Other WO number or ROADMAP step that must complete first] |
| Blocking | [What this work order unlocks] |
| Parallel | [Other WO that can run at the same time] |

---

## 9. Sign-off

| Step | Person | Date |
|------|--------|------|
| Developer completed | | |
| Tested by | | |
| Approved by | | |

---

## 10. Notes & Change Log

| Date | Author | Note |
|------|--------|------|
| [YYYY-MM-DD] | [Name] | Initial draft |

---

---

# Example Work Orders

The following completed examples show how to fill in this template.

---

## WO-0001 — Guest Access (D5)

| Field | Value |
|-------|-------|
| **Date** | 2026-05-01 |
| **Requested By** | Product Owner |
| **Assigned To** | rafiul |
| **Priority** | High |
| **Target Sprint** | D-track |
| **Status** | Done |

### Summary

Add a `is_guest` flag to `WorkspaceMember`. Guests may only access projects they are explicitly assigned to via `WorkspaceProjectAccess`. The sidebar hides members and settings tabs for guest users.

### Scope of Work

**Backend**
- [x] Add `is_guest = BooleanField(default=False)` to `WorkspaceMember`
- [x] Update `permission_helpers.py` to filter project list for guests
- [x] Update `WorkspaceMemberSerializer` to expose `is_guest`

**Frontend**
- [x] Show "Invite as Guest" toggle in the invite dialog on `WorkspaceDetailPage`
- [x] Hide Members/Settings tabs in `WorkspaceDetailPage` for guest users
- [x] Show `Guest` chip in `NavSidebar` when all memberships are guest

### Acceptance Criteria

- [x] A guest logging in sees only their explicitly granted projects
- [x] A guest sees no Members or Settings tabs in any workspace
- [x] The `WorkspaceMember` record has `is_guest: true` in the API response

---

## WO-0002 — Calendar Sync / iCal (D8)

| Field | Value |
|-------|-------|
| **Date** | 2026-05-10 |
| **Requested By** | Product Owner |
| **Assigned To** | rafiul |
| **Priority** | Medium |
| **Status** | Done |

### Summary

Generate a personal iCal feed URL for each user. Tasks assigned to the user with a due date appear as calendar events. The URL is authenticated via a long-lived token stored on the User model.

### Acceptance Criteria

- [x] `POST /api/users/calendar-token/` generates a token and stores it on the user
- [x] `GET /api/users/calendar.ics?token=…` returns valid RFC 5545 VCALENDAR content
- [x] Profile page shows the URL with a copy button and a regenerate button
- [x] Pasting the URL into Google Calendar "From URL" shows task due dates
