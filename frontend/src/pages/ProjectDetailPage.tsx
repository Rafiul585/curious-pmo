import { useState } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Avatar,
  AvatarGroup,
  Box,
  Breadcrumbs,
  Button,
  Card,
  CardContent,
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
} from '@mui/icons-material';
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
import { useListTasksQuery } from '../api/taskApi';
import { MilestoneManager } from '../components/projects/MilestoneManager';
import { ActivityLogList } from '../components/activity/ActivityLogList';

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

export const ProjectDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const projectId = Number(id);

  const [tabValue, setTabValue] = useState(0);
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
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="h6" fontWeight={600}>
                    Milestones
                  </Typography>
                  <Button startIcon={<Add />} size="small" onClick={() => setMilestoneDialogOpen(true)}>
                    Add Milestone
                  </Button>
                </Stack>
                {milestones && milestones.length > 0 ? (
                  <Grid container spacing={2}>
                    {milestones.map((milestone) => (
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
                                <Chip
                                  label={milestone.status}
                                  color={statusColors[milestone.status] || 'default'}
                                  size="small"
                                />
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
                  <Typography color="text.secondary">No milestones yet.</Typography>
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
