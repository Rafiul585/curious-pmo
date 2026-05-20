import { useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Avatar,
  AvatarGroup,
  Box,
  Breadcrumbs,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  Link,
  Menu,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  alpha,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Select,
  InputLabel,
  FormControl,
} from '@mui/material';
import {
  Edit,
  Delete,
  MoreVert,
  Add,
  PersonAdd,
  Timeline,
  ViewKanban,
  CalendarMonth,
  Flag,
  FlagCircle,
  People,
  FolderOpen,
  History,
  ArrowBack,
  Assignment,
  Speed,
  Close,
  Settings,
  Circle,
  FileDownload,
  Visibility,
  Repeat,
  Bolt,
  BarChart as BarChartIcon,
  Article,
  OpenInNew,
  Upload,
  CheckCircle,
  ErrorOutline,
} from '@mui/icons-material';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from 'chart.js';

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ChartTooltip, Legend, Filler);
import { Switch, FormControlLabel } from '@mui/material';
import { useSnackbar } from 'notistack';
import {
  useGetProjectQuery,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
  useAddProjectMemberMutation,
  useRemoveProjectMemberMutation,
  useGetAvailableMembersQuery,
} from '../api/projectApi';
import { useListMilestonesQuery, useCreateMilestoneMutation } from '../api/milestoneApi';
import {
  useListProjectStatusesQuery,
  useCreateProjectStatusMutation,
  useDeleteProjectStatusMutation,
} from '../api/projectStatusApi';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { downloadExport } from '../utils/exportDownload';
import { useListTasksQuery, useBulkUpdateTasksMutation, useCreateTaskMutation } from '../api/taskApi';
import { MilestoneManager } from '../components/projects/MilestoneManager';
import { ActivityLogList } from '../components/activity/ActivityLogList';
import { HealthBadge } from '../components/feedback/HealthBadge';
import { TaskDetailModal } from '../components/tasks/TaskDetailModal';
import {
  useListCustomFieldsQuery,
  useCreateCustomFieldMutation,
  useUpdateCustomFieldMutation,
  useDeleteCustomFieldMutation,
} from '../api/customFieldApi';
import type { CustomFieldDefinition } from '../api/customFieldApi';
import {
  useListAutomationsQuery,
  useCreateAutomationMutation,
  useUpdateAutomationMutation,
  useDeleteAutomationMutation,
} from '../api/automationApi';
import type { AutomationRule } from '../api/automationApi';
import { useGetVelocityQuery, useGetCumulativeFlowQuery, useGetCycleTimeQuery } from '../api/dashboardApi';
import { useListDocsQuery, useCreateDocMutation, useDeleteDocMutation } from '../api/docApi';
import { useCsvImportMutation, TASK_FIELDS } from '../api/importApi';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const statusColors: Record<string, 'default' | 'primary' | 'warning' | 'success' | 'error'> = {
  planning: 'default',
  active: 'primary',
  on_hold: 'warning',
  completed: 'success',
  cancelled: 'error',
};

const TASK_STATUS_COLORS: Record<string, 'default' | 'primary' | 'warning' | 'success'> = {
  'To-do': 'default',
  'In Progress': 'primary',
  Review: 'warning',
  Done: 'success',
};

const TASK_PRIORITY_COLORS: Record<string, string> = {
  Low: '#4caf50',
  Medium: '#2196f3',
  High: '#ff9800',
  Critical: '#f44336',
};

export const ProjectDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const projectId = Number(id);

  const [searchParams, setSearchParams] = useSearchParams();
  const tabValue = Number(searchParams.get('tab') ?? '0');
  const milestoneHealthFilter = searchParams.get('health') ?? 'all';

  const setTabValue = (v: number) =>
    setSearchParams((p) => { p.set('tab', String(v)); return p; }, { replace: true });

  const setMilestoneHealthFilter = (v: string) =>
    setSearchParams((p) => {
      if (v === 'all') p.delete('health'); else p.set('health', v);
      return p;
    }, { replace: true });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [editForm, setEditForm] = useState<{
    name: string;
    description: string;
    status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  }>({ name: '', description: '', status: 'planning' });
  const [milestoneForm, setMilestoneForm] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
  });

  const { data: project, isLoading, error } = useGetProjectQuery(projectId);
  const { data: milestones } = useListMilestonesQuery({ project: projectId });
  const { data: tasks } = useListTasksQuery({ project: projectId });
  const { data: availableMembers } = useGetAvailableMembersQuery(projectId);

  const [updateProject, { isLoading: updating }] = useUpdateProjectMutation();
  const [deleteProject, { isLoading: deleting }] = useDeleteProjectMutation();
  const [addMember] = useAddProjectMemberMutation();
  const [removeMember] = useRemoveProjectMemberMutation();
  const [createMilestone, { isLoading: creatingMilestone }] = useCreateMilestoneMutation();
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<number>>(new Set());
  const [openTaskId, setOpenTaskId] = useState<number | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [addTaskTitle, setAddTaskTitle] = useState('');
  const [bulkUpdate] = useBulkUpdateTasksMutation();
  const [createTask] = useCreateTaskMutation();
  const { data: projectStatuses } = useListProjectStatusesQuery(projectId);
  const [createStatus] = useCreateProjectStatusMutation();
  const [deleteStatus] = useDeleteProjectStatusMutation();
  const [newStatusForm, setNewStatusForm] = useState({ name: '', color: '#6B7280', is_done_state: false });
  const [showAddStatus, setShowAddStatus] = useState(false);
  const { data: customFields } = useListCustomFieldsQuery(projectId);
  const [createCustomField] = useCreateCustomFieldMutation();
  const [updateCustomField] = useUpdateCustomFieldMutation();
  const [deleteCustomField] = useDeleteCustomFieldMutation();
  const [showAddField, setShowAddField] = useState(false);
  const [newFieldForm, setNewFieldForm] = useState<{ name: string; field_type: CustomFieldDefinition['field_type']; options: string; required: boolean }>({
    name: '', field_type: 'text', options: '', required: false,
  });
  const [editFieldId, setEditFieldId] = useState<number | null>(null);
  const [editFieldForm, setEditFieldForm] = useState<{ name: string; options: string; required: boolean }>({
    name: '', options: '', required: false,
  });

  const { data: automations } = useListAutomationsQuery(projectId);
  const { data: velocityData } = useGetVelocityQuery({ projectId }, { skip: tabValue !== 5 });
  const { data: cumulativeFlowData } = useGetCumulativeFlowQuery({ projectId }, { skip: tabValue !== 5 });
  const { data: cycleTimeData } = useGetCycleTimeQuery(projectId, { skip: tabValue !== 5 });
  const { data: docs } = useListDocsQuery(projectId, { skip: tabValue !== 6 });
  const [createDoc] = useCreateDocMutation();
  const [deleteDocItem] = useDeleteDocMutation();
  const [newDocTitle, setNewDocTitle] = useState('');
  const [showNewDocForm, setShowNewDocForm] = useState(false);

  // Import state
  const [csvImport] = useCsvImportMutation();
  const [importStep, setImportStep] = useState<'upload' | 'map' | 'result'>('upload');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [importPreview, setImportPreview] = useState<string[][]>([]);
  const [importMapping, setImportMapping] = useState<Record<string, string>>({});
  const [importSprintId, setImportSprintId] = useState<string>('');
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);
  const [importing, setImporting] = useState(false);

  const [createAutomation] = useCreateAutomationMutation();
  const [updateAutomation] = useUpdateAutomationMutation();
  const [deleteAutomation] = useDeleteAutomationMutation();
  const [showAddAutomation, setShowAddAutomation] = useState(false);
  const blankAutomationForm = (): Omit<AutomationRule, 'id' | 'trigger_display' | 'action_display' | 'created_at'> => ({
    project: projectId,
    name: '',
    trigger: 'status_change',
    conditions: {},
    action: 'send_notification',
    action_params: { notify: 'assignees', message: '' },
    is_active: true,
  });
  const [newAutomationForm, setNewAutomationForm] = useState(blankAutomationForm);

  const accessToken = useSelector((state: RootState) => state.auth.accessToken);
  const [exportAnchor, setExportAnchor] = useState<null | HTMLElement>(null);

  const firstSprintId = milestones?.flatMap((m) => m.sprints ?? []).find((s) => !!s)?.id;

  const toggleTaskSelection = (taskId: number) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const handleAddTask = async () => {
    const title = addTaskTitle.trim();
    if (!title) {
      setShowAddTask(false);
      return;
    }
    try {
      await createTask({
        title,
        status: 'To-do',
        priority: 'Medium',
        ...(firstSprintId !== undefined ? { sprint: firstSprintId } : {}),
      }).unwrap();
      setAddTaskTitle('');
      enqueueSnackbar('Task created', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to create task', { variant: 'error' });
    }
  };

  const handleBulkUpdate = async (newStatus: string) => {
    if (selectedTaskIds.size === 0) return;
    try {
      await bulkUpdate({ task_ids: Array.from(selectedTaskIds), status: newStatus }).unwrap();
      enqueueSnackbar(`${selectedTaskIds.size} task(s) updated to "${newStatus}"`, { variant: 'success' });
      setSelectedTaskIds(new Set());
    } catch {
      enqueueSnackbar('Failed to bulk update tasks', { variant: 'error' });
    }
  };

  const handleEditOpen = () => {
    if (project) {
      setEditForm({
        name: project.name,
        description: project.description || '',
        status: project.status,
      });
    }
    setEditDialogOpen(true);
    setMenuAnchor(null);
  };

  const handleEditSubmit = async () => {
    try {
      await updateProject({ id: projectId, data: editForm }).unwrap();
      enqueueSnackbar('Project updated successfully', { variant: 'success' });
      setEditDialogOpen(false);
    } catch {
      enqueueSnackbar('Failed to update project', { variant: 'error' });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteProject(projectId).unwrap();
      enqueueSnackbar('Project deleted successfully', { variant: 'success' });
      navigate('/projects');
    } catch {
      enqueueSnackbar('Failed to delete project', { variant: 'error' });
    }
  };

  const handleAddMember = async (userId: number) => {
    try {
      await addMember({ projectId, userId }).unwrap();
      enqueueSnackbar('Member added successfully', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to add member', { variant: 'error' });
    }
  };

  const handleRemoveMember = async (userId: number) => {
    try {
      await removeMember({ projectId, userId }).unwrap();
      enqueueSnackbar('Member removed successfully', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to remove member', { variant: 'error' });
    }
  };

  const handleCreateMilestone = async () => {
    if (!milestoneForm.name.trim()) {
      enqueueSnackbar('Milestone name is required', { variant: 'warning' });
      return;
    }
    try {
      await createMilestone({
        project: projectId,
        name: milestoneForm.name,
        description: milestoneForm.description,
        start_date: milestoneForm.start_date || undefined,
        end_date: milestoneForm.end_date || undefined,
      }).unwrap();
      enqueueSnackbar('Milestone created successfully', { variant: 'success' });
      setMilestoneDialogOpen(false);
      setMilestoneForm({ name: '', description: '', start_date: '', end_date: '' });
    } catch {
      enqueueSnackbar('Failed to create milestone', { variant: 'error' });
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="rectangular" height={200} sx={{ mb: 2, borderRadius: 2 }} />
        <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
      </Box>
    );
  }

  if (error || !project) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Project not found or you don't have access.</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/projects')} sx={{ mt: 2 }}>
          Back to Projects
        </Button>
      </Box>
    );
  }

  const completedTasks = tasks?.filter((t) => t.status === 'done').length || 0;
  const totalTasks = tasks?.length || 0;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <Box>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link component={RouterLink} to="/projects" underline="hover" color="inherit">
          Projects
        </Link>
        <Typography color="text.primary">{project.name}</Typography>
      </Breadcrumbs>

      {/* Header Card */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
              <Typography variant="h4" fontWeight={700}>
                {project.name}
              </Typography>
              <Chip
                label={project.status.replace('_', ' ')}
                color={statusColors[project.status] || 'default'}
                size="small"
              />
              <Chip
                label={project.visibility}
                variant="outlined"
                size="small"
              />
              <HealthBadge status={project.health_status} />
            </Stack>
            {project.description && (
              <Typography color="text.secondary" sx={{ mb: 2, maxWidth: 600 }}>
                {project.description}
              </Typography>
            )}
            <Stack direction="row" spacing={3} sx={{ mt: 2 }}>
              {project.start_date && (
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <CalendarMonth fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    Start: {new Date(project.start_date).toLocaleDateString()}
                  </Typography>
                </Stack>
              )}
              {project.end_date && (
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <Flag fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    End: {new Date(project.end_date).toLocaleDateString()}
                  </Typography>
                </Stack>
              )}
            </Stack>
          </Box>

          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<Timeline />}
              component={RouterLink}
              to={`/gantt?project=${projectId}`}
            >
              Gantt
            </Button>
            <Button
              variant="outlined"
              startIcon={<ViewKanban />}
              component={RouterLink}
              to={`/kanban?project=${projectId}`}
            >
              Kanban
            </Button>
            <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)}>
              <MoreVert />
            </IconButton>
            <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
              <MenuItem onClick={handleEditOpen}>
                <Edit fontSize="small" sx={{ mr: 1 }} /> Edit Project
              </MenuItem>
              <MenuItem onClick={() => { setDeleteDialogOpen(true); setMenuAnchor(null); }}>
                <Delete fontSize="small" sx={{ mr: 1 }} color="error" /> Delete Project
              </MenuItem>
            </Menu>
          </Stack>
        </Stack>

        {/* Progress Bar */}
        <Box sx={{ mt: 3 }}>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Progress
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {completedTasks}/{totalTasks} tasks ({progress}%)
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ borderRadius: 2 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tab icon={<FolderOpen />} iconPosition="start" label="Overview" />
          <Tab icon={<FlagCircle />} iconPosition="start" label={`Milestones (${milestones?.length || 0})`} />
          <Tab icon={<People />} iconPosition="start" label={`Members (${project.members?.length || 0})`} />
          <Tab icon={<History />} iconPosition="start" label="Activity" />
          <Tab icon={<Settings />} iconPosition="start" label="Settings" />
          <Tab icon={<BarChartIcon />} iconPosition="start" label="Reports" />
          <Tab icon={<Article />} iconPosition="start" label={`Docs${docs ? ` (${docs.length})` : ''}`} />
        </Tabs>

        {/* Overview Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ px: 3 }}>
            <Grid container spacing={3}>
              {/* Stats Cards */}
              <Grid item xs={12} md={4}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Box
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                          color: 'primary.main',
                          display: 'flex',
                        }}
                      >
                        <FlagCircle />
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Milestones
                        </Typography>
                        <Typography variant="h4" fontWeight={700}>
                          {milestones?.length || 0}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Box
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: (theme) => alpha(theme.palette.success.main, 0.1),
                          color: 'success.main',
                          display: 'flex',
                        }}
                      >
                        <Assignment />
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Total Tasks
                        </Typography>
                        <Typography variant="h4" fontWeight={700}>
                          {totalTasks}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Box
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: (theme) => alpha(theme.palette.warning.main, 0.1),
                          color: 'warning.main',
                          display: 'flex',
                        }}
                      >
                        <People />
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Team Members
                        </Typography>
                        <Typography variant="h4" fontWeight={700}>
                          {project.members?.length || 0}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              {/* Milestones List */}
              <Grid item xs={12}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                  <Typography variant="h6" fontWeight={600}>
                    Milestones
                  </Typography>
                  <Button startIcon={<Add />} size="small" onClick={() => setMilestoneDialogOpen(true)}>
                    Add Milestone
                  </Button>
                </Stack>
                {/* Health filter chips */}
                <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mb: 2, gap: 0.5 }}>
                  {(['all', 'on_track', 'at_risk', 'behind', 'critical'] as const).map((v) => (
                    <Chip
                      key={v}
                      label={v === 'all' ? 'All' : v === 'on_track' ? 'On Track' : v === 'at_risk' ? 'At Risk' : v === 'behind' ? 'Behind' : 'Critical'}
                      size="small"
                      onClick={() => setMilestoneHealthFilter(v)}
                      color={milestoneHealthFilter === v ? 'primary' : 'default'}
                      variant={milestoneHealthFilter === v ? 'filled' : 'outlined'}
                    />
                  ))}
                </Stack>
                {milestones && milestones.length > 0 ? (() => {
                  const filtered = milestoneHealthFilter === 'all'
                    ? milestones
                    : milestones.filter((m) => m.health_status === milestoneHealthFilter);
                  return filtered.length > 0 ? (
                  <Grid container spacing={2}>
                    {filtered.map((milestone) => (
                      <Grid item xs={12} sm={6} md={4} key={milestone.id}>
                        <Card
                          variant="outlined"
                          sx={{
                            height: '100%',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            '&:hover': { boxShadow: 2, transform: 'translateY(-2px)' }
                          }}
                          onClick={() => setTabValue(1)}
                        >
                          <CardContent>
                            <Stack spacing={1.5}>
                              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                <Typography variant="subtitle1" fontWeight={600} noWrap sx={{ flex: 1, pr: 1 }}>
                                  {milestone.name}
                                </Typography>
                                <Stack direction="row" spacing={0.5}>
                                  <Chip
                                    label={milestone.status}
                                    color={statusColors[milestone.status] || 'default'}
                                    size="small"
                                  />
                                  <HealthBadge status={milestone.health_status} />
                                </Stack>
                              </Stack>
                              {milestone.description && (
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                  sx={{
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                  }}
                                >
                                  {milestone.description}
                                </Typography>
                              )}
                              <Divider />
                              <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography variant="caption" color="text.secondary">
                                  {milestone.sprints?.length || 0} Sprints
                                </Typography>
                                {milestone.start_date && milestone.end_date && (
                                  <Typography variant="caption" color="text.secondary">
                                    {new Date(milestone.start_date).toLocaleDateString()} - {new Date(milestone.end_date).toLocaleDateString()}
                                  </Typography>
                                )}
                              </Stack>
                              {typeof milestone.completion_percentage === 'number' && (
                                <Box>
                                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                                    <Typography variant="caption" color="text.secondary">Progress</Typography>
                                    <Typography variant="caption" fontWeight={600}>{milestone.completion_percentage}%</Typography>
                                  </Stack>
                                  <LinearProgress
                                    variant="determinate"
                                    value={milestone.completion_percentage}
                                    sx={{ height: 6, borderRadius: 3 }}
                                  />
                                </Box>
                              )}
                            </Stack>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                  ) : (
                    <Typography color="text.secondary">No milestones match this filter.</Typography>
                  );
                })() : (
                  <Typography color="text.secondary">No milestones yet.</Typography>
                )}
              </Grid>

              {/* Tasks List with bulk selection */}
              <Grid item xs={12}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                  <Typography variant="h6" fontWeight={600}>
                    Tasks
                    {selectedTaskIds.size > 0 && (
                      <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                        ({selectedTaskIds.size} selected)
                      </Typography>
                    )}
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      {tasks?.length || 0} total
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<FileDownload fontSize="small" />}
                      onClick={(e) => setExportAnchor(e.currentTarget)}
                    >
                      Export
                    </Button>
                    <Menu anchorEl={exportAnchor} open={Boolean(exportAnchor)} onClose={() => setExportAnchor(null)}>
                      {(['csv', 'xlsx'] as const).map((fmt) => (
                        <MenuItem
                          key={fmt}
                          onClick={async () => {
                            setExportAnchor(null);
                            try {
                              await downloadExport(
                                `/projects/${projectId}/export/?format=${fmt}`,
                                `${project.name}_tasks.${fmt}`,
                                accessToken,
                              );
                            } catch {
                              enqueueSnackbar('Export failed', { variant: 'error' });
                            }
                          }}
                        >
                          Export as {fmt.toUpperCase()}
                        </MenuItem>
                      ))}
                    </Menu>
                  </Stack>
                </Stack>
                {tasks && tasks.length > 0 ? (
                  <Box>
                    {tasks.map((task) => (
                      <Paper
                        key={task.id}
                        variant="outlined"
                        sx={{
                          mb: 0.5,
                          px: 2,
                          py: 1,
                          cursor: 'pointer',
                          bgcolor: selectedTaskIds.has(task.id) ? 'action.selected' : 'background.paper',
                          '&:hover': { bgcolor: selectedTaskIds.has(task.id) ? 'action.selected' : 'action.hover' },
                        }}
                        onClick={() => toggleTaskSelection(task.id)}
                      >
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                          <Checkbox
                            size="small"
                            checked={selectedTaskIds.has(task.id)}
                            onChange={() => toggleTaskSelection(task.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <Typography
                            variant="body2"
                            sx={{ flex: 1, '&:hover': { textDecoration: 'underline' } }}
                            onClick={(e) => { e.stopPropagation(); setOpenTaskId(task.id); }}
                          >
                            {task.title}
                          </Typography>
                          {/* Assignee avatars */}
                          {(() => {
                            const all = task.assignees_details && task.assignees_details.length > 0
                              ? task.assignees_details
                              : task.assignee_details ? [task.assignee_details] : [];
                            if (all.length === 0) return null;
                            const visible = all.slice(0, 3);
                            const overflow = all.length - visible.length;
                            return (
                              <AvatarGroup sx={{ '& .MuiAvatar-root': { width: 22, height: 22, fontSize: '0.6rem' } }}>
                                {visible.map((u) => (
                                  <Avatar key={u.id} sx={{ bgcolor: 'primary.main' }}>{u.username[0].toUpperCase()}</Avatar>
                                ))}
                                {overflow > 0 && (
                                  <Avatar sx={{ bgcolor: 'grey.400' }}>+{overflow}</Avatar>
                                )}
                              </AvatarGroup>
                            );
                          })()}
                          <Stack direction="row" spacing={0.5} flexShrink={0}>
                            <Chip
                              label={task.status}
                              size="small"
                              color={TASK_STATUS_COLORS[task.status] || 'default'}
                            />
                            <Chip
                              label={task.priority}
                              size="small"
                              sx={{
                                bgcolor: TASK_PRIORITY_COLORS[task.priority] || '#9e9e9e',
                                color: 'white',
                                fontSize: '0.65rem',
                                height: 20,
                              }}
                            />
                            {task.is_blocked && (
                              <Chip label="Blocked" color="error" size="small" sx={{ fontWeight: 600 }} />
                            )}
                            {(task.subtask_count ?? 0) > 0 && (
                              <Chip
                                label={`${task.subtasks_done ?? 0}/${task.subtask_count} subtasks`}
                                size="small"
                                variant="outlined"
                                color={task.subtasks_done === task.subtask_count ? 'success' : 'default'}
                                sx={{ fontSize: '0.65rem', height: 20 }}
                              />
                            )}
                            {task.recurrence && (
                              <Chip
                                icon={<Repeat sx={{ fontSize: '0.75rem !important' }} />}
                                label={task.recurrence.charAt(0).toUpperCase() + task.recurrence.slice(1)}
                                size="small"
                                color="info"
                                variant="outlined"
                                sx={{ fontSize: '0.65rem', height: 20 }}
                              />
                            )}
                            {task.tags_details?.map((tag) => (
                              <Chip
                                key={tag.id}
                                label={tag.name}
                                size="small"
                                sx={{ bgcolor: tag.color, color: 'white', fontSize: '0.65rem', height: 20 }}
                              />
                            ))}
                            {(task.watcher_count ?? 0) > 0 && (
                              <Chip
                                icon={<Visibility sx={{ fontSize: '0.75rem !important' }} />}
                                label={task.watcher_count}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: '0.65rem', height: 20 }}
                              />
                            )}
                          </Stack>
                        </Stack>
                      </Paper>
                    ))}
                  </Box>
                ) : (
                  <Typography color="text.secondary">No tasks in this project yet.</Typography>
                )}

                {/* Inline add-task row */}
                {showAddTask ? (
                  <Paper variant="outlined" sx={{ mt: 0.5, px: 2, py: 1 }}>
                    <TextField
                      autoFocus
                      size="small"
                      fullWidth
                      placeholder="Task title… (Enter to save, Escape to cancel)"
                      value={addTaskTitle}
                      onChange={(e) => setAddTaskTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); handleAddTask(); }
                        if (e.key === 'Escape') { setShowAddTask(false); setAddTaskTitle(''); }
                      }}
                      onBlur={() => { setShowAddTask(false); setAddTaskTitle(''); }}
                      variant="standard"
                      InputProps={{ disableUnderline: true }}
                    />
                  </Paper>
                ) : (
                  <Box
                    sx={{
                      mt: 0.5,
                      px: 2,
                      py: 0.75,
                      cursor: 'pointer',
                      color: 'text.secondary',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      borderRadius: 1,
                      '&:hover': { color: 'text.primary', bgcolor: 'action.hover' },
                    }}
                    onClick={() => setShowAddTask(true)}
                  >
                    <Add fontSize="small" />
                    <Typography variant="body2">Add task</Typography>
                  </Box>
                )}
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        {/* Milestones Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ px: 3 }}>
            <MilestoneManager projectId={projectId} />
          </Box>
        </TabPanel>

        {/* Members Tab */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ px: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
              <Typography variant="h6" fontWeight={600}>
                Team Members
              </Typography>
              <Button startIcon={<PersonAdd />} variant="contained" onClick={() => setMemberDialogOpen(true)}>
                Add Member
              </Button>
            </Stack>
            {project.members && project.members.length > 0 ? (
              <Grid container spacing={2}>
                {project.members.map((member) => (
                  <Grid item xs={12} sm={6} md={4} key={member.id}>
                    <Card variant="outlined">
                      <CardContent>
                        <Stack direction="row" alignItems="center" spacing={2}>
                          <Avatar sx={{ bgcolor: 'primary.main' }}>
                            {member.user?.username?.[0]?.toUpperCase() || '?'}
                          </Avatar>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle2" fontWeight={600}>
                              {member.user?.first_name && member.user?.last_name
                                ? `${member.user.first_name} ${member.user.last_name}`
                                : member.user?.username || 'Unknown User'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {member.user?.email || ''}
                            </Typography>
                            {member.role && (
                              <Chip label={member.role.name} size="small" sx={{ mt: 0.5 }} />
                            )}
                          </Box>
                          <IconButton size="small" onClick={() => member.user?.id && handleRemoveMember(member.user.id)}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Typography color="text.secondary">No members in this project.</Typography>
            )}
          </Box>
        </TabPanel>

        {/* Activity Tab */}
        <TabPanel value={tabValue} index={3}>
          <Box sx={{ px: 3 }}>
            <ActivityLogList projectId={projectId} showFilters limit={50} />
          </Box>
        </TabPanel>

        {/* Settings Tab */}
        <TabPanel value={tabValue} index={4}>
          <Box sx={{ px: 3 }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              Custom Task Statuses
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Define custom statuses for tasks in this project. When set, these replace the default statuses (To-do, In Progress, Review, Done) on the Kanban board and task editor.
            </Typography>

            {/* Existing statuses */}
            {projectStatuses && projectStatuses.length > 0 ? (
              <Stack spacing={1} sx={{ mb: 3 }}>
                {projectStatuses.map((s) => (
                  <Paper key={s.id} variant="outlined" sx={{ px: 2, py: 1.5 }}>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Circle sx={{ color: s.color, fontSize: 18 }} />
                      <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }}>
                        {s.name}
                      </Typography>
                      {s.is_done_state && (
                        <Chip label="Done state" size="small" color="success" variant="outlined" />
                      )}
                      <Typography variant="caption" color="text.secondary">
                        Order: {s.order}
                      </Typography>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={async () => {
                          try {
                            await deleteStatus({ id: s.id, projectId }).unwrap();
                            enqueueSnackbar('Status deleted', { variant: 'success' });
                          } catch {
                            enqueueSnackbar('Failed to delete status', { variant: 'error' });
                          }
                        }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            ) : (
              <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'action.hover' }}>
                <Typography variant="body2" color="text.secondary">
                  No custom statuses defined. Default statuses (To-do, In Progress, Review, Done) are used.
                </Typography>
              </Paper>
            )}

            {/* Add new status */}
            {showAddStatus ? (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>New Status</Typography>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={2}>
                    <TextField
                      label="Name"
                      value={newStatusForm.name}
                      onChange={(e) => setNewStatusForm((f) => ({ ...f, name: e.target.value }))}
                      size="small"
                      sx={{ flex: 1 }}
                      onKeyDown={(e) => { if (e.key === 'Escape') setShowAddStatus(false); }}
                    />
                    <TextField
                      label="Color"
                      type="color"
                      value={newStatusForm.color}
                      onChange={(e) => setNewStatusForm((f) => ({ ...f, color: e.target.value }))}
                      size="small"
                      sx={{ width: 90 }}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Stack>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Checkbox
                      size="small"
                      checked={newStatusForm.is_done_state}
                      onChange={(e) => setNewStatusForm((f) => ({ ...f, is_done_state: e.target.checked }))}
                    />
                    <Typography variant="body2">Mark as "done" state (counts toward completion)</Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Button size="small" onClick={() => setShowAddStatus(false)}>Cancel</Button>
                    <Button
                      size="small"
                      variant="contained"
                      disabled={!newStatusForm.name.trim()}
                      onClick={async () => {
                        if (!newStatusForm.name.trim()) return;
                        try {
                          await createStatus({
                            projectId,
                            data: {
                              name: newStatusForm.name.trim(),
                              color: newStatusForm.color,
                              is_done_state: newStatusForm.is_done_state,
                              order: (projectStatuses?.length ?? 0),
                            },
                          }).unwrap();
                          enqueueSnackbar('Status created', { variant: 'success' });
                          setNewStatusForm({ name: '', color: '#6B7280', is_done_state: false });
                          setShowAddStatus(false);
                        } catch {
                          enqueueSnackbar('Failed to create status', { variant: 'error' });
                        }
                      }}
                    >
                      Create
                    </Button>
                  </Stack>
                </Stack>
              </Paper>
            ) : (
              <Button startIcon={<Add />} variant="outlined" onClick={() => setShowAddStatus(true)}>
                Add Status
              </Button>
            )}

            <Divider sx={{ my: 4 }} />

            {/* ── Custom Fields ── */}
            <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>Custom Fields</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Define extra metadata fields for tasks in this project (text, number, date, dropdown, checkbox, URL).
            </Typography>

            {customFields && customFields.length > 0 ? (
              <Stack spacing={1} sx={{ mb: 3 }}>
                {customFields.map((f) => (
                  <Paper key={f.id} variant="outlined" sx={{ px: 2, py: 1.5 }}>
                    {editFieldId === f.id ? (
                      <Stack spacing={1.5}>
                        <TextField
                          label="Name"
                          size="small"
                          value={editFieldForm.name}
                          onChange={(e) => setEditFieldForm((x) => ({ ...x, name: e.target.value }))}
                        />
                        {(f.field_type === 'dropdown') && (
                          <TextField
                            label="Options (comma-separated)"
                            size="small"
                            value={editFieldForm.options}
                            onChange={(e) => setEditFieldForm((x) => ({ ...x, options: e.target.value }))}
                            helperText="e.g. Option A, Option B, Option C"
                          />
                        )}
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Checkbox size="small" checked={editFieldForm.required} onChange={(e) => setEditFieldForm((x) => ({ ...x, required: e.target.checked }))} />
                          <Typography variant="body2">Required</Typography>
                        </Stack>
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button size="small" onClick={() => setEditFieldId(null)}>Cancel</Button>
                          <Button size="small" variant="contained" onClick={async () => {
                            try {
                              await updateCustomField({
                                id: f.id,
                                data: {
                                  name: editFieldForm.name.trim() || f.name,
                                  options: f.field_type === 'dropdown'
                                    ? editFieldForm.options.split(',').map((s) => s.trim()).filter(Boolean)
                                    : [],
                                  required: editFieldForm.required,
                                },
                              }).unwrap();
                              setEditFieldId(null);
                              enqueueSnackbar('Field updated', { variant: 'success' });
                            } catch {
                              enqueueSnackbar('Failed to update field', { variant: 'error' });
                            }
                          }}>Save</Button>
                        </Stack>
                      </Stack>
                    ) : (
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" fontWeight={500}>{f.name}</Typography>
                          <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                            <Chip label={f.field_type} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 18 }} />
                            {f.required && <Chip label="required" size="small" color="warning" variant="outlined" sx={{ fontSize: '0.65rem', height: 18 }} />}
                            {f.field_type === 'dropdown' && f.options.length > 0 && (
                              <Typography variant="caption" color="text.secondary">{f.options.join(', ')}</Typography>
                            )}
                          </Stack>
                        </Box>
                        <IconButton size="small" onClick={() => {
                          setEditFieldId(f.id);
                          setEditFieldForm({ name: f.name, options: f.options.join(', '), required: f.required });
                        }}>
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={async () => {
                          try {
                            await deleteCustomField({ id: f.id, projectId }).unwrap();
                            enqueueSnackbar('Field deleted', { variant: 'success' });
                          } catch {
                            enqueueSnackbar('Failed to delete field', { variant: 'error' });
                          }
                        }}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </Stack>
                    )}
                  </Paper>
                ))}
              </Stack>
            ) : (
              <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'action.hover' }}>
                <Typography variant="body2" color="text.secondary">No custom fields defined yet.</Typography>
              </Paper>
            )}

            {showAddField ? (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>New Custom Field</Typography>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={2}>
                    <TextField
                      label="Field name"
                      size="small"
                      value={newFieldForm.name}
                      onChange={(e) => setNewFieldForm((x) => ({ ...x, name: e.target.value }))}
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      label="Type"
                      select
                      size="small"
                      value={newFieldForm.field_type}
                      onChange={(e) => setNewFieldForm((x) => ({ ...x, field_type: e.target.value as CustomFieldDefinition['field_type'] }))}
                      sx={{ minWidth: 140 }}
                    >
                      {(['text', 'number', 'date', 'dropdown', 'checkbox', 'url'] as const).map((t) => (
                        <MenuItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</MenuItem>
                      ))}
                    </TextField>
                  </Stack>
                  {newFieldForm.field_type === 'dropdown' && (
                    <TextField
                      label="Options (comma-separated)"
                      size="small"
                      value={newFieldForm.options}
                      onChange={(e) => setNewFieldForm((x) => ({ ...x, options: e.target.value }))}
                      helperText="e.g. Option A, Option B, Option C"
                    />
                  )}
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Checkbox size="small" checked={newFieldForm.required} onChange={(e) => setNewFieldForm((x) => ({ ...x, required: e.target.checked }))} />
                    <Typography variant="body2">Required</Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Button size="small" onClick={() => { setShowAddField(false); setNewFieldForm({ name: '', field_type: 'text', options: '', required: false }); }}>Cancel</Button>
                    <Button
                      size="small"
                      variant="contained"
                      disabled={!newFieldForm.name.trim()}
                      onClick={async () => {
                        if (!newFieldForm.name.trim()) return;
                        try {
                          await createCustomField({
                            project: projectId,
                            name: newFieldForm.name.trim(),
                            field_type: newFieldForm.field_type,
                            options: newFieldForm.field_type === 'dropdown'
                              ? newFieldForm.options.split(',').map((s) => s.trim()).filter(Boolean)
                              : [],
                            required: newFieldForm.required,
                            order: customFields?.length ?? 0,
                          }).unwrap();
                          enqueueSnackbar('Custom field created', { variant: 'success' });
                          setNewFieldForm({ name: '', field_type: 'text', options: '', required: false });
                          setShowAddField(false);
                        } catch {
                          enqueueSnackbar('Failed to create field', { variant: 'error' });
                        }
                      }}
                    >
                      Create
                    </Button>
                  </Stack>
                </Stack>
              </Paper>
            ) : (
              <Button startIcon={<Add />} variant="outlined" onClick={() => setShowAddField(true)}>
                Add Custom Field
              </Button>
            )}

            <Divider sx={{ my: 4 }} />

            {/* ── Automation Rules ── */}
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <Bolt color="warning" />
              <Typography variant="h6" fontWeight={600}>Automation Rules</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Automatically trigger actions when task events occur (status change, creation, assignee change).
            </Typography>

            {/* Existing rules */}
            {automations && automations.length > 0 && (
              <Stack spacing={1} sx={{ mb: 3 }}>
                {automations.map((rule) => (
                  <Paper key={rule.id} variant="outlined" sx={{ px: 2, py: 1.5 }}>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Bolt fontSize="small" color={rule.is_active ? 'warning' : 'disabled'} />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600} noWrap>{rule.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          When <strong>{rule.trigger_display}</strong> → {rule.action_display}
                        </Typography>
                      </Box>
                      <Switch
                        size="small"
                        checked={rule.is_active}
                        onChange={async (e) => {
                          try {
                            await updateAutomation({ id: rule.id, data: { is_active: e.target.checked } }).unwrap();
                          } catch {
                            enqueueSnackbar('Failed to update rule', { variant: 'error' });
                          }
                        }}
                      />
                      <IconButton
                        size="small"
                        onClick={async () => {
                          try {
                            await deleteAutomation({ id: rule.id, projectId }).unwrap();
                            enqueueSnackbar('Rule deleted', { variant: 'success' });
                          } catch {
                            enqueueSnackbar('Failed to delete rule', { variant: 'error' });
                          }
                        }}
                        sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            )}

            {/* Create rule form */}
            {showAddAutomation ? (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>New Automation Rule</Typography>
                <Stack spacing={2}>
                  <TextField
                    label="Rule name"
                    size="small"
                    fullWidth
                    value={newAutomationForm.name}
                    onChange={(e) => setNewAutomationForm((f) => ({ ...f, name: e.target.value }))}
                  />
                  <TextField
                    label="Trigger"
                    select
                    size="small"
                    fullWidth
                    value={newAutomationForm.trigger}
                    onChange={(e) => setNewAutomationForm((f) => ({ ...f, trigger: e.target.value as AutomationRule['trigger'] }))}
                  >
                    <MenuItem value="status_change">Status Change</MenuItem>
                    <MenuItem value="task_created">Task Created</MenuItem>
                    <MenuItem value="assignee_changed">Assignee Changed</MenuItem>
                    <MenuItem value="due_date_passed">Due Date Passed</MenuItem>
                  </TextField>

                  {/* Conditions for status_change */}
                  {newAutomationForm.trigger === 'status_change' && (
                    <Stack direction="row" spacing={1}>
                      <TextField
                        label="From status (optional)"
                        size="small"
                        fullWidth
                        value={(newAutomationForm.conditions as Record<string, string>).from_status ?? ''}
                        onChange={(e) => setNewAutomationForm((f) => ({
                          ...f, conditions: { ...f.conditions as Record<string, string>, from_status: e.target.value },
                        }))}
                      />
                      <TextField
                        label="To status (optional)"
                        size="small"
                        fullWidth
                        value={(newAutomationForm.conditions as Record<string, string>).to_status ?? ''}
                        onChange={(e) => setNewAutomationForm((f) => ({
                          ...f, conditions: { ...f.conditions as Record<string, string>, to_status: e.target.value },
                        }))}
                      />
                    </Stack>
                  )}

                  <TextField
                    label="Action"
                    select
                    size="small"
                    fullWidth
                    value={newAutomationForm.action}
                    onChange={(e) => setNewAutomationForm((f) => ({ ...f, action: e.target.value as AutomationRule['action'] }))}
                  >
                    <MenuItem value="send_notification">Send Notification</MenuItem>
                    <MenuItem value="change_status">Change Status</MenuItem>
                    <MenuItem value="change_priority">Change Priority</MenuItem>
                    <MenuItem value="assign_to">Assign To</MenuItem>
                  </TextField>

                  {/* Action params */}
                  {newAutomationForm.action === 'send_notification' && (
                    <Stack spacing={1}>
                      <TextField
                        label="Notify"
                        select
                        size="small"
                        fullWidth
                        value={(newAutomationForm.action_params as Record<string, string>).notify ?? 'assignees'}
                        onChange={(e) => setNewAutomationForm((f) => ({
                          ...f, action_params: { ...f.action_params as Record<string, string>, notify: e.target.value },
                        }))}
                      >
                        <MenuItem value="assignees">Assignees</MenuItem>
                        <MenuItem value="reporter">Reporter</MenuItem>
                        <MenuItem value="project_owner">Project Owner</MenuItem>
                        <MenuItem value="project_members">All Project Members</MenuItem>
                      </TextField>
                      <TextField
                        label="Message (optional)"
                        size="small"
                        fullWidth
                        value={(newAutomationForm.action_params as Record<string, string>).message ?? ''}
                        onChange={(e) => setNewAutomationForm((f) => ({
                          ...f, action_params: { ...f.action_params as Record<string, string>, message: e.target.value },
                        }))}
                      />
                    </Stack>
                  )}
                  {newAutomationForm.action === 'change_status' && (
                    <TextField
                      label="New status"
                      size="small"
                      fullWidth
                      value={(newAutomationForm.action_params as Record<string, string>).status ?? ''}
                      onChange={(e) => setNewAutomationForm((f) => ({
                        ...f, action_params: { status: e.target.value },
                      }))}
                    />
                  )}
                  {newAutomationForm.action === 'change_priority' && (
                    <TextField
                      label="New priority"
                      select
                      size="small"
                      fullWidth
                      value={(newAutomationForm.action_params as Record<string, string>).priority ?? ''}
                      onChange={(e) => setNewAutomationForm((f) => ({
                        ...f, action_params: { priority: e.target.value },
                      }))}
                    >
                      <MenuItem value="Low">Low</MenuItem>
                      <MenuItem value="Medium">Medium</MenuItem>
                      <MenuItem value="High">High</MenuItem>
                      <MenuItem value="Critical">Critical</MenuItem>
                    </TextField>
                  )}

                  <FormControlLabel
                    control={
                      <Switch
                        size="small"
                        checked={newAutomationForm.is_active}
                        onChange={(e) => setNewAutomationForm((f) => ({ ...f, is_active: e.target.checked }))}
                      />
                    }
                    label="Active"
                  />

                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Button size="small" onClick={() => { setShowAddAutomation(false); setNewAutomationForm(blankAutomationForm()); }}>
                      Cancel
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      disabled={!newAutomationForm.name.trim()}
                      onClick={async () => {
                        try {
                          await createAutomation(newAutomationForm).unwrap();
                          enqueueSnackbar('Automation rule created', { variant: 'success' });
                          setShowAddAutomation(false);
                          setNewAutomationForm(blankAutomationForm());
                        } catch {
                          enqueueSnackbar('Failed to create rule', { variant: 'error' });
                        }
                      }}
                    >
                      Create Rule
                    </Button>
                  </Stack>
                </Stack>
              </Paper>
            ) : (
              <Button startIcon={<Add />} variant="outlined" onClick={() => setShowAddAutomation(true)}>
                Add Automation Rule
              </Button>
            )}

            <Divider sx={{ my: 4 }} />

            {/* ── CSV Import ── */}
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <Upload color="primary" />
              <Typography variant="h6" fontWeight={600}>Import Tasks from CSV</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Upload a CSV file exported from Jira, Trello, Asana, or any spreadsheet. Map columns to task fields, preview the first rows, then confirm.
            </Typography>

            {importStep === 'upload' && (
              <Stack spacing={2} sx={{ maxWidth: 520 }}>
                {/* Sprint selector */}
                <FormControl size="small" fullWidth>
                  <InputLabel>Target Sprint</InputLabel>
                  <Select
                    label="Target Sprint"
                    value={importSprintId}
                    onChange={(e) => setImportSprintId(e.target.value)}
                  >
                    {milestones?.flatMap((m) => m.sprints ?? []).map((s) => (
                      <MenuItem key={s.id} value={String(s.id)}>{s.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* File picker */}
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<Upload />}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  {importFile ? importFile.name : 'Choose CSV file'}
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    hidden
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setImportFile(file);
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        const text = ev.target?.result as string;
                        const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(Boolean);
                        if (lines.length === 0) return;
                        const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
                        const rows = lines.slice(1, 6).map((l) =>
                          l.split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
                        );
                        setImportHeaders(headers);
                        setImportPreview(rows);
                        // Auto-map by guessing common column names
                        const auto: Record<string, string> = {};
                        headers.forEach((h) => {
                          const lower = h.toLowerCase();
                          if (/title|name|summary|task/.test(lower)) auto[h] = 'title';
                          else if (/desc/.test(lower)) auto[h] = 'description';
                          else if (/status|state/.test(lower)) auto[h] = 'status';
                          else if (/priority/.test(lower)) auto[h] = 'priority';
                          else if (/assign|email/.test(lower)) auto[h] = 'assignee_email';
                          else if (/due|deadline/.test(lower)) auto[h] = 'due_date';
                          else if (/tag|label/.test(lower)) auto[h] = 'tags';
                          else auto[h] = 'skip';
                        });
                        setImportMapping(auto);
                      };
                      reader.readAsText(file);
                    }}
                  />
                </Button>

                {importFile && importHeaders.length > 0 && (
                  <Button
                    variant="contained"
                    disabled={!importSprintId}
                    onClick={() => setImportStep('map')}
                  >
                    Next: Map Columns
                  </Button>
                )}
                {importFile && !importSprintId && (
                  <Typography variant="caption" color="warning.main">Select a target sprint first.</Typography>
                )}
              </Stack>
            )}

            {importStep === 'map' && importFile && (
              <Stack spacing={3} sx={{ maxWidth: 700 }}>
                <Typography variant="subtitle2" fontWeight={600}>Map CSV Columns → Task Fields</Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>CSV Column</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Maps to</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Preview</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {importHeaders.map((header) => (
                      <TableRow key={header}>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{header}</TableCell>
                        <TableCell>
                          <Select
                            size="small"
                            value={importMapping[header] ?? 'skip'}
                            onChange={(e) => setImportMapping((m) => ({ ...m, [header]: e.target.value }))}
                            sx={{ minWidth: 160 }}
                          >
                            {TASK_FIELDS.map((f) => (
                              <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary', maxWidth: 180 }}>
                          {importPreview.map((row) => row[importHeaders.indexOf(header)]).filter(Boolean).slice(0, 2).join(', ')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <Typography variant="subtitle2" fontWeight={600}>Preview (first {importPreview.length} rows)</Typography>
                <Box sx={{ overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {importHeaders.map((h) => <TableCell key={h} sx={{ fontSize: '0.75rem', fontWeight: 600 }}>{h}</TableCell>)}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {importPreview.map((row, i) => (
                        <TableRow key={i}>
                          {importHeaders.map((_, ci) => (
                            <TableCell key={ci} sx={{ fontSize: '0.75rem' }}>{row[ci] ?? ''}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>

                <Stack direction="row" spacing={1}>
                  <Button onClick={() => setImportStep('upload')}>Back</Button>
                  <Button
                    variant="contained"
                    disabled={importing || !Object.values(importMapping).includes('title')}
                    onClick={async () => {
                      if (!importFile || !importSprintId) return;
                      setImporting(true);
                      try {
                        const result = await csvImport({
                          file: importFile,
                          projectId,
                          sprintId: Number(importSprintId),
                          mapping: importMapping,
                        }).unwrap();
                        setImportResult(result);
                        setImportStep('result');
                      } catch {
                        enqueueSnackbar('Import failed', { variant: 'error' });
                      } finally {
                        setImporting(false);
                      }
                    }}
                  >
                    {importing ? 'Importing…' : 'Confirm Import'}
                  </Button>
                </Stack>
                {!Object.values(importMapping).includes('title') && (
                  <Typography variant="caption" color="error">At least one column must be mapped to "Title".</Typography>
                )}
              </Stack>
            )}

            {importStep === 'result' && importResult && (
              <Stack spacing={2} sx={{ maxWidth: 520 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <CheckCircle color="success" />
                  <Typography variant="subtitle1" fontWeight={600}>Import Complete</Typography>
                </Stack>
                <Stack direction="row" spacing={3}>
                  <Box>
                    <Typography variant="h4" fontWeight={700} color="success.main">{importResult.imported}</Typography>
                    <Typography variant="body2" color="text.secondary">Tasks imported</Typography>
                  </Box>
                  <Box>
                    <Typography variant="h4" fontWeight={700} color="text.secondary">{importResult.skipped}</Typography>
                    <Typography variant="body2" color="text.secondary">Rows skipped</Typography>
                  </Box>
                </Stack>
                {importResult.errors.length > 0 && (
                  <Box>
                    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 1 }}>
                      <ErrorOutline fontSize="small" color="warning" />
                      <Typography variant="subtitle2" color="warning.main">Warnings ({importResult.errors.length})</Typography>
                    </Stack>
                    <Paper variant="outlined" sx={{ p: 1.5, maxHeight: 160, overflowY: 'auto' }}>
                      {importResult.errors.map((e, i) => (
                        <Typography key={i} variant="caption" display="block" color="text.secondary">{e}</Typography>
                      ))}
                    </Paper>
                  </Box>
                )}
                <Button
                  variant="outlined"
                  onClick={() => {
                    setImportStep('upload');
                    setImportFile(null);
                    setImportHeaders([]);
                    setImportPreview([]);
                    setImportMapping({});
                    setImportSprintId('');
                    setImportResult(null);
                  }}
                >
                  Import Another File
                </Button>
              </Stack>
            )}
          </Box>
        </TabPanel>

        {/* Reports Tab */}
        <TabPanel value={tabValue} index={5}>
          <Box sx={{ px: 3 }}>
            <Stack spacing={4}>
              {/* Velocity Chart */}
              <Box>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 0.5 }}>Sprint Velocity</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Planned vs completed tasks per sprint. Average: {velocityData?.avg_completed_tasks ?? '—'} tasks/sprint ({velocityData?.avg_completion_rate ?? '—'}%).
                </Typography>
                {velocityData && velocityData.sprints.length > 0 ? (
                  <Box sx={{ maxHeight: 280 }}>
                    <Bar
                      data={{
                        labels: velocityData.sprints.map((s) => s.sprint_name),
                        datasets: [
                          {
                            label: 'Planned',
                            data: velocityData.sprints.map((s) => s.planned_tasks),
                            backgroundColor: 'rgba(102,126,234,0.25)',
                            borderColor: 'rgba(102,126,234,0.8)',
                            borderWidth: 1,
                          },
                          {
                            label: 'Completed',
                            data: velocityData.sprints.map((s) => s.completed_tasks),
                            backgroundColor: 'rgba(72,199,142,0.7)',
                            borderColor: 'rgba(72,199,142,1)',
                            borderWidth: 1,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        plugins: { legend: { position: 'top' as const } },
                        scales: {
                          y: { beginAtZero: true, title: { display: true, text: 'Tasks' }, ticks: { stepSize: 1 } },
                        },
                      }}
                    />
                  </Box>
                ) : (
                  <Typography color="text.secondary">No sprint data available.</Typography>
                )}
              </Box>

              <Divider />

              {/* Cumulative Flow */}
              <Box>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 0.5 }}>Cumulative Flow (last 60 days)</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Total tasks created vs completed over time.
                </Typography>
                {cumulativeFlowData && cumulativeFlowData.dates.length > 0 ? (
                  <Box sx={{ maxHeight: 280 }}>
                    <Line
                      data={{
                        labels: cumulativeFlowData.dates.map((d) =>
                          new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                        ),
                        datasets: cumulativeFlowData.series.map((s, i) => ({
                          label: s.label,
                          data: s.data,
                          borderColor: i === 0 ? 'rgba(102,126,234,0.9)' : 'rgba(72,199,142,0.9)',
                          backgroundColor: i === 0 ? 'rgba(102,126,234,0.15)' : 'rgba(72,199,142,0.2)',
                          fill: true,
                          borderWidth: 2,
                          pointRadius: 0,
                          tension: 0.3,
                        })),
                      }}
                      options={{
                        responsive: true,
                        plugins: { legend: { position: 'top' as const } },
                        scales: {
                          y: { beginAtZero: true, title: { display: true, text: 'Tasks (cumulative)' } },
                          x: { ticks: { maxTicksLimit: 10 } },
                        },
                      }}
                    />
                  </Box>
                ) : (
                  <Typography color="text.secondary">No task data available.</Typography>
                )}
              </Box>

              <Divider />

              {/* Cycle Time */}
              <Box>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 0.5 }}>Cycle Time</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Average time from task creation to completion ({cycleTimeData?.total_done_tasks ?? 0} done tasks analysed).
                </Typography>
                {cycleTimeData ? (
                  <Stack spacing={3}>
                    <Chip
                      icon={<Speed />}
                      label={`Avg cycle time: ${cycleTimeData.avg_cycle_time_days} days`}
                      color={
                        cycleTimeData.avg_cycle_time_days === 0 ? 'default' :
                        cycleTimeData.avg_cycle_time_days <= 3 ? 'success' :
                        cycleTimeData.avg_cycle_time_days <= 10 ? 'primary' : 'warning'
                      }
                      sx={{ alignSelf: 'flex-start', fontWeight: 600, fontSize: '0.9rem', px: 1 }}
                    />
                    {cycleTimeData.total_done_tasks > 0 && (
                      <Box sx={{ maxHeight: 220 }}>
                        <Bar
                          data={{
                            labels: cycleTimeData.histogram.map((b) => b.label),
                            datasets: [
                              {
                                label: 'Tasks',
                                data: cycleTimeData.histogram.map((b) => b.count),
                                backgroundColor: 'rgba(102,126,234,0.6)',
                                borderColor: 'rgba(102,126,234,0.9)',
                                borderWidth: 1,
                              },
                            ],
                          }}
                          options={{
                            responsive: true,
                            plugins: { legend: { display: false } },
                            scales: {
                              y: { beginAtZero: true, title: { display: true, text: 'Tasks' }, ticks: { stepSize: 1 } },
                              x: { title: { display: true, text: 'Cycle time bucket' } },
                            },
                          }}
                        />
                      </Box>
                    )}
                  </Stack>
                ) : (
                  <Typography color="text.secondary">No completed tasks to analyse.</Typography>
                )}
              </Box>
            </Stack>
          </Box>
        </TabPanel>

        {/* Docs Tab */}
        <TabPanel value={tabValue} index={6}>
          <Box sx={{ px: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
              <Typography variant="h6" fontWeight={600}>
                Project Docs
              </Typography>
              <Button startIcon={<Add />} variant="contained" onClick={() => setShowNewDocForm(true)}>
                New Doc
              </Button>
            </Stack>

            {showNewDocForm && (
              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <TextField
                    autoFocus
                    size="small"
                    placeholder="Document title"
                    value={newDocTitle}
                    onChange={(e) => setNewDocTitle(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === 'Escape') { setShowNewDocForm(false); setNewDocTitle(''); }
                      if (e.key === 'Enter' && newDocTitle.trim()) {
                        e.preventDefault();
                        try {
                          const doc = await createDoc({ project: projectId, title: newDocTitle.trim(), content: '' }).unwrap();
                          setShowNewDocForm(false);
                          setNewDocTitle('');
                          enqueueSnackbar('Doc created', { variant: 'success' });
                          navigate(`/projects/${projectId}/docs/${doc.id}`);
                        } catch {
                          enqueueSnackbar('Failed to create doc', { variant: 'error' });
                        }
                      }
                    }}
                    sx={{ flex: 1 }}
                  />
                  <Button
                    variant="contained"
                    size="small"
                    disabled={!newDocTitle.trim()}
                    onClick={async () => {
                      try {
                        const doc = await createDoc({ project: projectId, title: newDocTitle.trim(), content: '' }).unwrap();
                        setShowNewDocForm(false);
                        setNewDocTitle('');
                        enqueueSnackbar('Doc created', { variant: 'success' });
                        navigate(`/projects/${projectId}/docs/${doc.id}`);
                      } catch {
                        enqueueSnackbar('Failed to create doc', { variant: 'error' });
                      }
                    }}
                  >
                    Create
                  </Button>
                  <Button size="small" onClick={() => { setShowNewDocForm(false); setNewDocTitle(''); }}>
                    Cancel
                  </Button>
                </Stack>
              </Paper>
            )}

            {docs && docs.length > 0 ? (
              <Stack spacing={1}>
                {docs.map((doc) => (
                  <Paper
                    key={doc.id}
                    variant="outlined"
                    sx={{
                      px: 2,
                      py: 1.5,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' },
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    onClick={() => navigate(`/projects/${projectId}/docs/${doc.id}`)}
                  >
                    <Article fontSize="small" color="action" sx={{ mr: 1.5, flexShrink: 0 }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={600} noWrap>
                        {doc.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Updated {new Date(doc.updated_at).toLocaleDateString()}
                        {doc.created_by_username && ` · ${doc.created_by_username}`}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={0.5} flexShrink={0}>
                      <IconButton
                        size="small"
                        component={RouterLink}
                        to={`/projects/${projectId}/docs/${doc.id}`}
                        onClick={(e) => e.stopPropagation()}
                        title="Open doc"
                      >
                        <OpenInNew fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!window.confirm(`Delete "${doc.title}"?`)) return;
                          try {
                            await deleteDocItem({ id: doc.id, projectId }).unwrap();
                            enqueueSnackbar('Doc deleted', { variant: 'success' });
                          } catch {
                            enqueueSnackbar('Failed to delete doc', { variant: 'error' });
                          }
                        }}
                        title="Delete doc"
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            ) : (
              <Typography color="text.secondary">
                No documents yet. Click "New Doc" to create the first one.
              </Typography>
            )}
          </Box>
        </TabPanel>
      </Paper>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Edit Project</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Name"
              value={editForm.name}
              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Description"
              value={editForm.description}
              onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
              multiline
              rows={3}
              fullWidth
            />
            <TextField
              label="Status"
              value={editForm.status}
              onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value as typeof editForm.status }))}
              select
              fullWidth
            >
              <MenuItem value="planning">Planning</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="on_hold">On Hold</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleEditSubmit} variant="contained" disabled={updating}>
            {updating ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Project</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{project.name}"? This action cannot be undone and will
            delete all associated milestones, sprints, and tasks.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={memberDialogOpen} onClose={() => setMemberDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add Team Member</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Select a workspace member to add to this project:
          </Typography>
          <Stack spacing={1}>
            {availableMembers && availableMembers.length > 0 ? (
              availableMembers.map((user) => (
                <Card
                  key={user.id}
                  variant="outlined"
                  sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                  onClick={() => { handleAddMember(user.id); setMemberDialogOpen(false); }}
                >
                  <CardContent sx={{ py: 1.5 }}>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                        {user.username?.[0]?.toUpperCase() || '?'}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2">
                          {user.first_name && user.last_name
                            ? `${user.first_name} ${user.last_name}`
                            : user.username}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {user.email}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Typography color="text.secondary" textAlign="center" sx={{ py: 2 }}>
                No available workspace members to add.
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMemberDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Bulk action floating bar */}
      {selectedTaskIds.size > 0 && (
        <Paper
          elevation={6}
          sx={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            px: 3,
            py: 1.5,
            zIndex: 1300,
            borderRadius: 3,
            whiteSpace: 'nowrap',
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Typography variant="body2" color="text.secondary">
              {selectedTaskIds.size} task{selectedTaskIds.size > 1 ? 's' : ''} selected
            </Typography>
            <Divider orientation="vertical" flexItem />
            <Button size="small" variant="contained" color="success" onClick={() => handleBulkUpdate('Done')}>
              Mark Done
            </Button>
            <Button size="small" variant="contained" onClick={() => handleBulkUpdate('In Progress')}>
              In Progress
            </Button>
            <Button size="small" variant="outlined" color="warning" onClick={() => handleBulkUpdate('Review')}>
              Review
            </Button>
            <IconButton size="small" onClick={() => setSelectedTaskIds(new Set())}>
              <Close fontSize="small" />
            </IconButton>
          </Stack>
        </Paper>
      )}

      {/* Task Detail Modal */}
      <TaskDetailModal
        taskId={openTaskId}
        open={Boolean(openTaskId)}
        onClose={() => setOpenTaskId(null)}
        onDeleted={() => setOpenTaskId(null)}
      />

      {/* Add Milestone Dialog */}
      <Dialog open={milestoneDialogOpen} onClose={() => setMilestoneDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add Milestone</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Name"
              value={milestoneForm.name}
              onChange={(e) => setMilestoneForm((f) => ({ ...f, name: e.target.value }))}
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={milestoneForm.description}
              onChange={(e) => setMilestoneForm((f) => ({ ...f, description: e.target.value }))}
              multiline
              rows={3}
              fullWidth
            />
            <TextField
              label="Start Date"
              type="date"
              value={milestoneForm.start_date}
              onChange={(e) => setMilestoneForm((f) => ({ ...f, start_date: e.target.value }))}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="End Date"
              type="date"
              value={milestoneForm.end_date}
              onChange={(e) => setMilestoneForm((f) => ({ ...f, end_date: e.target.value }))}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMilestoneDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateMilestone} variant="contained" disabled={creatingMilestone}>
            {creatingMilestone ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
