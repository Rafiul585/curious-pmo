import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Avatar,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Card,
  CardContent,
  Tooltip,
  ToggleButtonGroup,
  ToggleButton,
  TextField,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AddIcon from '@mui/icons-material/Add';
import { useListProjectsQuery } from '../api/projectApi';
import {
  useGetProjectKanbanQuery,
  useGetMyKanbanQuery,
  KanbanTask,
  KanbanColumn,
} from '../api/kanbanApi';
import { useChangeTaskStatusMutation, useCreateTaskMutation, useReorderTasksMutation } from '../api/taskApi';
import { useListSprintsQuery } from '../api/sprintApi';
import { useSnackbar } from 'notistack';

const PRIORITY_COLORS: Record<string, string> = {
  Low: '#4caf50',
  Medium: '#2196f3',
  High: '#ff9800',
  Critical: '#f44336',
};

const DEFAULT_COLUMN_COLOR = '#9e9e9e';

// Module-level variable to store dragged task ID (workaround for dataTransfer issues)
let currentDraggedTaskId: number | null = null;

interface TaskCardProps {
  task: KanbanTask;
  onDragEnterTask?: () => void;
}

const TaskCard = ({ task, onDragEnterTask }: TaskCardProps) => {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'Done';

  return (
    <div
      draggable="true"
      data-task-id={task.id}
      onDragStart={(e: React.DragEvent<HTMLDivElement>) => {
        currentDraggedTaskId = task.id;
        e.dataTransfer.setData('text/plain', String(task.id));
        e.dataTransfer.effectAllowed = 'move';
      }}
      onDragEnd={() => {
        currentDraggedTaskId = null;
      }}
      onDragEnter={(e) => {
        e.stopPropagation();
        onDragEnterTask?.();
      }}
      style={{ marginBottom: 8, cursor: 'grab' }}
    >
      <Card
        sx={{
          '&:hover': { boxShadow: 3 },
          borderLeft: 3,
          borderColor: PRIORITY_COLORS[task.priority] || '#9e9e9e',
        }}
      >
        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
          {task.title}
        </Typography>

        <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mb: 1 }}>
          <Chip
            label={task.priority}
            size="small"
            sx={{
              bgcolor: PRIORITY_COLORS[task.priority],
              color: 'white',
              fontSize: '0.65rem',
              height: 20,
            }}
          />
          {task.is_blocked && (
            <Chip
              label="Blocked"
              color="error"
              size="small"
              sx={{ fontSize: '0.65rem', height: 20, fontWeight: 600 }}
            />
          )}
        </Stack>

        <Stack direction="row" justifyContent="space-between" alignItems="center">
          {(() => {
            const all = task.assignees && task.assignees.length > 0
              ? task.assignees
              : task.assignee ? [task.assignee] : [];
            if (all.length === 0) {
              return (
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <PersonIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                  <Typography variant="caption" color="text.disabled">Unassigned</Typography>
                </Stack>
              );
            }
            const visible = all.slice(0, 3);
            const overflow = all.length - visible.length;
            return (
              <Tooltip title={all.map((u) => u.username).join(', ')}>
                <Stack direction="row" spacing={-0.5} alignItems="center">
                  {visible.map((u) => (
                    <Avatar key={u.id} sx={{ width: 20, height: 20, fontSize: '0.6rem', border: '1px solid white' }}>
                      {u.username[0].toUpperCase()}
                    </Avatar>
                  ))}
                  {overflow > 0 && (
                    <Avatar sx={{ width: 20, height: 20, fontSize: '0.6rem', bgcolor: 'grey.400', border: '1px solid white' }}>
                      +{overflow}
                    </Avatar>
                  )}
                </Stack>
              </Tooltip>
            );
          })()}

          {task.due_date && (
            <Tooltip title={`Due: ${task.due_date}`}>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <CalendarTodayIcon sx={{ fontSize: 14, color: isOverdue ? 'error.main' : 'text.secondary' }} />
                <Typography
                  variant="caption"
                  color={isOverdue ? 'error.main' : 'text.secondary'}
                  sx={{ fontWeight: isOverdue ? 600 : 400 }}
                >
                  {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </Typography>
              </Stack>
            </Tooltip>
          )}
        </Stack>
        </CardContent>
      </Card>
    </div>
  );
};

interface KanbanColumnProps {
  column: KanbanColumn;
  tasks: KanbanTask[];
  onDrop: (taskId: number, newStatus: string) => void;
  isDragOver: boolean;
  onDragEnter: () => void;
  onDragLeave: () => void;
  onTaskDragEnter: (taskId: number) => void;
  showAddTask: boolean;
  onAddTaskClick: () => void;
}

const KanbanColumnComponent = ({
  column, tasks, onDrop, isDragOver, onDragEnter, onDragLeave, onTaskDragEnter,
  showAddTask, onAddTaskClick,
}: KanbanColumnProps) => {
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // Use module-level variable as primary source (most reliable)
    let taskId: number | null = currentDraggedTaskId;

    // Fallback to dataTransfer
    if (taskId === null) {
      const taskIdStr = e.dataTransfer.getData('text/plain');
      if (taskIdStr) {
        taskId = parseInt(taskIdStr, 10);
      }
    }

    if (taskId !== null && !isNaN(taskId)) {
      onDrop(taskId, column.status);
    }

    // Clear the dragged task id
    currentDraggedTaskId = null;
  };

  return (
    <Paper
      sx={{
        width: 300,
        minWidth: 300,
        bgcolor: isDragOver ? 'action.hover' : 'background.default',
        border: isDragOver ? '2px dashed' : '1px solid',
        borderColor: isDragOver ? 'primary.main' : 'divider',
        borderRadius: 2,
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 'calc(100vh - 220px)',
      }}
      onDragOver={handleDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={handleDrop}
    >
      <Box
        sx={{
          p: 1.5,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: column.color || DEFAULT_COLUMN_COLOR,
          borderRadius: '8px 8px 0 0',
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle2" sx={{ color: 'white', fontWeight: 600 }}>
            {column.name}
          </Typography>
          <Chip label={column.count} size="small" sx={{ bgcolor: 'white', fontWeight: 600 }} />
        </Stack>
      </Box>
      <Box sx={{ p: 1, overflow: 'auto', flex: 1 }}>
        {tasks.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
            No tasks
          </Typography>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onDragEnterTask={() => onTaskDragEnter(task.id)}
            />
          ))
        )}

        {showAddTask && (
          <Box
            sx={{
              mt: 0.5,
              px: 0.5,
              py: 0.5,
              cursor: 'pointer',
              color: 'text.secondary',
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              borderRadius: 1,
              '&:hover': { color: 'text.primary', bgcolor: 'action.hover' },
            }}
            onClick={onAddTaskClick}
          >
            <AddIcon fontSize="small" />
            <Typography variant="caption">Add task</Typography>
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export const KanbanPage = () => {
  const [viewMode, setViewMode] = useState<'my' | 'project'>('my');
  const [selectedProject, setSelectedProject] = useState<number | ''>('');
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<number | null>(null);
  const [optimisticColumns, setOptimisticColumns] = useState<Record<string, KanbanTask[]>>({});
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addDialogStatus, setAddDialogStatus] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskSprintId, setNewTaskSprintId] = useState<number | ''>('');
  const [dialogProjectId, setDialogProjectId] = useState<number | ''>('');
  const { enqueueSnackbar } = useSnackbar();

  const { data: projects } = useListProjectsQuery();
  const { data: myKanban, isLoading: loadingMyKanban } = useGetMyKanbanQuery(
    viewMode === 'my' && selectedProject ? selectedProject : undefined,
    { skip: viewMode !== 'my' }
  );
  const { data: projectKanban, isLoading: loadingProjectKanban } = useGetProjectKanbanQuery(
    selectedProject as number,
    { skip: viewMode !== 'project' || !selectedProject }
  );

  const [changeStatus] = useChangeTaskStatusMutation();
  const [createTask, { isLoading: creatingTask }] = useCreateTaskMutation();
  const [reorderTasks] = useReorderTasksMutation();

  const kanbanData = viewMode === 'my' ? myKanban : projectKanban;
  const isLoading = viewMode === 'my' ? loadingMyKanban : loadingProjectKanban;

  // Sprints for the add-task dialog: use the board's project in project mode,
  // or the dialog-level project picker in my-tasks mode.
  const sprintProjectId = viewMode === 'project' ? selectedProject : dialogProjectId;
  const { data: dialogSprints } = useListSprintsQuery(
    { project: sprintProjectId } as any,
    { skip: !sprintProjectId }
  );

  // Clear optimistic overrides whenever server data refreshes
  useEffect(() => {
    setOptimisticColumns({});
  }, [kanbanData]);

  const handleTaskDrop = async (taskId: number, newStatus: string) => {
    const allTasks = kanbanData?.columns.flatMap((col) =>
      optimisticColumns[col.id] ?? col.tasks
    );
    const currentTask = allTasks?.find((t) => t.id === taskId);
    if (!currentTask) { setDragOverColumn(null); setDragOverTaskId(null); return; }

    if (currentTask.status === newStatus) {
      // Same-column reorder
      const column = kanbanData!.columns.find((c) => c.status === newStatus)!;
      const currentColTasks = optimisticColumns[column.id] ?? column.tasks;
      const without = currentColTasks.filter((t) => t.id !== taskId);
      const insertAt = dragOverTaskId && dragOverTaskId !== taskId
        ? without.findIndex((t) => t.id === dragOverTaskId)
        : -1;
      const idx = insertAt === -1 ? without.length : insertAt;
      const reordered = [...without.slice(0, idx), currentTask, ...without.slice(idx)];

      setOptimisticColumns((prev) => ({ ...prev, [column.id]: reordered }));

      try {
        await reorderTasks({ task_ids: reordered.map((t) => t.id) }).unwrap();
      } catch {
        // Revert optimistic state on failure
        setOptimisticColumns((prev) => {
          const next = { ...prev };
          delete next[column.id];
          return next;
        });
      }
    } else {
      // Cross-column: change status
      try {
        await changeStatus({ id: taskId, status: newStatus }).unwrap();
      } catch (error) {
        console.error('Failed to update task status:', error);
      }
    }

    setDragOverColumn(null);
    setDragOverTaskId(null);
  };

  const handleAddTaskOpen = (columnStatus: string) => {
    setAddDialogStatus(columnStatus);
    setNewTaskTitle('');
    setNewTaskSprintId('');
    if (viewMode === 'project') {
      setDialogProjectId(selectedProject);
      const activeSprint = dialogSprints?.find((s: any) => s.status === 'active') ?? dialogSprints?.[0];
      setNewTaskSprintId(activeSprint?.id ?? '');
    } else {
      setDialogProjectId('');
    }
    setAddDialogOpen(true);
  };

  const handleDialogProjectChange = (projectId: number | '') => {
    setDialogProjectId(projectId);
    setNewTaskSprintId('');
  };

  const handleAddTaskSave = async () => {
    const title = newTaskTitle.trim();
    if (!title || !newTaskSprintId) return;
    try {
      await createTask({
        title,
        status: addDialogStatus,
        priority: 'Medium',
        sprint: newTaskSprintId,
      } as any).unwrap();
      enqueueSnackbar('Task created', { variant: 'success' });
      setAddDialogOpen(false);
      setNewTaskTitle('');
    } catch {
      enqueueSnackbar('Failed to create task', { variant: 'error' });
    }
  };

  return (
    <Box>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Typography variant="h5">Kanban Board</Typography>
          <Stack direction="row" spacing={2}>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, value) => value && setViewMode(value)}
              size="small"
            >
              <ToggleButton value="my">My Tasks</ToggleButton>
              <ToggleButton value="project">Project</ToggleButton>
            </ToggleButtonGroup>

            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>{viewMode === 'my' ? 'Filter by Project' : 'Select Project'}</InputLabel>
              <Select
                value={selectedProject}
                label={viewMode === 'my' ? 'Filter by Project' : 'Select Project'}
                onChange={(e) => setSelectedProject(e.target.value as number)}
              >
                {viewMode === 'my' && <MenuItem value="">All Projects</MenuItem>}
                {projects?.map((project) => (
                  <MenuItem key={project.id} value={project.id}>
                    {project.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </Stack>

        {isLoading && <LinearProgress sx={{ mb: 2 }} />}

        {viewMode === 'project' && !selectedProject && (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">Select a project to view its Kanban board</Typography>
          </Paper>
        )}

        {kanbanData && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Total: {kanbanData.total_tasks} tasks
            </Typography>
            <Stack
              direction="row"
              spacing={2}
              sx={{
                overflow: 'auto',
                pb: 2,
              }}
            >
              {kanbanData.columns.map((column) => (
                <KanbanColumnComponent
                  key={column.id}
                  column={column}
                  tasks={optimisticColumns[column.id] ?? column.tasks}
                  onDrop={handleTaskDrop}
                  isDragOver={dragOverColumn === column.id}
                  onDragEnter={() => setDragOverColumn(column.id)}
                  onDragLeave={() => setDragOverColumn(null)}
                  onTaskDragEnter={(taskId) => setDragOverTaskId(taskId)}
                  showAddTask={true}
                  onAddTaskClick={() => handleAddTaskOpen(column.status)}
                />
              ))}
            </Stack>
          </Box>
        )}

      {/* Add Task Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add Task</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              autoFocus
              label="Task Title"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTaskSave(); } }}
              fullWidth
              required
            />
            {viewMode === 'my' && (
              <TextField
                label="Project"
                value={dialogProjectId}
                onChange={(e) => handleDialogProjectChange(Number(e.target.value))}
                select
                fullWidth
                required
              >
                {(projects ?? []).map((p) => (
                  <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                ))}
              </TextField>
            )}
            <TextField
              label="Sprint"
              value={newTaskSprintId}
              onChange={(e) => setNewTaskSprintId(Number(e.target.value))}
              select
              fullWidth
              required
              disabled={!dialogSprints?.length}
            >
              {(dialogSprints ?? []).map((s: any) => (
                <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddTaskSave}
            disabled={!newTaskTitle.trim() || !newTaskSprintId || creatingTask}
          >
            {creatingTask ? 'Creating…' : 'Create Task'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
