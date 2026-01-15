import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
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
  Grid,
  IconButton,
  LinearProgress,
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
  Folder,
  CalendarMonth,
  People,
  Assignment,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useCreateProjectMutation, useListProjectsQuery, Project } from '../api/projectApi';

const statusColors: Record<string, 'default' | 'primary' | 'warning' | 'success' | 'error'> = {
  planning: 'default',
  active: 'primary',
  on_hold: 'warning',
  completed: 'success',
  cancelled: 'error',
};

export const ProjectsPage = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { data: projects, isLoading, error } = useListProjectsQuery();
  const [createProject, { isLoading: creating }] = useCreateProjectMutation();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{
    name: string;
    description: string;
    status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
    visibility: 'public' | 'private';
  }>({
    name: '',
    description: '',
    status: 'planning',
    visibility: 'private',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await createProject(form).unwrap();
      enqueueSnackbar('Project created successfully', { variant: 'success' });
      setOpen(false);
      setForm({ name: '', description: '', status: 'planning', visibility: 'private' });
      navigate(`/projects/${result.id}`);
    } catch {
      enqueueSnackbar('Failed to create project', { variant: 'error' });
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>
          Projects
        </Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>
          New Project
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load projects
        </Alert>
      )}

      {isLoading ? (
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
              <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      ) : projects && projects.length > 0 ? (
        <Grid container spacing={3}>
          {projects.map((project) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={project.id}>
              <Card
                sx={{
                  height: '100%',
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                }}
              >
                <CardActionArea
                  onClick={() => navigate(`/projects/${project.id}`)}
                  sx={{ height: '100%' }}
                >
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                      <Box
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                          color: 'primary.main',
                        }}
                      >
                        <Folder />
                      </Box>
                      <Stack direction="row" spacing={0.5}>
                        <Chip
                          label={project.status?.replace('_', ' ') || 'planning'}
                          color={statusColors[project.status] || 'default'}
                          size="small"
                        />
                      </Stack>
                    </Stack>

                    <Typography variant="h6" fontWeight={600} gutterBottom noWrap>
                      {project.name}
                    </Typography>

                    {project.description && (
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
                          minHeight: 40,
                        }}
                      >
                        {project.description}
                      </Typography>
                    )}

                    <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                      {project.end_date && (
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <CalendarMonth fontSize="small" color="action" />
                          <Typography variant="caption" color="text.secondary">
                            {new Date(project.end_date).toLocaleDateString()}
                          </Typography>
                        </Stack>
                      )}
                      {project.members_count !== undefined && (
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <People fontSize="small" color="action" />
                          <Typography variant="caption" color="text.secondary">
                            {project.members_count}
                          </Typography>
                        </Stack>
                      )}
                      {project.tasks_count !== undefined && (
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <Assignment fontSize="small" color="action" />
                          <Typography variant="caption" color="text.secondary">
                            {project.tasks_count}
                          </Typography>
                        </Stack>
                      )}
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Folder sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No projects yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Create your first project to get started
          </Typography>
          <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>
            Create Project
          </Button>
        </Paper>
      )}

      {/* Create Project Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create New Project</DialogTitle>
        <DialogContent>
          <Stack spacing={2} component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <TextField
              label="Project Name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              required
              fullWidth
              placeholder="e.g., Website Redesign"
            />
            <TextField
              label="Description"
              value={form.description}
              multiline
              minRows={3}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              fullWidth
              placeholder="What's this project about?"
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Status"
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as typeof form.status }))}
                select
                fullWidth
              >
                <MenuItem value="planning">Planning</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="on_hold">On Hold</MenuItem>
              </TextField>
              <TextField
                label="Visibility"
                value={form.visibility}
                onChange={(e) => setForm((p) => ({ ...p, visibility: e.target.value as typeof form.visibility }))}
                select
                fullWidth
              >
                <MenuItem value="private">Private</MenuItem>
                <MenuItem value="public">Public</MenuItem>
              </TextField>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={creating || !form.name.trim()}
            variant="contained"
          >
            {creating ? 'Creating...' : 'Create Project'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
