import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Box,
  Breadcrumbs,
  Button,
  Card,
  CardActionArea,
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
  Add,
  ArrowBack,
  CalendarMonth,
  Delete,
  Edit,
  Folder,
  MoreVert,
  People,
  Person,
  PersonAdd,
  Settings,
  History,
  AdminPanelSettings,
  Search,
  CheckCircle,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import {
  useGetWorkspaceQuery,
  useUpdateWorkspaceMutation,
  useDeleteWorkspaceMutation,
  useGetWorkspaceMembersQuery,
  useAddWorkspaceMemberMutation,
  useRemoveWorkspaceMemberMutation,
  useGetWorkspaceProjectsQuery,
} from '../api/workspaceApi';
import { useListUsersQuery } from '../api/userApi';
import { useCreateProjectMutation } from '../api/projectApi';
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

export const WorkspaceDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const workspaceId = Number(id);

  const [tabValue, setTabValue] = useState(0);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  const [projectForm, setProjectForm] = useState({ name: '', description: '', visibility: 'private', start_date: '', end_date: '' });
  const [settingsForm, setSettingsForm] = useState({ name: '', description: '' });
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

  const { data: workspace, isLoading, error } = useGetWorkspaceQuery(workspaceId);
  const { data: members } = useGetWorkspaceMembersQuery(workspaceId);
  const { data: projects } = useGetWorkspaceProjectsQuery(workspaceId);
  const { data: allUsers } = useListUsersQuery();

  const [updateWorkspace, { isLoading: updating }] = useUpdateWorkspaceMutation();
  const [deleteWorkspace, { isLoading: deleting }] = useDeleteWorkspaceMutation();
  const [addMember] = useAddWorkspaceMemberMutation();
  const [removeMember] = useRemoveWorkspaceMemberMutation();
  const [createProject, { isLoading: creatingProject }] = useCreateProjectMutation();

  // Initialize settings form when workspace loads
  useEffect(() => {
    if (workspace) {
      setSettingsForm({
        name: workspace.name,
        description: workspace.description || '',
      });
    }
  }, [workspace]);

  const handleEditOpen = () => {
    if (workspace) {
      setEditForm({
        name: workspace.name,
        description: workspace.description || '',
      });
    }
    setEditDialogOpen(true);
    setMenuAnchor(null);
  };

  const handleSettingsSave = async () => {
    try {
      await updateWorkspace({ id: workspaceId, data: settingsForm }).unwrap();
      enqueueSnackbar('Settings saved successfully', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to save settings', { variant: 'error' });
    }
  };

  const handleEditSubmit = async () => {
    try {
      await updateWorkspace({ id: workspaceId, data: editForm }).unwrap();
      enqueueSnackbar('Workspace updated successfully', { variant: 'success' });
      setEditDialogOpen(false);
    } catch {
      enqueueSnackbar('Failed to update workspace', { variant: 'error' });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteWorkspace(workspaceId).unwrap();
      enqueueSnackbar('Workspace deleted successfully', { variant: 'success' });
      navigate('/workspaces');
    } catch {
      enqueueSnackbar('Failed to delete workspace', { variant: 'error' });
    }
  };

  const handleAddMember = async (userId: number, isAdmin: boolean = false) => {
    try {
      await addMember({ workspaceId, userId, isAdmin }).unwrap();
      enqueueSnackbar('Member added successfully', { variant: 'success' });
      setMemberDialogOpen(false);
    } catch {
      enqueueSnackbar('Failed to add member', { variant: 'error' });
    }
  };

  const handleRemoveMember = async (userId: number) => {
    try {
      await removeMember({ workspaceId, userId }).unwrap();
      enqueueSnackbar('Member removed successfully', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to remove member', { variant: 'error' });
    }
  };

  const handleCreateProject = async () => {
    try {
      const result = await createProject({
        ...projectForm,
        workspace: workspaceId,
      } as any).unwrap();
      enqueueSnackbar('Project created successfully', { variant: 'success' });
      setProjectDialogOpen(false);
      setProjectForm({ name: '', description: '', visibility: 'private', start_date: '', end_date: '' });
      navigate(`/projects/${result.id}`);
    } catch {
      enqueueSnackbar('Failed to create project', { variant: 'error' });
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

  if (error || !workspace) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Workspace not found or you don't have access.</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/workspaces')} sx={{ mt: 2 }}>
          Back to Workspaces
        </Button>
      </Box>
    );
  }

  const availableUsers = allUsers?.filter(
    (u) => !members?.some((m) => m.user.id === u.id)
  );

  return (
    <Box>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link component={RouterLink} to="/workspaces" underline="hover" color="inherit">
          Workspaces
        </Link>
        <Typography color="text.primary">{workspace.name}</Typography>
      </Breadcrumbs>

      {/* Header Card */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                  color: 'primary.main',
                }}
              >
                <Folder sx={{ fontSize: 32 }} />
              </Box>
              <Box>
                <Typography variant="h4" fontWeight={700}>
                  {workspace.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Owned by {workspace.owner.username}
                </Typography>
              </Box>
            </Stack>
            {workspace.description && (
              <Typography color="text.secondary" sx={{ mt: 2, maxWidth: 600 }}>
                {workspace.description}
              </Typography>
            )}
            <Stack direction="row" spacing={3} sx={{ mt: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Folder fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  {projects?.length || 0} projects
                </Typography>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={1}>
                <People fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  {members?.length || 0} members
                </Typography>
              </Stack>
            </Stack>
          </Box>

          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setProjectDialogOpen(true)}
            >
              New Project
            </Button>
            <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)}>
              <MoreVert />
            </IconButton>
            <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
              <MenuItem onClick={handleEditOpen}>
                <Edit fontSize="small" sx={{ mr: 1 }} /> Edit Workspace
              </MenuItem>
              <MenuItem onClick={() => { setDeleteDialogOpen(true); setMenuAnchor(null); }}>
                <Delete fontSize="small" sx={{ mr: 1 }} color="error" /> Delete Workspace
              </MenuItem>
            </Menu>
          </Stack>
        </Stack>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ borderRadius: 2 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tab icon={<Folder />} iconPosition="start" label={`Projects (${projects?.length || 0})`} />
          <Tab icon={<People />} iconPosition="start" label={`Members (${members?.length || 0})`} />
          <Tab icon={<History />} iconPosition="start" label="Activity" />
          <Tab icon={<Settings />} iconPosition="start" label="Settings" />
        </Tabs>

        {/* Projects Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ px: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
              <Typography variant="h6" fontWeight={600}>
                Projects
              </Typography>
              <Button startIcon={<Add />} variant="outlined" onClick={() => setProjectDialogOpen(true)}>
                Add Project
              </Button>
            </Stack>
            {projects && projects.length > 0 ? (
              <Grid container spacing={2}>
                {projects.map((project) => (
                  <Grid item xs={12} sm={6} md={4} key={project.id}>
                    <Card
                      sx={{
                        transition: 'all 0.2s',
                        '&:hover': { transform: 'translateY(-2px)', boxShadow: 2 },
                      }}
                    >
                      <CardActionArea onClick={() => navigate(`/projects/${project.id}`)}>
                        <CardContent>
                          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1.5 }}>
                            <Box
                              sx={{
                                p: 1,
                                borderRadius: 1.5,
                                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                                color: 'primary.main',
                              }}
                            >
                              <Folder />
                            </Box>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="subtitle1" fontWeight={600}>
                                {project.name}
                              </Typography>
                              <Chip
                                label={project.status}
                                size="small"
                                color={project.status === 'active' ? 'primary' : 'default'}
                              />
                            </Box>
                          </Stack>
                          {(project.start_date || project.end_date) && (
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
                              <CalendarMonth fontSize="small" color="action" />
                              <Typography variant="caption" color="text.secondary">
                                {project.start_date
                                  ? new Date(project.start_date).toLocaleDateString()
                                  : 'No start'}
                                {' — '}
                                {project.end_date
                                  ? new Date(project.end_date).toLocaleDateString()
                                  : 'No end'}
                              </Typography>
                            </Stack>
                          )}
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'grey.50' }}>
                <Folder sx={{ fontSize: 48, color: 'grey.300', mb: 1 }} />
                <Typography color="text.secondary">
                  No projects in this workspace yet.
                </Typography>
              </Paper>
            )}
          </Box>
        </TabPanel>

        {/* Members Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ px: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
              <Typography variant="h6" fontWeight={600}>
                Team Members
              </Typography>
              <Button startIcon={<PersonAdd />} variant="contained" onClick={() => setMemberDialogOpen(true)}>
                Add Member
              </Button>
            </Stack>
            {members && members.length > 0 ? (
              <Grid container spacing={2}>
                {members.map((member) => (
                  <Grid item xs={12} sm={6} md={4} key={member.id}>
                    <Card variant="outlined">
                      <CardContent>
                        <Stack direction="row" alignItems="center" spacing={2}>
                          <Avatar sx={{ bgcolor: member.is_admin ? 'secondary.main' : 'primary.main' }}>
                            {member.user?.username?.[0]?.toUpperCase() || '?'}
                          </Avatar>
                          <Box sx={{ flex: 1 }}>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Typography variant="subtitle2" fontWeight={600}>
                                {member.user.first_name && member.user.last_name
                                  ? `${member.user.first_name} ${member.user.last_name}`
                                  : member.user.username}
                              </Typography>
                              {member.is_admin && (
                                <Chip
                                  icon={<AdminPanelSettings sx={{ fontSize: 14 }} />}
                                  label="Admin"
                                  size="small"
                                  color="secondary"
                                  sx={{ height: 20 }}
                                />
                              )}
                            </Stack>
                            <Typography variant="body2" color="text.secondary">
                              {member.user.email}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Joined {new Date(member.joined_at).toLocaleDateString()}
                            </Typography>
                          </Box>
                          {member.user.id !== workspace.owner.id && (
                            <IconButton
                              size="small"
                              onClick={() => handleRemoveMember(member.user.id)}
                              color="error"
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          )}
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Typography color="text.secondary">No members in this workspace.</Typography>
            )}
          </Box>
        </TabPanel>

        {/* Activity Tab */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ px: 3 }}>
            <ActivityLogList workspaceId={workspaceId} showFilters limit={50} />
          </Box>
        </TabPanel>

        {/* Settings Tab */}
        <TabPanel value={tabValue} index={3}>
          <Box sx={{ px: 3 }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
              Workspace Settings
            </Typography>
            <Grid container spacing={4}>
              {/* General Settings */}
              <Grid item xs={12} md={8}>
                <Paper variant="outlined" sx={{ p: 3 }}>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                    General Information
                  </Typography>
                  <Stack spacing={3}>
                    <TextField
                      label="Workspace Name"
                      value={settingsForm.name}
                      onChange={(e) => setSettingsForm((f) => ({ ...f, name: e.target.value }))}
                      fullWidth
                    />
                    <TextField
                      label="Description"
                      value={settingsForm.description}
                      onChange={(e) => setSettingsForm((f) => ({ ...f, description: e.target.value }))}
                      multiline
                      rows={3}
                      fullWidth
                      placeholder="What's this workspace for?"
                    />
                    <Box>
                      <Button
                        variant="contained"
                        onClick={handleSettingsSave}
                        disabled={updating || (settingsForm.name === workspace.name && settingsForm.description === (workspace.description || ''))}
                      >
                        {updating ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </Box>
                  </Stack>
                </Paper>

                {/* Workspace Info */}
                <Paper variant="outlined" sx={{ p: 3, mt: 3 }}>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                    Workspace Information
                  </Typography>
                  <Stack spacing={2}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">Owner</Typography>
                      <Typography variant="body2" fontWeight={500}>{workspace.owner.username}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">Created</Typography>
                      <Typography variant="body2">{new Date(workspace.created_at).toLocaleDateString()}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">Projects</Typography>
                      <Typography variant="body2">{projects?.length || 0}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">Members</Typography>
                      <Typography variant="body2">{members?.length || 0}</Typography>
                    </Stack>
                  </Stack>
                </Paper>
              </Grid>

              {/* Danger Zone */}
              <Grid item xs={12} md={4}>
                <Paper variant="outlined" sx={{ p: 3, borderColor: 'error.light' }}>
                  <Typography variant="subtitle1" fontWeight={600} color="error" sx={{ mb: 2 }}>
                    Danger Zone
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Once you delete a workspace, there is no going back. All projects, tasks, and data will be permanently deleted.
                  </Typography>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<Delete />}
                    onClick={() => setDeleteDialogOpen(true)}
                    fullWidth
                  >
                    Delete Workspace
                  </Button>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>
      </Paper>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Edit Workspace</DialogTitle>
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
        <DialogTitle>Delete Workspace</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{workspace.name}"? This will permanently delete all
            projects, tasks, and data in this workspace. This action cannot be undone.
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
      <Dialog open={memberDialogOpen} onClose={() => { setMemberDialogOpen(false); setMemberSearchQuery(''); }} fullWidth maxWidth="sm">
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <PersonAdd color="primary" />
            <span>Add Team Member</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Search and select users to add to this workspace.
          </Typography>

          {/* Search Field */}
          <TextField
            placeholder="Search users by name or email..."
            value={memberSearchQuery}
            onChange={(e) => setMemberSearchQuery(e.target.value)}
            fullWidth
            size="small"
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
          />

          {/* User List */}
          {availableUsers && availableUsers.length > 0 ? (
            <Paper variant="outlined" sx={{ maxHeight: 350, overflow: 'auto' }}>
              <Stack divider={<Divider />}>
                {availableUsers
                  .filter((user) =>
                    memberSearchQuery === '' ||
                    user.username.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
                    user.email?.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
                    user.first_name?.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
                    user.last_name?.toLowerCase().includes(memberSearchQuery.toLowerCase())
                  )
                  .map((user) => (
                    <Box
                      key={user.id}
                      sx={{
                        p: 2,
                        cursor: 'pointer',
                        transition: 'background-color 0.15s',
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                    >
                      <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Stack direction="row" alignItems="center" spacing={2}>
                          <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}>
                            {user.username?.[0]?.toUpperCase() || '?'}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2" fontWeight={600}>
                              {user.first_name && user.last_name
                                ? `${user.first_name} ${user.last_name}`
                                : user.username}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {user.email}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              @{user.username}
                            </Typography>
                          </Box>
                        </Stack>
                        <Stack direction="row" spacing={1}>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => handleAddMember(user.id, false)}
                          >
                            Add Member
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            color="secondary"
                            startIcon={<AdminPanelSettings sx={{ fontSize: 16 }} />}
                            onClick={() => handleAddMember(user.id, true)}
                          >
                            Add Admin
                          </Button>
                        </Stack>
                      </Stack>
                    </Box>
                  ))}
                {availableUsers.filter((user) =>
                  memberSearchQuery === '' ||
                  user.username.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
                  user.email?.toLowerCase().includes(memberSearchQuery.toLowerCase())
                ).length === 0 && (
                  <Box sx={{ p: 3, textAlign: 'center' }}>
                    <Typography color="text.secondary">No users match your search.</Typography>
                  </Box>
                )}
              </Stack>
            </Paper>
          ) : (
            <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
              <People sx={{ fontSize: 48, color: 'grey.300', mb: 1 }} />
              <Typography color="text.secondary">No available users to add.</Typography>
              <Typography variant="caption" color="text.secondary">
                All users are already members of this workspace.
              </Typography>
            </Paper>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setMemberDialogOpen(false); setMemberSearchQuery(''); }}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Create Project Dialog */}
      <Dialog open={projectDialogOpen} onClose={() => setProjectDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create New Project</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Project Name"
              value={projectForm.name}
              onChange={(e) => setProjectForm((f) => ({ ...f, name: e.target.value }))}
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={projectForm.description}
              onChange={(e) => setProjectForm((f) => ({ ...f, description: e.target.value }))}
              multiline
              rows={3}
              fullWidth
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Start Date"
                type="date"
                value={projectForm.start_date}
                onChange={(e) => setProjectForm((f) => ({ ...f, start_date: e.target.value }))}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="End Date"
                type="date"
                value={projectForm.end_date}
                onChange={(e) => setProjectForm((f) => ({ ...f, end_date: e.target.value }))}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Stack>
            <TextField
              label="Visibility"
              value={projectForm.visibility}
              onChange={(e) => setProjectForm((f) => ({ ...f, visibility: e.target.value }))}
              select
              fullWidth
            >
              <MenuItem value="private">Private</MenuItem>
              <MenuItem value="public">Public</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProjectDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreateProject}
            variant="contained"
            disabled={!projectForm.name.trim() || creatingProject}
          >
            {creatingProject ? 'Creating...' : 'Create Project'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
