import { useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  alpha,
} from '@mui/material';
import {
  Add,
  Assignment,
  Flag,
  CalendarMonth,
  FilterList,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useCreateTaskMutation, useListTasksQuery, useGetMyTasksQuery, Task } from '../api/taskApi';
import { useListProjectsQuery, useGetProjectQuery } from '../api/projectApi';
import { useListMilestonesQuery } from '../api/milestoneApi';
import { useListSprintsQuery } from '../api/sprintApi';
import { useGetCurrentUserQuery } from '../api/userApi';
import { TaskDetailModal } from '../components/tasks/TaskDetailModal';

const priorityColors: Record<string, 'default' | 'info' | 'warning' | 'error'> = {
  'Low': 'default',
  'Medium': 'info',
  'High': 'warning',
  'Critical': 'error',
};

const statusColors: Record<string, 'default' | 'primary' | 'warning' | 'success' | 'error'> = {
  'To-do': 'default',
  'In Progress': 'primary',
  'Review': 'warning',
  'Done': 'success',
};

export const TasksPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [tabValue, setTabValue] = useState(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    project: '',
  });

  const { data: allTasks, isLoading: loadingAll } = useListTasksQuery();
  const { data: myTasks, isLoading: loadingMy } = useGetMyTasksQuery();
  const { data: projects } = useListProjectsQuery();
  const { data: currentUser } = useGetCurrentUserQuery();
  const [createTask, { isLoading: creating }] = useCreateTaskMutation();

  const [form, setForm] = useState({
    title: '',
    description: '',
    status: 'To-do',
    priority: 'Medium',
    project: '',
    milestone: '',
    sprint: '',
    due_date: '',
    assignee: '',
    reporter: '',
  });

  // Fetch milestones based on selected project
  const { data: milestones } = useListMilestonesQuery(
    form.project ? { project: Number(form.project) } : undefined,
    { skip: !form.project }
  );

  // Fetch sprints based on selected milestone
  const { data: sprints } = useListSprintsQuery(
    form.milestone ? { milestone: Number(form.milestone) } : undefined,
    { skip: !form.milestone }
  );

  // Fetch project members for assignee/reporter selection
  const { data: selectedProject } = useGetProjectQuery(Number(form.project), {
    skip: !form.project,
  });

  // Get project members for dropdown
  const projectMembers = selectedProject?.members || [];

  // Reset dependent fields when parent changes
  const handleProjectChange = (projectId: string) => {
    setForm((f) => ({ ...f, project: projectId, milestone: '', sprint: '', assignee: '', reporter: '' }));
  };

  const handleMilestoneChange = (milestoneId: string) => {
    setForm((f) => ({ ...f, milestone: milestoneId, sprint: '' }));
  };

  const handleCreateSubmit = async () => {
    if (!form.sprint) {
      enqueueSnackbar('Please select a project, milestone, and sprint', { variant: 'warning' });
      return;
    }
    try {
      await createTask({
        title: form.title,
        description: form.description,
        status: form.status,
        priority: form.priority,
        sprint: Number(form.sprint),
        due_date: form.due_date || undefined,
        assignee: form.assignee ? Number(form.assignee) : undefined,
        reporter: form.reporter ? Number(form.reporter) : (currentUser?.id || undefined),
      }).unwrap();
      enqueueSnackbar('Task created successfully', { variant: 'success' });
      setCreateDialogOpen(false);
      setForm({ title: '', description: '', status: 'To-do', priority: 'Medium', project: '', milestone: '', sprint: '', due_date: '', assignee: '', reporter: '' });
    } catch {
      enqueueSnackbar('Failed to create task', { variant: 'error' });
    }
  };

  const tasks = tabValue === 0 ? myTasks : allTasks;
  const isLoading = tabValue === 0 ? loadingMy : loadingAll;

  // Apply filters
  const filteredTasks = tasks?.filter((task) => {
    if (filters.status && task.status !== filters.status) return false;
    if (filters.priority && task.priority !== filters.priority) return false;
    return true;
  });

  const TaskCard = ({ task }: { task: Task }) => (
    <Card
      sx={{
        transition: 'all 0.2s',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 2,
        },
      }}
    >
      <CardActionArea onClick={() => setSelectedTaskId(task.id)}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ flex: 1, pr: 1 }}>
              {task.title}
            </Typography>
            <Chip
              label={task.status}
              color={statusColors[task.status] || 'default'}
              size="small"
            />
          </Stack>

          {task.description && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mb: 2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {task.description}
            </Typography>
          )}

          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" gap={1}>
            <Chip
              icon={<Flag fontSize="small" />}
              label={task.priority}
              color={priorityColors[task.priority] || 'default'}
              size="small"
              variant="outlined"
            />
            {task.due_date && (
              <Chip
                icon={<CalendarMonth fontSize="small" />}
                label={new Date(task.due_date).toLocaleDateString()}
                size="small"
                variant="outlined"
                color={new Date(task.due_date) < new Date() ? 'error' : 'default'}
              />
            )}
            {task.assignee_details && (
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Avatar sx={{ width: 20, height: 20, fontSize: '0.7rem', bgcolor: 'primary.main' }}>
                  {task.assignee_details?.username?.[0]?.toUpperCase() || '?'}
                </Avatar>
                <Typography variant="caption" color="text.secondary">
                  {task.assignee_details.username}
                </Typography>
              </Stack>
            )}
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>
          Tasks
        </Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setCreateDialogOpen(true)}>
          New Task
        </Button>
      </Stack>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label={`My Tasks (${myTasks?.length || 0})`} />
          <Tab label={`All Tasks (${allTasks?.length || 0})`} />
        </Tabs>
      </Paper>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <FilterList color="action" />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filters.status}
              label="Status"
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="To-do">To Do</MenuItem>
              <MenuItem value="In Progress">In Progress</MenuItem>
              <MenuItem value="Review">Review</MenuItem>
              <MenuItem value="Done">Done</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Priority</InputLabel>
            <Select
              value={filters.priority}
              label="Priority"
              onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="Low">Low</MenuItem>
              <MenuItem value="Medium">Medium</MenuItem>
              <MenuItem value="High">High</MenuItem>
              <MenuItem value="Critical">Critical</MenuItem>
            </Select>
          </FormControl>
          {(filters.status || filters.priority) && (
            <Button size="small" onClick={() => setFilters({ status: '', priority: '', project: '' })}>
              Clear Filters
            </Button>
          )}
        </Stack>
      </Paper>

      {/* Task List */}
      {isLoading ? (
        <Grid container spacing={2}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton variant="rectangular" height={150} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      ) : filteredTasks && filteredTasks.length > 0 ? (
        <Grid container spacing={2}>
          {filteredTasks.map((task) => (
            <Grid item xs={12} sm={6} md={4} key={task.id}>
              <TaskCard task={task} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Assignment sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {tabValue === 0 ? 'No tasks assigned to you' : 'No tasks found'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {tabValue === 0
              ? 'Tasks assigned to you will appear here'
              : 'Create a new task or adjust your filters'}
          </Typography>
          <Button variant="contained" startIcon={<Add />} onClick={() => setCreateDialogOpen(true)}>
            Create Task
          </Button>
        </Paper>
      )}

      {/* Create Task Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create New Task</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Task Title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              fullWidth
              required
              placeholder="What needs to be done?"
            />
            <TextField
              label="Description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              fullWidth
              multiline
              rows={3}
              placeholder="Add more details..."
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Status"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                select
                fullWidth
              >
                <MenuItem value="To-do">To Do</MenuItem>
                <MenuItem value="In Progress">In Progress</MenuItem>
                <MenuItem value="Review">Review</MenuItem>
                <MenuItem value="Done">Done</MenuItem>
              </TextField>
              <TextField
                label="Priority"
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                select
                fullWidth
              >
                <MenuItem value="Low">Low</MenuItem>
                <MenuItem value="Medium">Medium</MenuItem>
                <MenuItem value="High">High</MenuItem>
                <MenuItem value="Critical">Critical</MenuItem>
              </TextField>
            </Stack>
            {/* Project → Milestone → Sprint cascade */}
            <TextField
              label="Project"
              value={form.project}
              onChange={(e) => handleProjectChange(e.target.value)}
              select
              fullWidth
              required
              helperText="Select a project first"
            >
              <MenuItem value="">Select Project</MenuItem>
              {projects?.map((project) => (
                <MenuItem key={project.id} value={project.id}>
                  {project.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Milestone"
              value={form.milestone}
              onChange={(e) => handleMilestoneChange(e.target.value)}
              select
              fullWidth
              required
              disabled={!form.project}
              helperText={!form.project ? 'Select a project first' : 'Select a milestone'}
            >
              <MenuItem value="">Select Milestone</MenuItem>
              {milestones?.map((milestone) => (
                <MenuItem key={milestone.id} value={milestone.id}>
                  {milestone.name}
                </MenuItem>
              ))}
            </TextField>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Sprint"
                value={form.sprint}
                onChange={(e) => setForm((f) => ({ ...f, sprint: e.target.value }))}
                select
                fullWidth
                required
                disabled={!form.milestone}
                helperText={!form.milestone ? 'Select a milestone first' : ''}
              >
                <MenuItem value="">Select Sprint</MenuItem>
                {sprints?.map((sprint) => (
                  <MenuItem key={sprint.id} value={sprint.id}>
                    {sprint.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Due Date"
                type="date"
                value={form.due_date}
                onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Assignee"
                value={form.assignee}
                onChange={(e) => setForm((f) => ({ ...f, assignee: e.target.value }))}
                select
                fullWidth
                disabled={!form.project}
                helperText={!form.project ? 'Select a project first' : ''}
              >
                <MenuItem value="">Unassigned</MenuItem>
                {projectMembers.map((member) => (
                  <MenuItem key={member.user.id} value={member.user.id}>
                    {member.user.first_name && member.user.last_name
                      ? `${member.user.first_name} ${member.user.last_name}`
                      : member.user.username}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Reporter"
                value={form.reporter}
                onChange={(e) => setForm((f) => ({ ...f, reporter: e.target.value }))}
                select
                fullWidth
                disabled={!form.project}
                helperText={!form.project ? 'Select a project first' : 'Defaults to you'}
              >
                <MenuItem value="">Me (Default)</MenuItem>
                {projectMembers.map((member) => (
                  <MenuItem key={member.user.id} value={member.user.id}>
                    {member.user.first_name && member.user.last_name
                      ? `${member.user.first_name} ${member.user.last_name}`
                      : member.user.username}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreateSubmit}
            variant="contained"
            disabled={!form.title.trim() || !form.sprint || creating}
          >
            {creating ? 'Creating...' : 'Create Task'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Task Detail Modal */}
      <TaskDetailModal
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onDeleted={() => setSelectedTaskId(null)}
      />
    </Box>
  );
};
