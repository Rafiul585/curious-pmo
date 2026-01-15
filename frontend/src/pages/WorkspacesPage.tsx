import { useState } from 'react';
import {
  Alert,
  Avatar,
  AvatarGroup,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Typography,
  alpha,
} from '@mui/material';
import {
  Add,
  MoreVert,
  Edit,
  Delete,
  Folder,
  People,
  Settings,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import {
  useListWorkspacesQuery,
  useCreateWorkspaceMutation,
  useUpdateWorkspaceMutation,
  useDeleteWorkspaceMutation,
} from '../api/workspaceApi';

export const WorkspacesPage = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<{ id: number; name: string; description?: string } | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [form, setForm] = useState({ name: '', description: '' });

  const { data: workspaces, isLoading, error } = useListWorkspacesQuery();
  const [createWorkspace, { isLoading: creating }] = useCreateWorkspaceMutation();
  const [updateWorkspace, { isLoading: updating }] = useUpdateWorkspaceMutation();
  const [deleteWorkspace, { isLoading: deleting }] = useDeleteWorkspaceMutation();

  const handleCreateSubmit = async () => {
    try {
      const result = await createWorkspace(form).unwrap();
      enqueueSnackbar('Workspace created successfully', { variant: 'success' });
      setCreateDialogOpen(false);
      setForm({ name: '', description: '' });
      navigate(`/workspaces/${result.id}`);
    } catch {
      enqueueSnackbar('Failed to create workspace', { variant: 'error' });
    }
  };

  const handleEditOpen = () => {
    if (selectedWorkspace) {
      setForm({
        name: selectedWorkspace.name,
        description: selectedWorkspace.description || '',
      });
      setEditDialogOpen(true);
    }
    setMenuAnchor(null);
  };

  const handleEditSubmit = async () => {
    if (!selectedWorkspace) return;
    try {
      await updateWorkspace({ id: selectedWorkspace.id, data: form }).unwrap();
      enqueueSnackbar('Workspace updated successfully', { variant: 'success' });
      setEditDialogOpen(false);
      setSelectedWorkspace(null);
      setForm({ name: '', description: '' });
    } catch {
      enqueueSnackbar('Failed to update workspace', { variant: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!selectedWorkspace) return;
    try {
      await deleteWorkspace(selectedWorkspace.id).unwrap();
      enqueueSnackbar('Workspace deleted successfully', { variant: 'success' });
      setDeleteDialogOpen(false);
      setSelectedWorkspace(null);
    } catch {
      enqueueSnackbar('Failed to delete workspace', { variant: 'error' });
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, workspace: { id: number; name: string; description?: string }) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setSelectedWorkspace(workspace);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>
          Workspaces
        </Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setCreateDialogOpen(true)}>
          New Workspace
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load workspaces
        </Alert>
      )}

      {isLoading ? (
        <Grid container spacing={3}>
          {[1, 2, 3].map((i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton variant="rectangular" height={180} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      ) : workspaces && workspaces.length > 0 ? (
        <Grid container spacing={3}>
          {workspaces.map((workspace) => (
            <Grid item xs={12} sm={6} md={4} key={workspace.id}>
              <Card
                sx={{
                  height: '100%',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                }}
                onClick={() => navigate(`/workspaces/${workspace.id}`)}
              >
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                        color: 'primary.main',
                        mb: 2,
                      }}
                    >
                      <Folder />
                    </Box>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, workspace)}
                    >
                      <MoreVert />
                    </IconButton>
                  </Stack>

                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    {workspace.name}
                  </Typography>
                  {workspace.description && (
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
                      {workspace.description}
                    </Typography>
                  )}

                  <Stack direction="row" spacing={3} sx={{ mt: 2 }}>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Folder fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        {workspace.projects_count || workspace.project_count || 0} projects
                      </Typography>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <People fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        {workspace.members_count || workspace.member_count || 0} members
                      </Typography>
                    </Stack>
                  </Stack>

                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      Owner: {workspace.owner.username}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Folder sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No workspaces yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Create your first workspace to organize your projects and team
          </Typography>
          <Button variant="contained" startIcon={<Add />} onClick={() => setCreateDialogOpen(true)}>
            Create Workspace
          </Button>
        </Paper>
      )}

      {/* Context Menu */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleMenuClose}>
        <MenuItem onClick={() => { navigate(`/workspaces/${selectedWorkspace?.id}`); handleMenuClose(); }}>
          <Settings fontSize="small" sx={{ mr: 1 }} /> Manage
        </MenuItem>
        <MenuItem onClick={handleEditOpen}>
          <Edit fontSize="small" sx={{ mr: 1 }} /> Edit
        </MenuItem>
        <MenuItem
          onClick={() => { setDeleteDialogOpen(true); handleMenuClose(); }}
          sx={{ color: 'error.main' }}
        >
          <Delete fontSize="small" sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create New Workspace</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Workspace Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              fullWidth
              required
              placeholder="e.g., Marketing Team"
            />
            <TextField
              label="Description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              fullWidth
              multiline
              rows={3}
              placeholder="What's this workspace for?"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreateSubmit}
            variant="contained"
            disabled={!form.name.trim() || creating}
          >
            {creating ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Edit Workspace</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Workspace Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              fullWidth
              multiline
              rows={3}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleEditSubmit}
            variant="contained"
            disabled={!form.name.trim() || updating}
          >
            {updating ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Workspace</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedWorkspace?.name}"? This will delete all
            projects, tasks, and data in this workspace. This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
