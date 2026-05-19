import { useState, useMemo } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Chip,
  Divider,
  InputAdornment,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  ExpandMore,
  Search,
  RocketLaunch,
  Workspaces,
  FolderOpen,
  Flag,
  ViewKanban,
  Timeline,
  Dashboard,
  Group,
  Timer,
  Bolt,
  CalendarMonth,
  GitHub,
  Keyboard,
  Security,
  Help,
} from '@mui/icons-material';

interface Section {
  id: string;
  icon: React.ReactNode;
  title: string;
  color: string;
  items: { heading: string; content: React.ReactNode }[];
}

const KBD = ({ children }: { children: React.ReactNode }) => (
  <Box
    component="kbd"
    sx={{
      display: 'inline-block',
      px: 0.75,
      py: 0.25,
      fontSize: '0.8rem',
      fontFamily: 'monospace',
      bgcolor: 'grey.100',
      border: '1px solid',
      borderColor: 'grey.400',
      borderRadius: 0.5,
      boxShadow: '0 1px 0 rgba(0,0,0,.2)',
    }}
  >
    {children}
  </Box>
);

const Tip = ({ children }: { children: React.ReactNode }) => (
  <Alert severity="info" sx={{ mt: 1, mb: 0.5 }}>{children}</Alert>
);

const sections: Section[] = [
  {
    id: 'getting-started',
    icon: <RocketLaunch />,
    title: 'Getting Started',
    color: '#667eea',
    items: [
      {
        heading: 'Creating an account',
        content: (
          <Stack spacing={1}>
            <Typography variant="body2">Go to the login page and click <strong>Register</strong>. Fill in your username, email, and password. Your account is created immediately — no email confirmation required in development.</Typography>
            <Tip>Use a real email address — it's used for assignee matching during CSV imports and may be used for notifications.</Tip>
          </Stack>
        ),
      },
      {
        heading: 'Creating your first workspace',
        content: (
          <Typography variant="body2">
            Navigate to <strong>Workspaces</strong> in the sidebar → click <strong>New Workspace</strong>. Give it a name (e.g. "Acme Corp") and an optional description. You become the workspace owner automatically, with full admin rights.
          </Typography>
        ),
      },
      {
        heading: 'Inviting team members',
        content: (
          <Stack spacing={1}>
            <Typography variant="body2">Open a workspace → <strong>Members</strong> tab → <strong>Invite Member</strong>. Search by username or email. You can invite as a regular member or as a <strong>Guest</strong> (limited to explicitly granted projects only).</Typography>
            <Typography variant="body2">Workspace roles: <strong>Owner</strong> (full control) · <strong>Admin</strong> (manage members & projects) · <strong>Member</strong> (view & edit) · <strong>Guest</strong> (restricted access).</Typography>
          </Stack>
        ),
      },
      {
        heading: 'The hierarchy at a glance',
        content: (
          <Box sx={{ fontFamily: 'monospace', fontSize: '0.85rem', bgcolor: 'grey.50', p: 2, borderRadius: 1, whiteSpace: 'pre' }}>
            {`Workspace\n  └── Project\n        └── Milestone\n              └── Sprint\n                    └── Task\n                          └── Subtask / Comment / Checklist`}
          </Box>
        ),
      },
    ],
  },
  {
    id: 'workspaces',
    icon: <Workspaces />,
    title: 'Workspaces & Members',
    color: '#764ba2',
    items: [
      {
        heading: 'Workspace settings',
        content: (
          <Typography variant="body2">Open a workspace → <strong>Settings</strong> tab to rename it, change its description, or delete it. Only owners and admins see this tab.</Typography>
        ),
      },
      {
        heading: 'Guest access',
        content: (
          <Stack spacing={1}>
            <Typography variant="body2">Guests are external collaborators (contractors, clients) who should only see specific projects. When you invite a member as a Guest, they <em>cannot</em> see the Members or Settings tabs and only see projects that have been explicitly shared with them.</Typography>
            <Tip>To share a project with a guest, go to that project's <strong>Members</strong> tab and add them there.</Tip>
          </Stack>
        ),
      },
    ],
  },
  {
    id: 'projects',
    icon: <FolderOpen />,
    title: 'Projects',
    color: '#f093fb',
    items: [
      {
        heading: 'Creating a project',
        content: (
          <Typography variant="body2">Go to <strong>Projects</strong> → <strong>New Project</strong>. Set a name, description, visibility (<em>public</em> = all workspace members can see it; <em>private</em> = only project members), start/end dates, and initial status.</Typography>
        ),
      },
      {
        heading: 'Project lifecycle',
        content: (
          <Stack spacing={1}>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {['Planning', 'Active', 'On Hold', 'Completed', 'Cancelled'].map((s) => (
                <Chip key={s} label={s} size="small" />
              ))}
            </Stack>
            <Typography variant="body2">Change status from the project detail page's header menu (<strong>⋮ → Edit Project</strong>).</Typography>
          </Stack>
        ),
      },
      {
        heading: 'Health status',
        content: (
          <Stack spacing={1}>
            <Typography variant="body2">Each project (and milestone) gets an automatic health badge calculated from overdue tasks and completion rate:</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip label="On Track" color="success" size="small" />
              <Chip label="At Risk" color="warning" size="small" />
              <Chip label="Behind" color="error" size="small" />
              <Chip label="Critical" size="small" sx={{ bgcolor: '#b71c1c', color: 'white' }} />
            </Stack>
          </Stack>
        ),
      },
      {
        heading: 'Custom task statuses',
        content: (
          <Typography variant="body2">In the <strong>Settings</strong> tab, define project-specific statuses (e.g. "Blocked", "QA") with custom colours. Mark one as the "done" state so CuriousPMO counts it toward completion. These replace the default To-do / In Progress / Review / Done on the Kanban board for that project.</Typography>
        ),
      },
      {
        heading: 'Exporting tasks',
        content: (
          <Typography variant="body2">On the project Overview tab, click <strong>Export</strong> → choose CSV or Excel. The file contains all tasks with status, priority, assignees, and due dates.</Typography>
        ),
      },
    ],
  },
  {
    id: 'milestones-sprints-tasks',
    icon: <Flag />,
    title: 'Milestones, Sprints & Tasks',
    color: '#4facfe',
    items: [
      {
        heading: 'Creating milestones',
        content: (
          <Typography variant="body2">Inside a project, go to the <strong>Milestones</strong> tab → <strong>+ Add Milestone</strong>. Set a name, optional description, and start/end dates. Milestones group related sprints together (e.g. "Q1 Launch", "Beta Release").</Typography>
        ),
      },
      {
        heading: 'Adding sprints to a milestone',
        content: (
          <Typography variant="body2">Expand a milestone on the Milestones tab → click <strong>+ Add Sprint</strong>. Give the sprint a name and date range. The burndown chart tracks remaining tasks against sprint days.</Typography>
        ),
      },
      {
        heading: 'Creating tasks',
        content: (
          <Stack spacing={1}>
            <Typography variant="body2">Several ways to create tasks:</Typography>
            <Typography variant="body2">• Project Overview → bottom of the task list → click <strong>+ Add task</strong> (inline, press Enter to save)<br />
            • Sprint detail (Milestones tab) → <strong>+ Add Task</strong> button<br />
            • Kanban board → <strong>+</strong> at the bottom of any column<br />
            • <KBD>Cmd</KBD>+<KBD>K</KBD> command palette → type "New task"</Typography>
          </Stack>
        ),
      },
      {
        heading: 'Task fields explained',
        content: (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Field</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {[
                ['Title', 'Required. Short name for the task.'],
                ['Status', 'To-do → In Progress → Review → Done (or project custom statuses).'],
                ['Priority', 'Low / Medium / High / Critical. Shown as a coloured badge.'],
                ['Assignees', 'Multiple team members can be assigned.'],
                ['Due Date', 'Shown as overdue in red if past due and not Done.'],
                ['Estimated / Logged Hours', 'Set an estimate; log time via the task detail Time tab.'],
                ['Tags', 'Colour-coded labels shared across the workspace.'],
                ['Subtasks', 'Nested tasks shown as a progress bar on the parent.'],
                ['Checklist', 'Lightweight step-by-step items within the task.'],
                ['Recurrence', 'Daily, weekly, monthly — creates a new task on completion.'],
                ['Watchers', 'Users notified on any change even if not assigned.'],
              ].map(([field, desc]) => (
                <TableRow key={field}>
                  <TableCell sx={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{field}</TableCell>
                  <TableCell sx={{ fontSize: '0.8rem' }}>{desc}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ),
      },
      {
        heading: 'Bulk status updates',
        content: (
          <Typography variant="body2">On the project Overview tab, tick the checkboxes next to tasks to select them. A floating toolbar appears at the bottom — click <strong>Mark Done</strong>, <strong>In Progress</strong>, or <strong>Review</strong> to update all selected tasks at once.</Typography>
        ),
      },
      {
        heading: 'Task dependencies',
        content: (
          <Typography variant="body2">Open a task → <strong>Dependencies</strong> tab → add a "blocked by" or "blocks" relationship to another task. Blocked tasks show a red <strong>Blocked</strong> badge in all list views.</Typography>
        ),
      },
      {
        heading: 'Custom fields',
        content: (
          <Typography variant="body2">In project Settings → <strong>Custom Fields</strong>, add fields of type text, number, date, dropdown, checkbox, or URL. These appear on every task in that project's detail view.</Typography>
        ),
      },
    ],
  },
  {
    id: 'views',
    icon: <ViewKanban />,
    title: 'Views',
    color: '#43e97b',
    items: [
      {
        heading: 'Kanban Board',
        content: (
          <Stack spacing={1}>
            <Typography variant="body2">Go to <strong>Kanban Board</strong> in the sidebar. Filter by project using the dropdown at the top. Tasks are grouped in columns by status.</Typography>
            <Typography variant="body2"><strong>Drag & drop</strong> a card to a different column to instantly update its status. Cards show assignee avatars, priority colour, and due date.</Typography>
          </Stack>
        ),
      },
      {
        heading: 'Gantt Chart',
        content: (
          <Stack spacing={1}>
            <Typography variant="body2">Go to <strong>Gantt Chart</strong>. Select a project to see milestones and sprints on a timeline. Each bar spans the start → end date.</Typography>
            <Typography variant="body2"><strong>Drag</strong> a bar left/right to shift its dates. <strong>Drag the right edge</strong> to extend or shorten it. Changes are saved automatically.</Typography>
          </Stack>
        ),
      },
      {
        heading: 'Dashboard',
        content: (
          <Typography variant="body2">Your personal dashboard shows: tasks assigned to you, upcoming deadlines (today / tomorrow / this week), team workload, active sprints, project health summary, and a 12-week task completion trend chart.</Typography>
        ),
      },
      {
        heading: 'Workload View',
        content: (
          <Typography variant="body2">Go to <strong>Workload</strong> to see a per-member breakdown of assigned tasks — total, in-progress, overdue, and completion rate — across your workspace. Use this to spot overloaded team members before they miss deadlines.</Typography>
        ),
      },
      {
        heading: 'Project Reports tab',
        content: (
          <Stack spacing={1}>
            <Typography variant="body2">Inside a project, the <strong>Reports</strong> tab (index 5) shows three charts:</Typography>
            <Typography variant="body2">• <strong>Sprint Velocity</strong> — planned vs completed tasks for the last 6 sprints<br />
            • <strong>Cumulative Flow</strong> — running total of created vs done tasks over 60 days<br />
            • <strong>Cycle Time</strong> — average days from task creation to Done, plus a histogram</Typography>
          </Stack>
        ),
      },
    ],
  },
  {
    id: 'collaboration',
    icon: <Group />,
    title: 'Collaboration',
    color: '#f7971e',
    items: [
      {
        heading: 'Comments & @mentions',
        content: (
          <Stack spacing={1}>
            <Typography variant="body2">Open any task → <strong>Comments</strong> tab → type your message and click <strong>Post</strong>. Use <strong>@username</strong> to mention a team member — they receive an in-app notification immediately.</Typography>
            <Typography variant="body2">Comments can also be added at the Sprint and Project level from their detail pages.</Typography>
          </Stack>
        ),
      },
      {
        heading: 'File attachments',
        content: (
          <Typography variant="body2">Open a task → <strong>Attachments</strong> tab → drag a file or click <strong>Upload</strong>. Any file type up to the server limit is supported. Uploaded files are linked permanently to that task.</Typography>
        ),
      },
      {
        heading: 'Notifications',
        content: (
          <Stack spacing={1}>
            <Typography variant="body2">The bell icon in the top bar shows unread notifications. You receive a notification when:</Typography>
            <Typography variant="body2">• A task is assigned to you<br />
            • Someone @mentions you in a comment<br />
            • A task you're watching changes status<br />
            • A task you own is overdue</Typography>
            <Typography variant="body2">Go to <strong>/notifications</strong> to see all notifications and mark them read.</Typography>
          </Stack>
        ),
      },
      {
        heading: 'Activity log',
        content: (
          <Typography variant="body2">Inside a project → <strong>Activity</strong> tab shows a full audit trail of every change: who created / updated / deleted what, and when. Filter by action type or date range.</Typography>
        ),
      },
      {
        heading: 'Goals / OKRs',
        content: (
          <Typography variant="body2">Go to <strong>Goals</strong> in the sidebar to create workspace-level Objectives and Key Results. Each goal has a progress target (percentage or numeric). Link goals to projects to automatically pull in task completion progress.</Typography>
        ),
      },
    ],
  },
  {
    id: 'time-tracking',
    icon: <Timer />,
    title: 'Time Tracking',
    color: '#fa709a',
    items: [
      {
        heading: 'Logging time on a task',
        content: (
          <Typography variant="body2">Open a task → <strong>Time</strong> tab → enter hours and an optional note → <strong>Log Time</strong>. Each log entry records the date, hours, and user. Logs are listed below the form and can be deleted.</Typography>
        ),
      },
      {
        heading: 'Estimated vs actual hours',
        content: (
          <Typography variant="body2">Set <strong>Estimated Hours</strong> when creating or editing a task. As time is logged, the task detail shows a utilisation bar: logged vs estimated. Tasks significantly over estimate are highlighted.</Typography>
        ),
      },
      {
        heading: 'Time tracking summary',
        content: (
          <Typography variant="body2">The Dashboard's <em>Time Tracking Summary</em> widget shows total estimated vs logged hours per project, and a utilisation percentage. This helps identify projects running over budget.</Typography>
        ),
      },
    ],
  },
  {
    id: 'automation',
    icon: <Bolt />,
    title: 'Automation & Custom Fields',
    color: '#f6d365',
    items: [
      {
        heading: 'Creating an automation rule',
        content: (
          <Stack spacing={1}>
            <Typography variant="body2">Project → Settings → <strong>Automation Rules</strong> → <strong>Add Automation Rule</strong>.</Typography>
            <Typography variant="body2"><strong>Triggers:</strong> Status Change, Task Created, Assignee Changed, Due Date Passed<br />
            <strong>Actions:</strong> Send Notification, Change Status, Change Priority, Assign To</Typography>
            <Tip>Example: "When status changes to Done → notify all project members." Set conditions like "from: In Progress" to narrow the trigger.</Tip>
          </Stack>
        ),
      },
      {
        heading: 'Task templates',
        content: (
          <Typography variant="body2">Go to a project → any task → <strong>⋮ → Save as Template</strong> (or use the Templates page). Templates capture the task's title, description, checklist, and custom field defaults. Use <strong>Create from Template</strong> to spin up a pre-filled task.</Typography>
        ),
      },
    ],
  },
  {
    id: 'integrations',
    icon: <GitHub />,
    title: 'Calendar Sync & Git Integration',
    color: '#30cfd0',
    items: [
      {
        heading: 'Calendar sync (iCal)',
        content: (
          <Stack spacing={1}>
            <Typography variant="body2">Profile → <strong>Calendar Sync</strong> tab → <strong>Generate Calendar URL</strong>. Copy the <code>.ics</code> URL.</Typography>
            <Typography variant="body2"><strong>Google Calendar:</strong> + Other Calendars → From URL → paste → Add calendar.<br />
            <strong>Outlook:</strong> Add Calendar → Subscribe from web → paste URL → Import.</Typography>
            <Typography variant="body2">The feed includes all tasks assigned to you that have a due date. Click <strong>Regenerate URL</strong> to invalidate the old link if you need to revoke access.</Typography>
          </Stack>
        ),
      },
      {
        heading: 'GitHub / GitLab integration',
        content: (
          <Stack spacing={1}>
            <Typography variant="body2">Workspace → <strong>Integrations</strong> tab → <strong>Add Integration</strong>. Enter your repository URL and an optional webhook secret.</Typography>
            <Typography variant="body2">Copy the generated webhook URL into your GitHub repository: <em>Settings → Webhooks → Add webhook</em>. Enable <strong>push</strong> and <strong>pull_request</strong> events.</Typography>
            <Typography variant="body2">Once wired up, any commit or PR that mentions <code>CUR-123</code> or <code>[CUR-123]</code> in its title or body automatically creates a Git link on that task. When a PR is merged, the linked task moves to <strong>Review</strong> status.</Typography>
          </Stack>
        ),
      },
    ],
  },
  {
    id: 'import',
    icon: <Dashboard />,
    title: 'Importing from Other Tools',
    color: '#a18cd1',
    items: [
      {
        heading: 'CSV import',
        content: (
          <Stack spacing={1}>
            <Typography variant="body2">Project → Settings → <strong>Import Tasks from CSV</strong>.</Typography>
            <Typography variant="body2"><strong>Step 1:</strong> Select a target sprint, then upload your CSV file. CuriousPMO reads the headers and auto-guesses column mappings.</Typography>
            <Typography variant="body2"><strong>Step 2:</strong> Review and adjust the column → field mapping. Preview the first 5 rows. At minimum, one column must map to <strong>Title</strong>.</Typography>
            <Typography variant="body2"><strong>Step 3:</strong> Click <strong>Confirm Import</strong>. The result shows how many tasks were created, how many rows were skipped, and any per-row warnings.</Typography>
            <Tip>Supported fields: title, description, status, priority, assignee (by email), due date (YYYY-MM-DD or DD/MM/YYYY), tags (comma-separated).</Tip>
          </Stack>
        ),
      },
    ],
  },
  {
    id: 'shortcuts',
    icon: <Keyboard />,
    title: 'Tips & Keyboard Shortcuts',
    color: '#56ab2f',
    items: [
      {
        heading: 'Keyboard shortcuts',
        content: (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Shortcut</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {[
                [<><KBD>Ctrl/⌘</KBD>+<KBD>K</KBD></>, 'Open command palette'],
                [<><KBD>Ctrl/⌘</KBD>+<KBD>N</KBD></>, 'New task (from command palette)'],
                [<><KBD>Ctrl/⌘</KBD>+<KBD>F</KBD></>, 'Global search'],
                [<><KBD>Ctrl/⌘</KBD>+<KBD>D</KBD></>, 'Go to Dashboard'],
                [<><KBD>Ctrl/⌘</KBD>+<KBD>P</KBD></>, 'Go to Projects'],
                [<><KBD>Ctrl/⌘</KBD>+<KBD>G</KBD></>, 'Go to Gantt'],
                [<><KBD>Ctrl/⌘</KBD>+<KBD>Shift</KBD>+<KBD>D</KBD></>, 'Toggle dark mode'],
                [<><KBD>Escape</KBD></>, 'Close dialog / modal'],
              ].map(([shortcut, action], i) => (
                <TableRow key={i}>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{shortcut}</TableCell>
                  <TableCell sx={{ fontSize: '0.85rem' }}>{action}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ),
      },
      {
        heading: 'Command palette tips',
        content: (
          <Stack spacing={1}>
            <Typography variant="body2">Press <KBD>Cmd/Ctrl</KBD>+<KBD>K</KBD> to open the command palette from anywhere. Type to filter:</Typography>
            <Typography variant="body2">• Start with <strong>@</strong> to search users<br />
            • Start with <strong>#</strong> to jump to a project<br />
            • Type "new" to create a task, project, or milestone<br />
            • Type any page name (Gantt, Kanban, Goals…) to navigate</Typography>
          </Stack>
        ),
      },
      {
        heading: 'Quick tips',
        content: (
          <Stack spacing={0.5}>
            {[
              'Click a task title in any list to open the full detail modal without leaving the page.',
              'In the project Overview tab, click "+ Add task" at the bottom of the list to inline-create a task.',
              'Health badges update automatically every time a task or milestone is saved — no manual refresh needed.',
              'Use URL query params to share a specific tab: /projects/5?tab=3 opens the Activity tab directly.',
              'The Workload page shows per-day task distribution — use it to balance capacity before sprint planning.',
            ].map((tip, i) => (
              <Stack key={i} direction="row" spacing={1} alignItems="flex-start">
                <Typography color="primary" sx={{ mt: 0.1, fontSize: '0.9rem' }}>•</Typography>
                <Typography variant="body2">{tip}</Typography>
              </Stack>
            ))}
          </Stack>
        ),
      },
    ],
  },
  {
    id: 'permissions',
    icon: <Security />,
    title: 'Roles & Permissions',
    color: '#ee0979',
    items: [
      {
        heading: 'Permission model',
        content: (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Action</TableCell>
                <TableCell sx={{ fontWeight: 600, textAlign: 'center' }}>Owner</TableCell>
                <TableCell sx={{ fontWeight: 600, textAlign: 'center' }}>Admin</TableCell>
                <TableCell sx={{ fontWeight: 600, textAlign: 'center' }}>Member</TableCell>
                <TableCell sx={{ fontWeight: 600, textAlign: 'center' }}>Guest</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {[
                ['Delete workspace', '✓', '—', '—', '—'],
                ['Manage members', '✓', '✓', '—', '—'],
                ['View member list', '✓', '✓', '✓', '—'],
                ['Create projects', '✓', '✓', '✓', '—'],
                ['View public projects', '✓', '✓', '✓', '—'],
                ['View private projects', 'Member only', 'Member only', 'Member only', 'If granted'],
                ['Create / edit tasks', '✓', '✓', '✓', '✓*'],
                ['View workspace settings', '✓', '✓', '—', '—'],
                ['Manage Git integrations', '✓', '✓', '—', '—'],
              ].map(([action, ...cols]) => (
                <TableRow key={action}>
                  <TableCell sx={{ fontSize: '0.82rem' }}>{action}</TableCell>
                  {cols.map((v, i) => (
                    <TableCell key={i} sx={{ textAlign: 'center', fontSize: '0.82rem', color: v === '—' ? 'text.disabled' : v === '✓' ? 'success.main' : 'text.primary', fontWeight: v === '✓' ? 600 : 400 }}>{v}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ),
      },
      {
        heading: 'Guest limitations',
        content: (
          <Stack spacing={1}>
            <Typography variant="body2">Guests are intended for external stakeholders (clients, contractors). They:</Typography>
            <Typography variant="body2">
              • Cannot see the workspace member list<br />
              • Cannot see workspace settings<br />
              • Only see projects explicitly shared with them<br />
              • Show a "Guest" chip in the sidebar navigation
            </Typography>
            <Typography variant="caption" color="text.secondary">* Guests can create and edit tasks only in projects they have access to.</Typography>
          </Stack>
        ),
      },
    ],
  },
];

export const HelpPage = () => {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | false>(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return sections;
    const q = search.toLowerCase();
    return sections
      .map((section) => ({
        ...section,
        items: section.items.filter(
          (item) =>
            item.heading.toLowerCase().includes(q) ||
            section.title.toLowerCase().includes(q)
        ),
      }))
      .filter((s) => s.items.length > 0);
  }, [search]);

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            display: 'flex',
          }}
        >
          <Help fontSize="large" />
        </Box>
        <Box>
          <Typography variant="h4" fontWeight={700}>Help & User Guide</Typography>
          <Typography variant="body2" color="text.secondary">
            Everything you need to get the most out of CuriousPMO
          </Typography>
        </Box>
      </Stack>

      {/* Search */}
      <TextField
        fullWidth
        placeholder="Search the guide…"
        value={search}
        onChange={(e) => { setSearch(e.target.value); setExpanded(false); }}
        size="small"
        sx={{ mb: 3 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search color="action" />
            </InputAdornment>
          ),
        }}
      />

      {/* Section overview chips */}
      {!search && (
        <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 3 }}>
          {sections.map((s) => (
            <Chip
              key={s.id}
              icon={<Box sx={{ color: s.color, display: 'flex' }}>{s.icon}</Box>}
              label={s.title}
              onClick={() => {
                setExpanded(s.id);
                setTimeout(() => document.getElementById(`section-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
              }}
              variant="outlined"
              size="small"
              sx={{ '&:hover': { bgcolor: 'action.hover' } }}
            />
          ))}
        </Stack>
      )}

      <Divider sx={{ mb: 3 }} />

      {filtered.length === 0 && (
        <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">No results for "{search}"</Typography>
        </Paper>
      )}

      {/* Sections */}
      {filtered.map((section) => (
        <Paper
          key={section.id}
          id={`section-${section.id}`}
          variant="outlined"
          sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}
        >
          {/* Section header */}
          <Box
            sx={{
              px: 2,
              py: 1.5,
              borderLeft: 4,
              borderColor: section.color,
              bgcolor: 'grey.50',
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <Box sx={{ color: section.color, display: 'flex' }}>{section.icon}</Box>
            <Typography variant="subtitle1" fontWeight={700}>{section.title}</Typography>
            <Chip label={`${section.items.length} topic${section.items.length !== 1 ? 's' : ''}`} size="small" variant="outlined" sx={{ ml: 'auto', fontSize: '0.7rem' }} />
          </Box>

          {/* Items */}
          {section.items.map((item, idx) => (
            <Accordion
              key={idx}
              expanded={expanded === `${section.id}-${idx}`}
              onChange={(_, isExpanded) => setExpanded(isExpanded ? `${section.id}-${idx}` : false)}
              disableGutters
              elevation={0}
              sx={{
                borderTop: idx === 0 ? 0 : '1px solid',
                borderColor: 'divider',
                '&::before': { display: 'none' },
              }}
            >
              <AccordionSummary expandIcon={<ExpandMore />} sx={{ px: 2, minHeight: 48 }}>
                <Typography variant="body2" fontWeight={500}>{item.heading}</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 2, pt: 0, pb: 2 }}>
                {item.content}
              </AccordionDetails>
            </Accordion>
          ))}
        </Paper>
      ))}

      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          CuriousPMO User Guide · All features documented as of the current build
        </Typography>
      </Box>
    </Box>
  );
};
