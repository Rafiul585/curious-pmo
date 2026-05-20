import { useState, useMemo } from 'react';
import {
  Avatar,
  Box,
  Button,
  ButtonGroup,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
  alpha,
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  Close,
  People,
} from '@mui/icons-material';
import { useGetWorkloadCalendarQuery } from '../api/dashboardApi';

// ─── capacity thresholds (hours per day) ────────────────────────────────────
const NEAR = 8;
const OVER = 10;

function cellColor(hours: number, taskCount: number): string {
  if (taskCount === 0) return 'transparent';
  if (hours === 0) {
    // Tasks without estimated hours — show neutral tint
    return '#e3f2fd';
  }
  if (hours > OVER) return '#ffcdd2'; // red
  if (hours >= NEAR) return '#fff9c4'; // amber
  return '#c8e6c9';                    // green
}

function isoWeekStart(d: Date): Date {
  const day = d.getDay(); // 0 Sun – 6 Sat
  const diff = (day === 0 ? -6 : 1 - day);
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  return mon;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatHeaderDate(isoDate: string): { day: string; weekday: string } {
  const d = new Date(isoDate + 'T00:00:00');
  return {
    day: d.getDate().toString(),
    weekday: d.toLocaleDateString(undefined, { weekday: 'short' }),
  };
}

type ViewMode = 'week' | 'month';

export const WorkloadPage = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [anchorDate, setAnchorDate] = useState<Date>(() => isoWeekStart(new Date()));
  const [popoverCell, setPopoverCell] = useState<{
    username: string;
    date: string;
    taskCount: number;
    hours: number;
  } | null>(null);

  // Compute start / end for current window
  const { start, end } = useMemo(() => {
    if (viewMode === 'week') {
      const s = isoWeekStart(anchorDate);
      return { start: toIso(s), end: toIso(addDays(s, 6)) };
    } else {
      const s = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
      const e = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0);
      return { start: toIso(s), end: toIso(e) };
    }
  }, [anchorDate, viewMode]);

  const { data, isFetching, isError } = useGetWorkloadCalendarQuery({ start, end });

  const navigate = (dir: -1 | 1) => {
    setAnchorDate((prev) => {
      if (viewMode === 'week') return addDays(prev, dir * 7);
      const d = new Date(prev.getFullYear(), prev.getMonth() + dir, 1);
      return d;
    });
  };

  const goToday = () => {
    setAnchorDate(viewMode === 'week' ? isoWeekStart(new Date()) : new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  };

  const rangeLabel = useMemo(() => {
    const s = new Date(start + 'T00:00:00');
    const e = new Date(end + 'T00:00:00');
    if (viewMode === 'week') {
      return `${s.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return s.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }, [start, end, viewMode]);

  const days = data?.date_range?.days ?? [];
  const rows = data?.per_day ?? [];
  const today = toIso(new Date());

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <People color="primary" />
          <Typography variant="h5" fontWeight={700}>Workload</Typography>
        </Stack>

        <Stack direction="row" alignItems="center" spacing={1}>
          <ButtonGroup size="small" variant="outlined">
            <Button
              onClick={() => { setViewMode('week'); setAnchorDate(isoWeekStart(new Date())); }}
              variant={viewMode === 'week' ? 'contained' : 'outlined'}
            >
              Week
            </Button>
            <Button
              onClick={() => { setViewMode('month'); setAnchorDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)); }}
              variant={viewMode === 'month' ? 'contained' : 'outlined'}
            >
              Month
            </Button>
          </ButtonGroup>

          <IconButton size="small" onClick={() => navigate(-1)}><ChevronLeft /></IconButton>
          <Button size="small" variant="text" onClick={goToday} sx={{ minWidth: 64 }}>Today</Button>
          <IconButton size="small" onClick={() => navigate(1)}><ChevronRight /></IconButton>

          <Typography variant="subtitle1" fontWeight={600} sx={{ ml: 1, minWidth: 200, textAlign: 'center' }}>
            {rangeLabel}
          </Typography>
        </Stack>
      </Stack>

      {/* Legend */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        {[
          { color: '#c8e6c9', label: 'Under capacity (< 8h)' },
          { color: '#fff9c4', label: 'Near limit (8–10h)' },
          { color: '#ffcdd2', label: 'Over capacity (> 10h)' },
          { color: '#e3f2fd', label: 'Tasks (no estimate)' },
        ].map(({ color, label }) => (
          <Stack key={label} direction="row" alignItems="center" spacing={0.5}>
            <Box sx={{ width: 14, height: 14, borderRadius: 0.5, bgcolor: color, border: '1px solid', borderColor: 'divider' }} />
            <Typography variant="caption" color="text.secondary">{label}</Typography>
          </Stack>
        ))}
      </Stack>

      {/* Grid */}
      {isFetching ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : isError ? (
        <Typography color="error">Failed to load workload data.</Typography>
      ) : rows.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 6, textAlign: 'center' }}>
          <Typography color="text.secondary">No assigned tasks in this period.</Typography>
        </Paper>
      ) : (
        <Paper variant="outlined" sx={{ overflow: 'auto' }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: `200px repeat(${days.length}, minmax(40px, 1fr))`,
              minWidth: 200 + days.length * 40,
            }}
          >
            {/* Header row */}
            <Box sx={{ p: 1, bgcolor: 'background.default', borderBottom: 1, borderRight: 1, borderColor: 'divider' }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>MEMBER</Typography>
            </Box>
            {days.map((d) => {
              const { day, weekday } = formatHeaderDate(d);
              const isToday = d === today;
              return (
                <Box
                  key={d}
                  sx={{
                    p: 0.5,
                    textAlign: 'center',
                    bgcolor: isToday ? (t) => alpha(t.palette.primary.main, 0.12) : 'background.default',
                    borderBottom: 1,
                    borderRight: 1,
                    borderColor: 'divider',
                  }}
                >
                  <Typography variant="caption" color={isToday ? 'primary.main' : 'text.secondary'} fontWeight={isToday ? 700 : 400} display="block">
                    {weekday}
                  </Typography>
                  <Typography variant="caption" color={isToday ? 'primary.main' : 'text.primary'} fontWeight={isToday ? 700 : 500}>
                    {day}
                  </Typography>
                </Box>
              );
            })}

            {/* Data rows */}
            {rows.map((row) => (
              <>
                {/* Member cell */}
                <Box
                  key={`member-${row.user_id}`}
                  sx={{
                    p: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    borderBottom: 1,
                    borderRight: 1,
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                  }}
                >
                  <Avatar sx={{ width: 28, height: 28, fontSize: '0.7rem', bgcolor: 'primary.main' }}>
                    {row.username[0].toUpperCase()}
                  </Avatar>
                  <Typography variant="body2" noWrap fontWeight={500}>{row.username}</Typography>
                </Box>

                {/* Day cells */}
                {row.days.map((dayData) => {
                  const bg = cellColor(dayData.estimated_hours, dayData.task_count);
                  const isToday = dayData.date === today;
                  return (
                    <Tooltip
                      key={`${row.user_id}-${dayData.date}`}
                      title={
                        dayData.task_count > 0
                          ? `${dayData.task_count} task${dayData.task_count > 1 ? 's' : ''}${dayData.estimated_hours > 0 ? ` · ${dayData.estimated_hours.toFixed(1)}h` : ''}`
                          : ''
                      }
                    >
                      <Box
                        onClick={() => dayData.task_count > 0 && setPopoverCell({
                          username: row.username,
                          date: dayData.date,
                          taskCount: dayData.task_count,
                          hours: dayData.estimated_hours,
                        })}
                        sx={{
                          position: 'relative',
                          bgcolor: bg,
                          borderBottom: 1,
                          borderRight: 1,
                          borderColor: 'divider',
                          minHeight: 44,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: dayData.task_count > 0 ? 'pointer' : 'default',
                          outline: isToday ? (t) => `2px solid ${t.palette.primary.main}` : 'none',
                          outlineOffset: '-2px',
                          '&:hover': dayData.task_count > 0 ? {
                            filter: 'brightness(0.93)',
                          } : {},
                        }}
                      >
                        {dayData.task_count > 0 && (
                          <>
                            <Typography variant="caption" fontWeight={700} lineHeight={1.2}>
                              {dayData.task_count}
                            </Typography>
                            {dayData.estimated_hours > 0 && (
                              <Typography variant="caption" sx={{ fontSize: '0.6rem' }} color="text.secondary">
                                {dayData.estimated_hours.toFixed(0)}h
                              </Typography>
                            )}
                          </>
                        )}
                      </Box>
                    </Tooltip>
                  );
                })}
              </>
            ))}
          </Box>
        </Paper>
      )}

      {/* Summary chips */}
      {!isFetching && data && (
        <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', gap: 1 }}>
          <Chip label={`${data.total_members} members`} size="small" variant="outlined" />
          <Chip label={`${data.total_assigned_tasks} assigned tasks`} size="small" variant="outlined" color="primary" />
          {data.total_unassigned_tasks > 0 && (
            <Chip label={`${data.total_unassigned_tasks} unassigned`} size="small" variant="outlined" color="warning" />
          )}
        </Stack>
      )}

      {/* Cell detail dialog */}
      <Dialog open={Boolean(popoverCell)} onClose={() => setPopoverCell(null)} maxWidth="xs" fullWidth>
        {popoverCell && (
          <>
            <DialogTitle sx={{ pb: 1 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Avatar sx={{ width: 28, height: 28, fontSize: '0.7rem', bgcolor: 'primary.main' }}>
                    {popoverCell.username[0].toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700}>{popoverCell.username}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(popoverCell.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                    </Typography>
                  </Box>
                </Stack>
                <IconButton size="small" onClick={() => setPopoverCell(null)}><Close fontSize="small" /></IconButton>
              </Stack>
            </DialogTitle>
            <DialogContent>
              <Divider sx={{ mb: 1.5 }} />
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Tasks due this day</Typography>
                  <Typography variant="body2" fontWeight={600}>{popoverCell.taskCount}</Typography>
                </Stack>
                {popoverCell.hours > 0 && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Estimated hours</Typography>
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      color={
                        popoverCell.hours > OVER ? 'error.main' :
                        popoverCell.hours >= NEAR ? 'warning.main' :
                        'success.main'
                      }
                    >
                      {popoverCell.hours.toFixed(1)}h
                    </Typography>
                  </Stack>
                )}
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Capacity status</Typography>
                  <Chip
                    label={
                      popoverCell.hours === 0 ? 'No estimates' :
                      popoverCell.hours > OVER ? 'Over capacity' :
                      popoverCell.hours >= NEAR ? 'Near limit' : 'Under capacity'
                    }
                    size="small"
                    color={
                      popoverCell.hours === 0 ? 'info' :
                      popoverCell.hours > OVER ? 'error' :
                      popoverCell.hours >= NEAR ? 'warning' : 'success'
                    }
                  />
                </Stack>
              </Stack>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
};
