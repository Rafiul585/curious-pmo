import { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
  alpha,
} from '@mui/material';
import {
  Add,
  Delete,
  ExpandLess,
  ExpandMore,
  EmojiEvents,
  Sync,
  TrackChanges,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import {
  useListGoalsQuery,
  useCreateGoalMutation,
  useDeleteGoalMutation,
  useSyncGoalMutation,
  useCreateGoalTargetMutation,
  useDeleteGoalTargetMutation,
} from '../api/goalsApi';
import type { Goal, CreateGoal, CreateGoalTarget } from '../api/goalsApi';
import { useListWorkspacesQuery } from '../api/workspaceApi';
import { useListProjectsQuery } from '../api/projectApi';

// ─── circular progress ring ──────────────────────────────────────────────────
function ProgressRing({ value, size = 64 }: { value: number; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, value));
  const dash = (pct / 100) * circ;
  const color = pct >= 75 ? '#4caf50' : pct >= 40 ? '#ff9800' : '#2196f3';

  return (
    <Box sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e0e0e0" strokeWidth={6} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
        />
      </svg>
      <Typography
        variant="caption"
        fontWeight={700}
        sx={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: size < 56 ? '0.6rem' : '0.75rem',
          color,
        }}
      >
        {Math.round(pct)}%
      </Typography>
    </Box>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────
export const GoalsPage = () => {
  const { enqueueSnackbar } = useSnackbar();

  const { data: workspaces } = useListWorkspacesQuery();
  const [selectedWorkspace, setSelectedWorkspace] = useState<number | ''>('');
  const workspaceId = selectedWorkspace || workspaces?.[0]?.id;

  const { data: goals, isLoading } = useListGoalsQuery(workspaceId!, { skip: !workspaceId });
  const { data: projects } = useListProjectsQuery({ workspace: workspaceId }, { skip: !workspaceId });

  const [createGoal] = useCreateGoalMutation();
  const [deleteGoal] = useDeleteGoalMutation();
  const [syncGoal, { isLoading: syncing }] = useSyncGoalMutation();
  const [createTarget] = useCreateGoalTargetMutation();
  const [deleteTarget] = useDeleteGoalTargetMutation();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [goalForm, setGoalForm] = useState<Partial<CreateGoal>>({ name: '', description: '', due_date: '' });
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [addTargetFor, setAddTargetFor] = useState<number | null>(null);
  const [targetForm, setTargetForm] = useState<Partial<CreateGoalTarget>>({
    name: '', target_type: 'task_completion', target: 100, current: 0, linked_project: null,
  });

  const toggleExpand = (id: number) =>
    setExpanded((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleCreateGoal = async () => {
    if (!workspaceId || !goalForm.name?.trim()) return;
    try {
      await createGoal({
        workspace: workspaceId,
        name: goalForm.name.trim(),
        description: goalForm.description || '',
        owner: null,
        due_date: goalForm.due_date || null,
      }).unwrap();
      enqueueSnackbar('Goal created', { variant: 'success' });
      setCreateDialogOpen(false);
      setGoalForm({ name: '', description: '', due_date: '' });
    } catch {
      enqueueSnackbar('Failed to create goal', { variant: 'error' });
    }
  };

  const handleDeleteGoal = async (goal: Goal) => {
    if (!workspaceId) return;
    try {
      await deleteGoal({ id: goal.id, workspaceId }).unwrap();
      enqueueSnackbar('Goal deleted', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to delete goal', { variant: 'error' });
    }
  };

  const handleSync = async (goalId: number) => {
    try {
      await syncGoal(goalId).unwrap();
      enqueueSnackbar('Progress synced', { variant: 'success' });
    } catch {
      enqueueSnackbar('Sync failed', { variant: 'error' });
    }
  };

  const handleAddTarget = async (goalId: number) => {
    if (!targetForm.name?.trim()) return;
    try {
      await createTarget({
        goal: goalId,
        name: targetForm.name.trim(),
        target_type: (targetForm.target_type as CreateGoalTarget['target_type']) ?? 'task_completion',
        target: Number(targetForm.target ?? 100),
        current: Number(targetForm.current ?? 0),
        linked_project: targetForm.linked_project ?? null,
      }).unwrap();
      enqueueSnackbar('Target added', { variant: 'success' });
      setAddTargetFor(null);
      setTargetForm({ name: '', target_type: 'task_completion', target: 100, current: 0, linked_project: null });
    } catch {
      enqueueSnackbar('Failed to add target', { variant: 'error' });
    }
  };

  const progressColor = (pct: number) =>
    pct >= 75 ? 'success' : pct >= 40 ? 'warning' : 'primary';

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <EmojiEvents color="primary" fontSize="large" />
          <Box>
            <Typography variant="h5" fontWeight={700}>Goals & OKRs</Typography>
            <Typography variant="body2" color="text.secondary">
              Track objectives and link them to project progress.
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1}>
          {workspaces && workspaces.length > 1 && (
            <TextField
              select
              size="small"
              label="Workspace"
              value={selectedWorkspace || workspaceId || ''}
              onChange={(e) => setSelectedWorkspace(Number(e.target.value))}
              sx={{ minWidth: 160 }}
            >
              {workspaces.map((w) => (
                <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
              ))}
            </TextField>
          )}
          <Button variant="contained" startIcon={<Add />} onClick={() => setCreateDialogOpen(true)}>
            New Goal
          </Button>
        </Stack>
      </Stack>

      {/* Goal list */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : !goals || goals.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 6, textAlign: 'center' }}>
          <EmojiEvents sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>No goals yet</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Create your first goal to link projects to business objectives.
          </Typography>
          <Button variant="contained" startIcon={<Add />} onClick={() => setCreateDialogOpen(true)}>
            Create First Goal
          </Button>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {goals.map((goal) => (
            <Paper key={goal.id} variant="outlined" sx={{ overflow: 'hidden' }}>
              {/* Goal header */}
              <Stack
                direction="row"
                alignItems="center"
                spacing={2}
                sx={{
                  px: 2.5, py: 2,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: (t) => alpha(t.palette.primary.main, 0.04) },
                }}
                onClick={() => toggleExpand(goal.id)}
              >
                <ProgressRing value={goal.progress_pct} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                    <Typography variant="subtitle1" fontWeight={700} noWrap>{goal.name}</Typography>
                    {goal.due_date && (
                      <Chip
                        label={`Due ${new Date(goal.due_date).toLocaleDateString()}`}
                        size="small"
                        variant="outlined"
                        color={new Date(goal.due_date) < new Date() ? 'error' : 'default'}
                      />
                    )}
                    <Chip
                      label={`${goal.targets.length} target${goal.targets.length !== 1 ? 's' : ''}`}
                      size="small"
                      variant="outlined"
                      color="info"
                    />
                  </Stack>
                  {goal.description && (
                    <Typography variant="body2" color="text.secondary" noWrap>{goal.description}</Typography>
                  )}
                </Box>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <Tooltip title="Sync progress from linked projects">
                    <IconButton
                      size="small"
                      onClick={(e) => { e.stopPropagation(); handleSync(goal.id); }}
                      disabled={syncing}
                    >
                      <Sync fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete goal">
                    <IconButton
                      size="small"
                      onClick={(e) => { e.stopPropagation(); handleDeleteGoal(goal); }}
                      sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {expanded.has(goal.id) ? <ExpandLess /> : <ExpandMore />}
                </Stack>
              </Stack>

              {/* Targets */}
              <Collapse in={expanded.has(goal.id)}>
                <Divider />
                <Box sx={{ px: 2.5, py: 2 }}>
                  {goal.targets.length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      No targets yet. Add one to track measurable outcomes.
                    </Typography>
                  )}
                  <Stack spacing={1.5} sx={{ mb: 2 }}>
                    {goal.targets.map((t) => (
                      <Box key={t.id}>
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                          <TrackChanges fontSize="small" color="action" />
                          <Typography variant="body2" fontWeight={600} sx={{ flex: 1 }}>
                            {t.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {t.target_type === 'currency'
                              ? `$${t.current.toLocaleString()} / $${t.target.toLocaleString()}`
                              : `${t.current} / ${t.target}${t.target_type === 'task_completion' ? '%' : ''}`}
                          </Typography>
                          <Chip
                            label={t.target_type_display}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.65rem', height: 18 }}
                          />
                          {t.linked_project_name && (
                            <Chip
                              label={t.linked_project_name}
                              size="small"
                              color="primary"
                              variant="outlined"
                              sx={{ fontSize: '0.65rem', height: 18 }}
                            />
                          )}
                          <IconButton
                            size="small"
                            onClick={() => deleteTarget(t.id)}
                            sx={{ p: 0.25, color: 'text.disabled', '&:hover': { color: 'error.main' } }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Stack>
                        <LinearProgress
                          variant="determinate"
                          value={t.progress_pct}
                          color={progressColor(t.progress_pct)}
                          sx={{ height: 6, borderRadius: 3, bgcolor: (t2) => alpha(t2.palette.grey[300], 0.5) }}
                        />
                      </Box>
                    ))}
                  </Stack>

                  {/* Add target inline form */}
                  {addTargetFor === goal.id ? (
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
                        New Target
                      </Typography>
                      <Stack spacing={1.5}>
                        <TextField
                          label="Target name"
                          size="small"
                          fullWidth
                          value={targetForm.name}
                          onChange={(e) => setTargetForm((f) => ({ ...f, name: e.target.value }))}
                        />
                        <TextField
                          label="Type"
                          select
                          size="small"
                          fullWidth
                          value={targetForm.target_type}
                          onChange={(e) => setTargetForm((f) => ({ ...f, target_type: e.target.value as CreateGoalTarget['target_type'] }))}
                        >
                          <MenuItem value="task_completion">Task Completion %</MenuItem>
                          <MenuItem value="number">Number</MenuItem>
                          <MenuItem value="currency">Currency</MenuItem>
                        </TextField>
                        {targetForm.target_type === 'task_completion' && projects && (
                          <TextField
                            label="Linked project (auto-syncs progress)"
                            select
                            size="small"
                            fullWidth
                            value={targetForm.linked_project ?? ''}
                            onChange={(e) => setTargetForm((f) => ({ ...f, linked_project: e.target.value ? Number(e.target.value) : null }))}
                          >
                            <MenuItem value="">None</MenuItem>
                            {projects.map((p) => (
                              <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                            ))}
                          </TextField>
                        )}
                        {targetForm.target_type !== 'task_completion' && (
                          <Stack direction="row" spacing={1}>
                            <TextField
                              label="Current"
                              type="number"
                              size="small"
                              fullWidth
                              value={targetForm.current}
                              onChange={(e) => setTargetForm((f) => ({ ...f, current: Number(e.target.value) }))}
                            />
                            <TextField
                              label="Target"
                              type="number"
                              size="small"
                              fullWidth
                              value={targetForm.target}
                              onChange={(e) => setTargetForm((f) => ({ ...f, target: Number(e.target.value) }))}
                            />
                          </Stack>
                        )}
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button size="small" onClick={() => setAddTargetFor(null)}>Cancel</Button>
                          <Button
                            size="small"
                            variant="contained"
                            disabled={!targetForm.name?.trim()}
                            onClick={() => handleAddTarget(goal.id)}
                          >
                            Add Target
                          </Button>
                        </Stack>
                      </Stack>
                    </Paper>
                  ) : (
                    <Button
                      size="small"
                      startIcon={<Add />}
                      onClick={() => setAddTargetFor(goal.id)}
                    >
                      Add Target
                    </Button>
                  )}
                </Box>
              </Collapse>
            </Paper>
          ))}
        </Stack>
      )}

      {/* Create Goal dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New Goal</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Goal name"
              fullWidth
              value={goalForm.name}
              onChange={(e) => setGoalForm((f) => ({ ...f, name: e.target.value }))}
              autoFocus
            />
            <TextField
              label="Description (optional)"
              fullWidth
              multiline
              rows={2}
              value={goalForm.description}
              onChange={(e) => setGoalForm((f) => ({ ...f, description: e.target.value }))}
            />
            <TextField
              label="Due date (optional)"
              type="date"
              fullWidth
              value={goalForm.due_date}
              onChange={(e) => setGoalForm((f) => ({ ...f, due_date: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!goalForm.name?.trim()}
            onClick={handleCreateGoal}
          >
            Create Goal
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
