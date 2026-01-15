import { useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Typography,
  alpha,
} from '@mui/material';
import {
  Add,
  Delete,
  Edit,
  ExpandMore,
  FlagCircle,
  MoreVert,
  Speed,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import {
  useListMilestonesQuery,
  useCreateMilestoneMutation,
  useUpdateMilestoneMutation,
  useDeleteMilestoneMutation,
  Milestone,
  MilestoneSprint,
} from '../../api/milestoneApi';
import {
  useCreateSprintMutation,
  useUpdateSprintMutation,
  useDeleteSprintMutation,
} from '../../api/sprintApi';

interface MilestoneManagerProps {
  projectId: number;
}

const statusColors: Record<string, 'default' | 'primary' | 'warning' | 'success' | 'error'> = {
  planning: 'default',
  active: 'primary',
  completed: 'success',
  cancelled: 'error',
};

export const MilestoneManager = ({ projectId }: MilestoneManagerProps) => {
  const { enqueueSnackbar } = useSnackbar();

  // Milestone state
  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [milestoneForm, setMilestoneForm] = useState({
    name: '',
    description: '',
    status: 'planning',
    start_date: '',
    end_date: '',
  });

  // Sprint state
  const [sprintDialogOpen, setSprintDialogOpen] = useState(false);
  const [editingSprint, setEditingSprint] = useState<MilestoneSprint | null>(null);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<number | null>(null);
  const [sprintForm, setSprintForm] = useState({
    name: '',
    description: '',
    status: 'planning',
    start_date: '',
    end_date: '',
    goal: '',
  });

  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuTarget, setMenuTarget] = useState<{ type: 'milestone' | 'sprint'; item: Milestone | MilestoneSprint } | null>(null);

  // API hooks
  const { data: milestones, isLoading: loadingMilestones } = useListMilestonesQuery({ project: projectId });
  const [createMilestone, { isLoading: creatingMilestone }] = useCreateMilestoneMutation();
  const [updateMilestone, { isLoading: updatingMilestone }] = useUpdateMilestoneMutation();
  const [deleteMilestone] = useDeleteMilestoneMutation();
  const [createSprint, { isLoading: creatingSprint }] = useCreateSprintMutation();
  const [updateSprint, { isLoading: updatingSprint }] = useUpdateSprintMutation();
  const [deleteSprint] = useDeleteSprintMutation();

  // Milestone handlers
  const handleOpenMilestoneDialog = (milestone?: Milestone) => {
    if (milestone) {
      setEditingMilestone(milestone);
      setMilestoneForm({
        name: milestone.name,
        description: milestone.description || '',
        status: milestone.status,
        start_date: milestone.start_date || '',
        end_date: milestone.end_date || '',
      });
    } else {
      setEditingMilestone(null);
      setMilestoneForm({ name: '', description: '', status: 'planning', start_date: '', end_date: '' });
    }
    setMilestoneDialogOpen(true);
  };

  const handleSaveMilestone = async () => {
    try {
      if (editingMilestone) {
        await updateMilestone({
          id: editingMilestone.id,
          data: {
            ...milestoneForm,
            start_date: milestoneForm.start_date || undefined,
            end_date: milestoneForm.end_date || undefined,
          },
        }).unwrap();
        enqueueSnackbar('Milestone updated successfully', { variant: 'success' });
      } else {
        await createMilestone({
          ...milestoneForm,
          project: projectId,
          start_date: milestoneForm.start_date || undefined,
          end_date: milestoneForm.end_date || undefined,
        }).unwrap();
        enqueueSnackbar('Milestone created successfully', { variant: 'success' });
      }
      setMilestoneDialogOpen(false);
    } catch {
      enqueueSnackbar('Failed to save milestone', { variant: 'error' });
    }
  };

  const handleDeleteMilestone = async (id: number) => {
    try {
      await deleteMilestone(id).unwrap();
      enqueueSnackbar('Milestone deleted successfully', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to delete milestone', { variant: 'error' });
    }
    setMenuAnchor(null);
  };

  // Sprint handlers
  const handleOpenSprintDialog = (milestoneId: number, sprint?: MilestoneSprint) => {
    setSelectedMilestoneId(milestoneId);
    if (sprint) {
      setEditingSprint(sprint);
      setSprintForm({
        name: sprint.name,
        description: sprint.description || '',
        status: sprint.status,
        start_date: sprint.start_date || '',
        end_date: sprint.end_date || '',
        goal: '',
      });
    } else {
      setEditingSprint(null);
      setSprintForm({ name: '', description: '', status: 'planning', start_date: '', end_date: '', goal: '' });
    }
    setSprintDialogOpen(true);
  };

  const handleSaveSprint = async () => {
    if (!selectedMilestoneId) return;
    try {
      if (editingSprint) {
        await updateSprint({
          id: editingSprint.id,
          data: {
            ...sprintForm,
            start_date: sprintForm.start_date || undefined,
            end_date: sprintForm.end_date || undefined,
          },
        }).unwrap();
        enqueueSnackbar('Sprint updated successfully', { variant: 'success' });
      } else {
        await createSprint({
          ...sprintForm,
          milestone: selectedMilestoneId,
          start_date: sprintForm.start_date || undefined,
          end_date: sprintForm.end_date || undefined,
        }).unwrap();
        enqueueSnackbar('Sprint created successfully', { variant: 'success' });
      }
      setSprintDialogOpen(false);
    } catch {
      enqueueSnackbar('Failed to save sprint', { variant: 'error' });
    }
  };

  const handleDeleteSprint = async (id: number) => {
    try {
      await deleteSprint(id).unwrap();
      enqueueSnackbar('Sprint deleted successfully', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to delete sprint', { variant: 'error' });
    }
    setMenuAnchor(null);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, type: 'milestone' | 'sprint', item: Milestone | MilestoneSprint) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setMenuTarget({ type, item });
  };

  if (loadingMilestones) {
    return <LinearProgress />;
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6" fontWeight={600}>
          Milestones & Sprints
        </Typography>
        <Button startIcon={<Add />} variant="contained" onClick={() => handleOpenMilestoneDialog()}>
          Add Milestone
        </Button>
      </Stack>

      {milestones && milestones.length > 0 ? (
        <Stack spacing={2}>
          {milestones.map((milestone) => {
            const milestoneSprints = milestone.sprints || [];
            return (
              <Accordion key={milestone.id} defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Stack direction="row" alignItems="center" spacing={2} sx={{ flex: 1, mr: 2 }}>
                    <FlagCircle color="primary" />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {milestone.name}
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                          label={milestone.status}
                          color={statusColors[milestone.status] || 'default'}
                          size="small"
                        />
                        {milestone.start_date && milestone.end_date && (
                          <Typography variant="caption" color="text.secondary">
                            {new Date(milestone.start_date).toLocaleDateString()} -{' '}
                            {new Date(milestone.end_date).toLocaleDateString()}
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary">
                          ({milestoneSprints.length} sprints)
                        </Typography>
                      </Stack>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, 'milestone', milestone)}
                    >
                      <MoreVert />
                    </IconButton>
                  </Stack>
                </AccordionSummary>
                <AccordionDetails>
                  {milestone.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {milestone.description}
                    </Typography>
                  )}

                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" fontWeight={600}>
                      Sprints
                    </Typography>
                    <Button
                      size="small"
                      startIcon={<Add />}
                      onClick={() => handleOpenSprintDialog(milestone.id)}
                    >
                      Add Sprint
                    </Button>
                  </Stack>

                  {milestoneSprints.length > 0 ? (
                    <Stack spacing={1}>
                      {milestoneSprints.map((sprint) => (
                        <Card key={sprint.id} variant="outlined">
                          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                            <Stack direction="row" alignItems="center" justifyContent="space-between">
                              <Stack direction="row" alignItems="center" spacing={2}>
                                <Speed color="action" fontSize="small" />
                                <Box>
                                  <Typography variant="subtitle2" fontWeight={600}>
                                    {sprint.name}
                                  </Typography>
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <Chip
                                      label={sprint.status}
                                      color={statusColors[sprint.status] || 'default'}
                                      size="small"
                                      sx={{ height: 20 }}
                                    />
                                    {sprint.start_date && sprint.end_date && (
                                      <Typography variant="caption" color="text.secondary">
                                        {new Date(sprint.start_date).toLocaleDateString()} -{' '}
                                        {new Date(sprint.end_date).toLocaleDateString()}
                                      </Typography>
                                    )}
                                  </Stack>
                                </Box>
                              </Stack>
                              <IconButton
                                size="small"
                                onClick={(e) => handleMenuOpen(e, 'sprint', sprint)}
                              >
                                <MoreVert fontSize="small" />
                              </IconButton>
                            </Stack>
                          </CardContent>
                        </Card>
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                      No sprints in this milestone yet.
                    </Typography>
                  )}
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Stack>
      ) : (
        <Alert severity="info">
          No milestones yet. Create a milestone to organize your project into phases.
        </Alert>
      )}

      {/* Context Menu */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem
          onClick={() => {
            if (menuTarget?.type === 'milestone') {
              handleOpenMilestoneDialog(menuTarget.item as Milestone);
            } else if (menuTarget?.type === 'sprint') {
              const sprint = menuTarget.item as MilestoneSprint;
              handleOpenSprintDialog(sprint.milestone, sprint);
            }
            setMenuAnchor(null);
          }}
        >
          <Edit fontSize="small" sx={{ mr: 1 }} /> Edit
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuTarget?.type === 'milestone') {
              handleDeleteMilestone(menuTarget.item.id);
            } else if (menuTarget?.type === 'sprint') {
              handleDeleteSprint(menuTarget.item.id);
            }
          }}
          sx={{ color: 'error.main' }}
        >
          <Delete fontSize="small" sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>

      {/* Milestone Dialog */}
      <Dialog open={milestoneDialogOpen} onClose={() => setMilestoneDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingMilestone ? 'Edit Milestone' : 'Create Milestone'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Milestone Name"
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
              rows={2}
              fullWidth
            />
            <TextField
              label="Status"
              value={milestoneForm.status}
              onChange={(e) => setMilestoneForm((f) => ({ ...f, status: e.target.value }))}
              select
              fullWidth
            >
              <MenuItem value="planning">Planning</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </TextField>
            <Stack direction="row" spacing={2}>
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
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMilestoneDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSaveMilestone}
            variant="contained"
            disabled={!milestoneForm.name.trim() || creatingMilestone || updatingMilestone}
          >
            {creatingMilestone || updatingMilestone ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Sprint Dialog */}
      <Dialog open={sprintDialogOpen} onClose={() => setSprintDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingSprint ? 'Edit Sprint' : 'Create Sprint'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Sprint Name"
              value={sprintForm.name}
              onChange={(e) => setSprintForm((f) => ({ ...f, name: e.target.value }))}
              fullWidth
              required
            />
            <TextField
              label="Goal"
              value={sprintForm.goal}
              onChange={(e) => setSprintForm((f) => ({ ...f, goal: e.target.value }))}
              fullWidth
              placeholder="What do you want to achieve in this sprint?"
            />
            <TextField
              label="Description"
              value={sprintForm.description}
              onChange={(e) => setSprintForm((f) => ({ ...f, description: e.target.value }))}
              multiline
              rows={2}
              fullWidth
            />
            <TextField
              label="Status"
              value={sprintForm.status}
              onChange={(e) => setSprintForm((f) => ({ ...f, status: e.target.value }))}
              select
              fullWidth
            >
              <MenuItem value="planning">Planning</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </TextField>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Start Date"
                type="date"
                value={sprintForm.start_date}
                onChange={(e) => setSprintForm((f) => ({ ...f, start_date: e.target.value }))}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="End Date"
                type="date"
                value={sprintForm.end_date}
                onChange={(e) => setSprintForm((f) => ({ ...f, end_date: e.target.value }))}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSprintDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSaveSprint}
            variant="contained"
            disabled={!sprintForm.name.trim() || creatingSprint || updatingSprint}
          >
            {creatingSprint || updatingSprint ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
