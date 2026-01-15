import { useState } from 'react';
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
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { useListProjectsQuery } from '../api/projectApi';
import {
  useGetProjectKanbanQuery,
  useGetMyKanbanQuery,
  KanbanTask,
  KanbanColumn,
} from '../api/kanbanApi';
import { useChangeTaskStatusMutation } from '../api/taskApi';

const PRIORITY_COLORS: Record<string, string> = {
  Low: '#4caf50',
  Medium: '#2196f3',
  High: '#ff9800',
  Critical: '#f44336',
};

const COLUMN_COLORS: Record<string, string> = {
  todo: '#9e9e9e',
  in_progress: '#2196f3',
  review: '#ff9800',
  done: '#4caf50',
};

// Module-level variable to store dragged task ID (workaround for dataTransfer issues)
let currentDraggedTaskId: number | null = null;

interface TaskCardProps {
  task: KanbanTask;
}

const TaskCard = ({ task }: TaskCardProps) => {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'Done';

  return (
    <div
      draggable="true"
      data-task-id={task.id}
      onDragStart={(e: React.DragEvent<HTMLDivElement>) => {
        // Set module-level variable as primary source
        currentDraggedTaskId = task.id;
        // Also set dataTransfer as backup
        e.dataTransfer.setData('text/plain', String(task.id));
        e.dataTransfer.effectAllowed = 'move';
      }}
      onDragEnd={() => {
        currentDraggedTaskId = null;
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
        </Stack>

        <Stack direction="row" justifyContent="space-between" alignItems="center">
          {task.assignee ? (
            <Tooltip title={task.assignee.username}>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Avatar sx={{ width: 20, height: 20, fontSize: '0.7rem' }}>
                  {task.assignee?.username?.[0]?.toUpperCase() || '?'}
                </Avatar>
                <Typography variant="caption" color="text.secondary">
                  {task.assignee.username}
                </Typography>
              </Stack>
            </Tooltip>
          ) : (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <PersonIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
              <Typography variant="caption" color="text.disabled">
                Unassigned
              </Typography>
            </Stack>
          )}

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
  onDrop: (taskId: number, newStatus: string) => void;
  isDragOver: boolean;
  onDragEnter: () => void;
  onDragLeave: () => void;
}

const KanbanColumnComponent = ({ column, onDrop, isDragOver, onDragEnter, onDragLeave }: KanbanColumnProps) => {
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
          bgcolor: COLUMN_COLORS[column.id],
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
        {column.tasks.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
            No tasks
          </Typography>
        ) : (
          column.tasks.map((task) => <TaskCard key={task.id} task={task} />)
        )}
      </Box>
    </Paper>
  );
};

export const KanbanPage = () => {
  const [viewMode, setViewMode] = useState<'my' | 'project'>('my');
  const [selectedProject, setSelectedProject] = useState<number | ''>('');
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

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

  const kanbanData = viewMode === 'my' ? myKanban : projectKanban;
  const isLoading = viewMode === 'my' ? loadingMyKanban : loadingProjectKanban;

  const handleTaskDrop = async (taskId: number, newStatus: string) => {
    // Find current task to check if status actually changed
    const currentTask = kanbanData?.columns
      .flatMap((col) => col.tasks)
      .find((t) => t.id === taskId);

    if (currentTask && currentTask.status !== newStatus) {
      try {
        // Use 'id' instead of 'taskId' to match taskApi.ts parameter name
        await changeStatus({ id: taskId, status: newStatus }).unwrap();
      } catch (error) {
        console.error('Failed to update task status:', error);
      }
    }
    setDragOverColumn(null);
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
                  onDrop={handleTaskDrop}
                  isDragOver={dragOverColumn === column.id}
                  onDragEnter={() => setDragOverColumn(column.id)}
                  onDragLeave={() => setDragOverColumn(null)}
                />
              ))}
            </Stack>
          </Box>
        )}
    </Box>
  );
};
