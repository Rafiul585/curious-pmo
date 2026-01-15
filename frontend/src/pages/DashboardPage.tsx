import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  alpha,
} from '@mui/material';
import {
  Add,
  Assignment,
  AssignmentLate,
  AssignmentTurnedIn,
  CalendarMonth,
  CalendarToday,
  ChevronLeft,
  ChevronRight,
  Dashboard,
  ExpandMore,
  Folder,
  FolderOff,
  OpenInNew,
  Clear,
  FilterList,
  Flag,
  Group,
  History,
  Notifications,
  NotificationsActive,
  Schedule,
  Speed,
  Timer,
  TrendingDown,
  TrendingUp,
  ViewList,
  ViewTimeline,
  Warning,
  Workspaces,
} from '@mui/icons-material';
import { Line } from 'react-chartjs-2';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from 'chart.js';
import {
  useGetDashboardOverviewQuery,
  useGetMyTasksSummaryQuery,
  useGetUpcomingDeadlinesQuery,
  useGetTeamWorkloadQuery,
  useGetProjectsProgressQuery,
  useGetActiveSprintsQuery,
  useGetTaskCompletionTrendQuery,
  useGetNotificationsQuery,
  useGetRecentlyViewedQuery,
  useGetTimeTrackingSummaryQuery,
  useGetUserWorkspacesQuery,
  useGetMilestoneProgressQuery,
  useGetFilterOptionsQuery,
  useGetFilteredOverviewQuery,
  DashboardFilters as DashboardFiltersType,
} from '../api/dashboardApi';
import { useListProjectsQuery } from '../api/projectApi';
import { useGetProjectTimelineQuery, TimelineItem } from '../api/ganttApi';
import { ActivityLogList } from '../components/activity/ActivityLogList';

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, ChartTooltip, Legend, Filler);

// Types
type ViewType = 'gantt' | 'list' | 'calendar' | 'portfolio';

// Color configurations
// CuriousPMO Brand Color Palette
const TYPE_COLORS: Record<string, string> = {
  project: '#667eea',   // Primary purple
  milestone: '#764ba2', // Secondary violet
  sprint: '#10b981',    // Success teal
  task: '#f59e0b',      // Warning amber
};

const STATUS_COLORS: Record<string, string> = {
  'Not Started': '#9e9e9e',
  'In Progress': '#667eea',
  'Review': '#f59e0b',
  'Done': '#10b981',
  'Completed': '#10b981',
  'To-do': '#9e9e9e',
  active: '#667eea',
  planning: '#764ba2',
  on_hold: '#f59e0b',
  completed: '#10b981',
  cancelled: '#ef4444',
};

const PRIORITY_COLORS: Record<string, string> = {
  Low: '#10b981',
  Medium: '#f59e0b',
  High: '#ef4444',
  Critical: '#764ba2',
};

const priorityColors: Record<string, 'default' | 'info' | 'warning' | 'error'> = {
  low: 'default',
  medium: 'info',
  high: 'warning',
  critical: 'error',
};

const statusColors: Record<string, 'default' | 'primary' | 'warning' | 'success' | 'error'> = {
  todo: 'default',
  in_progress: 'primary',
  review: 'warning',
  done: 'success',
  blocked: 'error',
};

// ============================================
// STAT CARD COMPONENT
// ============================================
interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
  trend?: number;
}

const StatCard = ({ title, value, icon, color, subtitle, trend }: StatCardProps) => (
  <Card>
    <CardContent>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography color="text.secondary" variant="body2" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight={700}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            bgcolor: alpha(color, 0.1),
            color: color,
          }}
        >
          {icon}
        </Box>
      </Stack>
      {trend !== undefined && (
        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 1 }}>
          <TrendingUp fontSize="small" sx={{ color: trend >= 0 ? 'success.main' : 'error.main' }} />
          <Typography variant="caption" color={trend >= 0 ? 'success.main' : 'error.main'}>
            {trend >= 0 ? '+' : ''}{trend}% from last week
          </Typography>
        </Stack>
      )}
    </CardContent>
  </Card>
);

// ============================================
// MINI GANTT VIEW COMPONENT
// ============================================
interface MiniGanttViewProps {
  items: TimelineItem[];
  dayWidth: number;
}

const MiniGanttView = ({ items, dayWidth }: MiniGanttViewProps) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    const allParents = new Set(items.filter((item) => items.some((child) => child.parent_id === item.id)).map((item) => item.id));
    setExpandedItems(allParents);
  }, [items]);

  const visibleItems = useMemo(() => {
    const result: TimelineItem[] = [];
    for (const item of items) {
      let parent = item.parent_id;
      let isHidden = false;
      while (parent) {
        if (!expandedItems.has(parent)) {
          isHidden = true;
          break;
        }
        const parentItem = items.find((i) => i.id === parent);
        parent = parentItem?.parent_id || null;
      }
      if (!isHidden) result.push(item);
    }
    return result;
  }, [items, expandedItems]);

  const { timelineStart, months } = useMemo(() => {
    if (!items.length) {
      const now = new Date();
      return { timelineStart: new Date(now.getFullYear(), now.getMonth(), 1), months: [] as { name: string; days: number }[] };
    }

    const dates = items.flatMap((item) => [item.start_date, item.end_date]).filter(Boolean).map((d) => new Date(d!));
    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));
    minDate.setDate(minDate.getDate() - 7);
    maxDate.setDate(maxDate.getDate() + 14);

    const monthList: { name: string; days: number }[] = [];
    const current = new Date(minDate);
    while (current <= maxDate) {
      const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
      const effectiveEnd = monthEnd > maxDate ? maxDate : monthEnd;
      const monthDays = Math.ceil((effectiveEnd.getTime() - current.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      monthList.push({ name: current.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), days: monthDays });
      current.setMonth(current.getMonth() + 1);
      current.setDate(1);
    }

    return { timelineStart: minDate, months: monthList };
  }, [items]);

  const toggleExpand = (itemId: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const hasChildren = (itemId: string) => items.some((item) => item.parent_id === itemId);

  return (
    <Box sx={{ overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', borderBottom: '2px solid', borderColor: 'divider', bgcolor: 'grey.100' }}>
        <Box sx={{ width: 220, minWidth: 220, flexShrink: 0, p: 1, borderRight: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" fontWeight={600}>Task / Item</Typography>
        </Box>
        <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {months.map((month, idx) => (
            <Box key={idx} sx={{ width: month.days * dayWidth, minWidth: month.days * dayWidth, textAlign: 'center', py: 0.5, borderRight: '1px solid', borderColor: 'divider' }}>
              <Typography variant="caption" fontWeight={600}>{month.name}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
      {/* Rows */}
      <Box sx={{ position: 'relative', overflow: 'auto', maxHeight: 300 }}>
        {visibleItems.slice(0, 15).map((item) => {
          const itemStart = item.start_date ? new Date(item.start_date) : timelineStart;
          const itemEnd = item.end_date ? new Date(item.end_date) : itemStart;
          const startOffset = Math.max(0, (itemStart.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24));
          const duration = Math.max(1, (itemEnd.getTime() - itemStart.getTime()) / (1000 * 60 * 60 * 24) + 1);
          const leftPx = startOffset * dayWidth;
          const widthPx = duration * dayWidth;
          const barColor = STATUS_COLORS[item.status] || TYPE_COLORS[item.type];
          const indent = item.level * 16;

          return (
            <Box
              key={item.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                height: 32,
                borderBottom: '1px solid',
                borderColor: 'divider',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <Box
                sx={{
                  width: 220,
                  minWidth: 220,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  pl: `${indent + 4}px`,
                  pr: 1,
                  borderRight: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                }}
              >
                {hasChildren(item.id) ? (
                  <IconButton size="small" onClick={() => toggleExpand(item.id)} sx={{ p: 0.25 }}>
                    {expandedItems.has(item.id) ? <ExpandMore sx={{ fontSize: 16 }} /> : <ChevronRight sx={{ fontSize: 16 }} />}
                  </IconButton>
                ) : (
                  <Box sx={{ width: 20 }} />
                )}
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: 0.5,
                    bgcolor: TYPE_COLORS[item.type],
                    mr: 0.5,
                    flexShrink: 0,
                  }}
                />
                <Tooltip title={item.name}>
                  <Typography variant="caption" noWrap sx={{ fontWeight: item.type === 'project' ? 600 : 400 }}>
                    {item.name}
                  </Typography>
                </Tooltip>
              </Box>
              <Box sx={{ flex: 1, position: 'relative', height: '100%', overflow: 'hidden' }}>
                <Tooltip title={`${item.name}: ${item.start_date} - ${item.end_date} (${item.progress}%)`}>
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 4,
                      left: leftPx,
                      width: widthPx,
                      height: 24,
                      borderRadius: 0.5,
                      overflow: 'hidden',
                      boxShadow: 1,
                    }}
                  >
                    <Box sx={{ position: 'absolute', inset: 0, bgcolor: alpha(barColor, 0.3), border: `1px solid ${barColor}`, borderRadius: 0.5 }} />
                    <Box sx={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: `${item.progress}%`, bgcolor: barColor, borderRadius: '4px 0 0 4px' }} />
                    {widthPx > 30 && (
                      <Typography variant="caption" sx={{ position: 'absolute', left: 4, top: '50%', transform: 'translateY(-50%)', color: item.progress > 50 ? 'white' : 'text.primary', fontWeight: 500, fontSize: '0.6rem' }}>
                        {item.progress}%
                      </Typography>
                    )}
                  </Box>
                </Tooltip>
              </Box>
            </Box>
          );
        })}
        {visibleItems.length > 15 && (
          <Box sx={{ p: 1, textAlign: 'center', bgcolor: 'grey.50' }}>
            <Typography variant="caption" color="text.secondary">
              +{visibleItems.length - 15} more items
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

// ============================================
// MINI LIST VIEW COMPONENT
// ============================================
interface MiniListViewProps {
  items: TimelineItem[];
}

const MiniListView = ({ items }: MiniListViewProps) => {
  const tasks = items.filter((item) => item.type === 'task').slice(0, 10);

  return (
    <TableContainer sx={{ maxHeight: 350 }}>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.100', py: 1 }}>Task Name</TableCell>
            <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.100', py: 1 }}>Status</TableCell>
            <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.100', py: 1 }}>Priority</TableCell>
            <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.100', py: 1 }}>Assignee</TableCell>
            <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.100', py: 1 }}>Progress</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {tasks.map((task) => (
            <TableRow key={task.id} hover>
              <TableCell sx={{ py: 0.75 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: TYPE_COLORS.task }} />
                  <Typography variant="body2" noWrap sx={{ maxWidth: 180 }}>{task.name}</Typography>
                </Stack>
              </TableCell>
              <TableCell sx={{ py: 0.75 }}>
                <Chip label={task.status} size="small" sx={{ height: 20, fontSize: '0.7rem', bgcolor: alpha(STATUS_COLORS[task.status] || '#9e9e9e', 0.2), color: STATUS_COLORS[task.status] || '#9e9e9e' }} />
              </TableCell>
              <TableCell sx={{ py: 0.75 }}>
                {task.priority && (
                  <Chip label={task.priority} size="small" sx={{ height: 20, fontSize: '0.7rem', bgcolor: alpha(PRIORITY_COLORS[task.priority] || '#9e9e9e', 0.2), color: PRIORITY_COLORS[task.priority] || '#9e9e9e' }} />
                )}
              </TableCell>
              <TableCell sx={{ py: 0.75 }}>
                {task.assignee && (
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Avatar sx={{ width: 20, height: 20, fontSize: '0.6rem', bgcolor: 'primary.main' }}>{task.assignee.initials}</Avatar>
                    <Typography variant="caption">{task.assignee.username}</Typography>
                  </Stack>
                )}
              </TableCell>
              <TableCell sx={{ py: 0.75 }}>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Box sx={{ flex: 1, height: 4, bgcolor: 'grey.200', borderRadius: 1, overflow: 'hidden', minWidth: 40 }}>
                    <Box sx={{ width: `${task.progress}%`, height: '100%', bgcolor: STATUS_COLORS[task.status] || 'primary.main' }} />
                  </Box>
                  <Typography variant="caption" sx={{ minWidth: 28 }}>{task.progress}%</Typography>
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {items.filter((i) => i.type === 'task').length > 10 && (
        <Box sx={{ p: 1, textAlign: 'center', bgcolor: 'grey.50' }}>
          <Typography variant="caption" color="text.secondary">
            +{items.filter((i) => i.type === 'task').length - 10} more tasks
          </Typography>
        </Box>
      )}
    </TableContainer>
  );
};

// ============================================
// MINI CALENDAR VIEW COMPONENT
// ============================================
interface MiniCalendarViewProps {
  items: TimelineItem[];
}

const MiniCalendarView = ({ items }: MiniCalendarViewProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const { daysInMonth, firstDayOfMonth, monthName } = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    return {
      daysInMonth: new Date(year, month + 1, 0).getDate(),
      firstDayOfMonth: new Date(year, month, 1).getDay(),
      monthName: currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    };
  }, [currentDate]);

  const tasksOnDay = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return items.filter((item) => {
      if (!item.start_date || !item.end_date) return false;
      return dateStr >= item.start_date && dateStr <= item.end_date;
    });
  };

  const prevMonth = () => setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <IconButton size="small" onClick={prevMonth}><ChevronLeft fontSize="small" /></IconButton>
        <Typography variant="subtitle2" fontWeight={600}>{monthName}</Typography>
        <IconButton size="small" onClick={nextMonth}><ChevronRight fontSize="small" /></IconButton>
      </Stack>

      <Grid container spacing={0.25}>
        {days.map((day, idx) => (
          <Grid item xs={12 / 7} key={idx}>
            <Box sx={{ p: 0.25, textAlign: 'center', bgcolor: 'grey.100' }}>
              <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 600 }}>{day}</Typography>
            </Box>
          </Grid>
        ))}

        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
          <Grid item xs={12 / 7} key={`empty-${i}`}>
            <Box sx={{ p: 0.25, minHeight: 45, bgcolor: 'grey.50' }} />
          </Grid>
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dayTasks = tasksOnDay(day);
          const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();

          return (
            <Grid item xs={12 / 7} key={day}>
              <Tooltip title={dayTasks.length > 0 ? `${dayTasks.length} task(s)` : ''}>
                <Box
                  sx={{
                    p: 0.25,
                    minHeight: 45,
                    border: '1px solid',
                    borderColor: isToday ? 'primary.main' : 'divider',
                    bgcolor: isToday ? alpha('#1976d2', 0.05) : 'background.paper',
                    overflow: 'hidden',
                  }}
                >
                  <Typography variant="caption" fontWeight={isToday ? 700 : 400} color={isToday ? 'primary.main' : 'text.secondary'} sx={{ fontSize: '0.65rem' }}>
                    {day}
                  </Typography>
                  {dayTasks.length > 0 && (
                    <Stack spacing={0.125} sx={{ mt: 0.25 }}>
                      {dayTasks.slice(0, 2).map((task) => (
                        <Box
                          key={task.id}
                          sx={{
                            height: 4,
                            bgcolor: TYPE_COLORS[task.type],
                            borderRadius: 0.25,
                          }}
                        />
                      ))}
                      {dayTasks.length > 2 && (
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.5rem' }}>
                          +{dayTasks.length - 2}
                        </Typography>
                      )}
                    </Stack>
                  )}
                </Box>
              </Tooltip>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};

// ============================================
// MINI PORTFOLIO VIEW COMPONENT
// ============================================
interface MiniPortfolioViewProps {
  projects: { id: number; name: string; status?: string; start_date?: string; end_date?: string }[];
}

const MiniPortfolioView = ({ projects }: MiniPortfolioViewProps) => {
  const projectColors = ['#1565c0', '#7b1fa2', '#2e7d32', '#ed6c02', '#d32f2f', '#0288d1', '#689f38'];

  const { minDate, maxDate, totalDays } = useMemo(() => {
    const dates = projects
      .flatMap((p) => [p.start_date, p.end_date])
      .filter(Boolean)
      .map((d) => new Date(d!));

    if (dates.length === 0) {
      const now = new Date();
      return {
        minDate: new Date(now.getFullYear(), now.getMonth(), 1),
        maxDate: new Date(now.getFullYear(), now.getMonth() + 3, 0),
        totalDays: 90,
      };
    }

    const min = new Date(Math.min(...dates.map((d) => d.getTime())));
    const max = new Date(Math.max(...dates.map((d) => d.getTime())));
    min.setDate(min.getDate() - 7);
    max.setDate(max.getDate() + 14);

    return {
      minDate: min,
      maxDate: max,
      totalDays: Math.ceil((max.getTime() - min.getTime()) / (1000 * 60 * 60 * 24)),
    };
  }, [projects]);

  const months = useMemo(() => {
    const monthList: { name: string; days: number }[] = [];
    const current = new Date(minDate);
    while (current <= maxDate) {
      const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
      const effectiveEnd = monthEnd > maxDate ? maxDate : monthEnd;
      const monthDays = Math.ceil((effectiveEnd.getTime() - current.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      monthList.push({ name: current.toLocaleDateString('en-US', { month: 'short' }), days: monthDays });
      current.setMonth(current.getMonth() + 1);
      current.setDate(1);
    }
    return monthList;
  }, [minDate, maxDate]);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', borderBottom: '2px solid', borderColor: 'divider', bgcolor: 'grey.100' }}>
        <Box sx={{ width: 150, minWidth: 150, flexShrink: 0, p: 0.5, borderRight: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" fontWeight={600}>Project</Typography>
        </Box>
        <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {months.map((month, idx) => (
            <Box key={idx} sx={{ width: `${(month.days / totalDays) * 100}%`, textAlign: 'center', py: 0.5, borderRight: '1px solid', borderColor: 'divider' }}>
              <Typography variant="caption" fontWeight={600}>{month.name}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Project rows */}
      {projects.slice(0, 8).map((project, index) => {
        const color = projectColors[index % projectColors.length];
        const startDate = project.start_date ? new Date(project.start_date) : minDate;
        const endDate = project.end_date ? new Date(project.end_date) : startDate;

        const startOffset = Math.max(0, (startDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
        const duration = Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) + 1);

        const leftPercent = (startOffset / totalDays) * 100;
        const widthPercent = (duration / totalDays) * 100;

        return (
          <Box
            key={project.id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              height: 36,
              borderBottom: '1px solid',
              borderColor: 'divider',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <Box sx={{ width: 150, minWidth: 150, flexShrink: 0, px: 0.5, borderRight: '1px solid', borderColor: 'divider' }}>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Box sx={{ width: 10, height: 10, borderRadius: 0.25, bgcolor: color, flexShrink: 0 }} />
                <Typography variant="caption" fontWeight={500} noWrap>{project.name}</Typography>
              </Stack>
            </Box>
            <Box sx={{ flex: 1, position: 'relative', height: '100%' }}>
              <Tooltip title={`${project.name}: ${project.start_date || 'N/A'} - ${project.end_date || 'N/A'}`}>
                <Box
                  sx={{
                    position: 'absolute',
                    top: 6,
                    left: `${leftPercent}%`,
                    width: `${widthPercent}%`,
                    height: 24,
                    bgcolor: color,
                    borderRadius: 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    px: 0.5,
                    boxShadow: 1,
                    minWidth: 20,
                  }}
                >
                  <Typography variant="caption" sx={{ color: 'white', fontWeight: 500, fontSize: '0.6rem' }} noWrap>
                    {project.name}
                  </Typography>
                </Box>
              </Tooltip>
            </Box>
          </Box>
        );
      })}
      {projects.length > 8 && (
        <Box sx={{ p: 0.5, textAlign: 'center', bgcolor: 'grey.50' }}>
          <Typography variant="caption" color="text.secondary">
            +{projects.length - 8} more projects
          </Typography>
        </Box>
      )}
    </Box>
  );
};

// ============================================
// PROJECT TIMELINE REPORT COMPONENT
// ============================================
interface ProjectTimelineReportProps {
  projects: { id: number; name: string; status?: string; start_date?: string; end_date?: string }[];
}

const ProjectTimelineReport = ({ projects }: ProjectTimelineReportProps) => {
  const navigate = useNavigate();
  const [selectedProject, setSelectedProject] = useState<number | ''>('');
  const [viewType, setViewType] = useState<ViewType>('gantt');
  const [portfolioStatusFilter, setPortfolioStatusFilter] = useState<string>('');
  const dayWidth = 15;

  // Set default project when projects load
  useEffect(() => {
    if (projects.length > 0 && selectedProject === '') {
      setSelectedProject(projects[0].id);
    }
  }, [projects, selectedProject]);

  const { data: timelineData, isLoading: loadingTimeline } = useGetProjectTimelineQuery(
    selectedProject as number,
    { skip: !selectedProject || viewType === 'portfolio' }
  );

  const handleViewChange = (_: React.MouseEvent<HTMLElement>, newView: ViewType | null) => {
    if (newView) setViewType(newView);
  };

  // Filter projects for portfolio view
  const filteredProjects = useMemo(() => {
    if (!portfolioStatusFilter) return projects;
    return projects.filter((p) => p.status === portfolioStatusFilter);
  }, [projects, portfolioStatusFilter]);

  // Get unique statuses for filter dropdown
  const availableStatuses = useMemo(() => {
    const statuses = new Set(projects.map((p) => p.status).filter(Boolean));
    return Array.from(statuses) as string[];
  }, [projects]);

  // No projects message
  if (projects.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <FolderOff sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No Projects Available
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Create your first project to see the timeline report here.
        </Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/projects')}>
          Create Project
        </Button>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }} flexWrap="wrap" gap={1}>
        <Typography variant="h6" fontWeight={600}>
          Project Timeline Report
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <ToggleButtonGroup value={viewType} exclusive onChange={handleViewChange} size="small">
            <ToggleButton value="gantt">
              <Tooltip title="Gantt Chart"><ViewTimeline fontSize="small" /></Tooltip>
            </ToggleButton>
            <ToggleButton value="list">
              <Tooltip title="List View"><ViewList fontSize="small" /></Tooltip>
            </ToggleButton>
            <ToggleButton value="calendar">
              <Tooltip title="Calendar View"><CalendarMonth fontSize="small" /></Tooltip>
            </ToggleButton>
            <ToggleButton value="portfolio">
              <Tooltip title="Portfolio View"><Dashboard fontSize="small" /></Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>

          {viewType !== 'portfolio' ? (
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Project</InputLabel>
              <Select
                value={selectedProject}
                label="Project"
                onChange={(e) => setSelectedProject(e.target.value as number)}
              >
                {projects.map((project) => (
                  <MenuItem key={project.id} value={project.id}>{project.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : (
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={portfolioStatusFilter}
                label="Status"
                onChange={(e) => setPortfolioStatusFilter(e.target.value)}
              >
                <MenuItem value="">All Statuses</MenuItem>
                {availableStatuses.map((status) => (
                  <MenuItem key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <Tooltip title="Open Full View">
            <IconButton size="small" onClick={() => navigate('/gantt')}>
              <OpenInNew fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* Loading */}
      {loadingTimeline && viewType !== 'portfolio' && <LinearProgress sx={{ mb: 1 }} />}

      {/* Content */}
      <Box sx={{ overflow: 'hidden' }}>
        {viewType === 'portfolio' ? (
          filteredProjects.length > 0 ? (
            <MiniPortfolioView projects={filteredProjects} />
          ) : (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <FolderOff sx={{ fontSize: 48, color: 'grey.300', mb: 1 }} />
              <Typography color="text.secondary" gutterBottom>
                No projects match the selected filter
              </Typography>
              <Button size="small" onClick={() => setPortfolioStatusFilter('')}>
                Clear Filter
              </Button>
            </Box>
          )
        ) : !selectedProject ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Folder sx={{ fontSize: 48, color: 'grey.300', mb: 1 }} />
            <Typography color="text.secondary" gutterBottom>
              Please select a project to view the timeline
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Use the dropdown above to select a project
            </Typography>
          </Box>
        ) : loadingTimeline ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">Loading timeline...</Typography>
          </Box>
        ) : timelineData && timelineData.items.length > 0 ? (
          viewType === 'gantt' ? (
            <MiniGanttView items={timelineData.items} dayWidth={dayWidth} />
          ) : viewType === 'list' ? (
            <MiniListView items={timelineData.items} />
          ) : viewType === 'calendar' ? (
            <MiniCalendarView items={timelineData.items} />
          ) : null
        ) : (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <ViewTimeline sx={{ fontSize: 48, color: 'grey.300', mb: 1 }} />
            <Typography color="text.secondary" gutterBottom>
              No timeline data for this project
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Add milestones, sprints, or tasks to see them here
            </Typography>
          </Box>
        )}
      </Box>

      {/* Legend */}
      {(viewType === 'gantt' || viewType === 'list') && timelineData && (
        <Stack direction="row" spacing={2} sx={{ mt: 2, pt: 1, borderTop: '1px solid', borderColor: 'divider' }} flexWrap="wrap">
          <Typography variant="caption" fontWeight={600} color="text.secondary">Types:</Typography>
          {Object.entries(TYPE_COLORS).map(([type, color]) => (
            <Stack key={type} direction="row" spacing={0.5} alignItems="center">
              <Box sx={{ width: 10, height: 10, borderRadius: 0.25, bgcolor: color }} />
              <Typography variant="caption">{type}</Typography>
            </Stack>
          ))}
        </Stack>
      )}
    </Paper>
  );
};

// ============================================
// UPCOMING DEADLINES REPORT COMPONENT
// ============================================
const UpcomingDeadlinesReport = () => {
  const navigate = useNavigate();
  const { data: deadlines, isLoading } = useGetUpcomingDeadlinesQuery();

  if (isLoading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Skeleton variant="text" width={200} height={32} />
        <Stack spacing={1} sx={{ mt: 2 }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rectangular" height={60} sx={{ borderRadius: 1 }} />
          ))}
        </Stack>
      </Paper>
    );
  }

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: '#10b981',
      medium: '#f59e0b',
      high: '#ef4444',
      critical: '#764ba2',
    };
    return colors[priority] || '#9e9e9e';
  };

  const renderTaskList = (tasks: typeof deadlines.tasks, title: string, color: string) => {
    if (!tasks || tasks.length === 0) return null;
    return (
      <Box sx={{ mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
          <Typography variant="subtitle2" fontWeight={600}>{title}</Typography>
          <Chip label={tasks.length} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
        </Stack>
        <Stack spacing={1}>
          {tasks.slice(0, 3).map((task) => (
            <Card key={task.id} variant="outlined" sx={{ '&:hover': { boxShadow: 1 } }}>
              <CardActionArea onClick={() => navigate('/tasks')}>
                <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={500} noWrap>{task.title}</Typography>
                      {task.project_name && (
                        <Typography variant="caption" color="text.secondary">{task.project_name}</Typography>
                      )}
                    </Box>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      {task.assignee && (
                        <Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem', bgcolor: 'primary.main' }}>
                          {task.assignee.initials}
                        </Avatar>
                      )}
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: getPriorityColor(task.priority) }} />
                    </Stack>
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Stack>
      </Box>
    );
  };

  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Schedule color="warning" />
          <Typography variant="h6" fontWeight={600}>Upcoming Deadlines</Typography>
        </Stack>
        <Chip label={`${deadlines?.total || 0} tasks`} size="small" color="warning" variant="outlined" />
      </Stack>

      {deadlines && deadlines.total > 0 ? (
        <>
          {renderTaskList(deadlines.due_today, 'Due Today', '#ef4444')}
          {renderTaskList(deadlines.due_tomorrow, 'Due Tomorrow', '#f59e0b')}
          {renderTaskList(deadlines.due_this_week, 'This Week', '#667eea')}
        </>
      ) : (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <AssignmentTurnedIn sx={{ fontSize: 48, color: 'grey.300', mb: 1 }} />
          <Typography color="text.secondary">No upcoming deadlines</Typography>
        </Box>
      )}
    </Paper>
  );
};

// ============================================
// TEAM WORKLOAD REPORT COMPONENT
// ============================================
const TeamWorkloadReport = () => {
  const { data: workload, isLoading } = useGetTeamWorkloadQuery();

  if (isLoading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Skeleton variant="text" width={200} height={32} />
        <Stack spacing={2} sx={{ mt: 2 }}>
          {[1, 2, 3].map((i) => (
            <Box key={i}>
              <Skeleton variant="text" width={150} />
              <Skeleton variant="rectangular" height={8} sx={{ borderRadius: 1 }} />
            </Box>
          ))}
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Group color="primary" />
          <Typography variant="h6" fontWeight={600}>Team Workload</Typography>
        </Stack>
        <Chip label={`${workload?.total_members || 0} members`} size="small" color="primary" variant="outlined" />
      </Stack>

      {workload && workload.team_members.length > 0 ? (
        <Stack spacing={2}>
          {workload.team_members.slice(0, 5).map((member) => (
            <Box key={member.id}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Avatar sx={{ width: 28, height: 28, fontSize: '0.75rem', bgcolor: 'primary.main' }}>
                    {member.initials}
                  </Avatar>
                  <Typography variant="body2" fontWeight={500}>{member.username}</Typography>
                </Stack>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Typography variant="caption" color="text.secondary">
                    {member.completed_tasks}/{member.total_tasks}
                  </Typography>
                  {member.overdue_tasks > 0 && (
                    <Chip label={`${member.overdue_tasks} overdue`} size="small" color="error" sx={{ height: 18, fontSize: '0.65rem' }} />
                  )}
                </Stack>
              </Stack>
              <Box sx={{ display: 'flex', height: 8, borderRadius: 1, overflow: 'hidden', bgcolor: 'grey.200' }}>
                <Box sx={{ width: `${(member.completed_tasks / member.total_tasks) * 100}%`, bgcolor: 'success.main' }} />
                <Box sx={{ width: `${(member.in_progress_tasks / member.total_tasks) * 100}%`, bgcolor: 'primary.main' }} />
                <Box sx={{ width: `${(member.todo_tasks / member.total_tasks) * 100}%`, bgcolor: 'grey.400' }} />
              </Box>
            </Box>
          ))}
          {workload.total_unassigned_tasks > 0 && (
            <Box sx={{ pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography variant="caption" color="warning.main">
                {workload.total_unassigned_tasks} unassigned tasks
              </Typography>
            </Box>
          )}
        </Stack>
      ) : (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Group sx={{ fontSize: 48, color: 'grey.300', mb: 1 }} />
          <Typography color="text.secondary">No team members with tasks</Typography>
        </Box>
      )}

      {/* Legend */}
      <Stack direction="row" spacing={2} sx={{ mt: 2, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: 'success.main' }} />
          <Typography variant="caption">Done</Typography>
        </Stack>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: 'primary.main' }} />
          <Typography variant="caption">In Progress</Typography>
        </Stack>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: 'grey.400' }} />
          <Typography variant="caption">To-do</Typography>
        </Stack>
      </Stack>
    </Paper>
  );
};

// ============================================
// PROJECT PROGRESS REPORT COMPONENT
// ============================================
const ProjectProgressReport = () => {
  const navigate = useNavigate();
  const { data: progress, isLoading } = useGetProjectsProgressQuery();

  if (isLoading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Skeleton variant="text" width={200} height={32} />
        <Stack spacing={2} sx={{ mt: 2 }}>
          {[1, 2, 3].map((i) => (
            <Box key={i}>
              <Skeleton variant="text" width={150} />
              <Skeleton variant="rectangular" height={8} sx={{ borderRadius: 1 }} />
            </Box>
          ))}
        </Stack>
      </Paper>
    );
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: '#667eea',
      planning: '#764ba2',
      on_hold: '#f59e0b',
      completed: '#10b981',
      cancelled: '#ef4444',
    };
    return colors[status] || '#9e9e9e';
  };

  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Folder color="info" />
          <Typography variant="h6" fontWeight={600}>Project Progress</Typography>
        </Stack>
        <Button size="small" onClick={() => navigate('/projects')}>View All</Button>
      </Stack>

      {progress && progress.projects.length > 0 ? (
        <Stack spacing={2}>
          {progress.projects.slice(0, 5).map((project) => (
            <Box key={project.id}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: getStatusColor(project.status) }} />
                  <Typography variant="body2" fontWeight={500} noWrap sx={{ maxWidth: 150 }}>{project.name}</Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  {project.overdue_tasks > 0 && (
                    <Chip label={`${project.overdue_tasks} overdue`} size="small" color="error" sx={{ height: 18, fontSize: '0.65rem' }} />
                  )}
                  <Typography variant="caption" fontWeight={600} color={Number(project.completion_percentage) >= 75 ? 'success.main' : 'text.secondary'}>
                    {project.completion_percentage}%
                  </Typography>
                </Stack>
              </Stack>
              {project.total_tasks > 0 ? (
                <>
                  <Tooltip title={`${project.completed_tasks}/${project.total_tasks} tasks completed (${project.completion_percentage}%)`}>
                    <Box sx={{ position: 'relative', height: 8, borderRadius: 1, bgcolor: 'grey.300', overflow: 'hidden' }}>
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          height: '100%',
                          width: `${Number(project.completion_percentage) || 0}%`,
                          bgcolor: Number(project.completion_percentage) >= 75 ? 'success.main' : Number(project.completion_percentage) >= 50 ? 'primary.main' : Number(project.completion_percentage) > 0 ? 'warning.main' : 'grey.400',
                          borderRadius: 1,
                          transition: 'width 0.3s ease',
                          minWidth: Number(project.completion_percentage) > 0 ? 4 : 0,
                        }}
                      />
                    </Box>
                  </Tooltip>
                  <Typography variant="caption" color="text.secondary">
                    {project.completed_tasks}/{project.total_tasks} tasks • {project.in_progress_tasks} in progress
                  </Typography>
                </>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  No tasks yet
                </Typography>
              )}
            </Box>
          ))}
        </Stack>
      ) : (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <FolderOff sx={{ fontSize: 48, color: 'grey.300', mb: 1 }} />
          <Typography color="text.secondary">No projects found</Typography>
        </Box>
      )}
    </Paper>
  );
};

// ============================================
// ACTIVE SPRINTS REPORT COMPONENT
// ============================================
const ActiveSprintsReport = () => {
  const { data: sprints, isLoading } = useGetActiveSprintsQuery();

  if (isLoading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Skeleton variant="text" width={200} height={32} />
        <Stack spacing={2} sx={{ mt: 2 }}>
          {[1, 2].map((i) => (
            <Skeleton key={i} variant="rectangular" height={80} sx={{ borderRadius: 1 }} />
          ))}
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Speed color="secondary" />
          <Typography variant="h6" fontWeight={600}>Active Sprints</Typography>
        </Stack>
        <Chip label={`${sprints?.total_active || 0} active`} size="small" color="secondary" variant="outlined" />
      </Stack>

      {sprints && sprints.sprints.length > 0 ? (
        <Stack spacing={2}>
          {sprints.sprints.slice(0, 3).map((sprint) => (
            <Card key={sprint.id} variant="outlined">
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600}>{sprint.name}</Typography>
                    {sprint.project_name && (
                      <Typography variant="caption" color="text.secondary">{sprint.project_name}</Typography>
                    )}
                  </Box>
                  {sprint.days_remaining !== null && (
                    <Chip
                      label={sprint.days_remaining >= 0 ? `${sprint.days_remaining}d left` : `${Math.abs(sprint.days_remaining)}d over`}
                      size="small"
                      color={sprint.days_remaining >= 0 ? (sprint.days_remaining <= 3 ? 'warning' : 'default') : 'error'}
                      sx={{ height: 20, fontSize: '0.65rem' }}
                    />
                  )}
                </Stack>
                <Box sx={{ display: 'flex', height: 8, borderRadius: 1, overflow: 'hidden', bgcolor: 'grey.200', mb: 0.5 }}>
                  <Box sx={{ width: `${(sprint.completed_tasks / sprint.total_tasks) * 100}%`, bgcolor: 'success.main' }} />
                  <Box sx={{ width: `${(sprint.in_progress_tasks / sprint.total_tasks) * 100}%`, bgcolor: 'primary.main' }} />
                </Box>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">
                    {sprint.completed_tasks}/{sprint.total_tasks} tasks
                  </Typography>
                  <Typography variant="caption" fontWeight={600} color={sprint.completion_percentage >= 75 ? 'success.main' : 'text.secondary'}>
                    {sprint.completion_percentage}%
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      ) : (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Speed sx={{ fontSize: 48, color: 'grey.300', mb: 1 }} />
          <Typography color="text.secondary">No active sprints</Typography>
        </Box>
      )}
    </Paper>
  );
};

// ============================================
// TASK COMPLETION TREND COMPONENT
// ============================================
const TaskCompletionTrendChart = () => {
  const { data: trend, isLoading } = useGetTaskCompletionTrendQuery();

  if (isLoading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Skeleton variant="text" width={200} height={32} />
        <Skeleton variant="rectangular" height={200} sx={{ mt: 2, borderRadius: 1 }} />
      </Paper>
    );
  }

  const chartData = {
    labels: trend?.weeks.map((w) => w.week) || [],
    datasets: [
      {
        label: 'Completed',
        data: trend?.weeks.map((w) => w.completed) || [],
        borderColor: '#4caf50',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Created',
        data: trend?.weeks.map((w) => w.created) || [],
        borderColor: '#2196f3',
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          {trend?.trend === 'up' ? <TrendingUp color="success" /> : <TrendingDown color="error" />}
          <Typography variant="h6" fontWeight={600}>Task Completion Trend</Typography>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Chip label={`${trend?.total_completed || 0} completed`} size="small" color="success" variant="outlined" />
          <Chip label={`${trend?.total_created || 0} created`} size="small" color="primary" variant="outlined" />
        </Stack>
      </Stack>

      <Box sx={{ height: 200 }}>
        <Line data={chartData} options={chartOptions} />
      </Box>
    </Paper>
  );
};

// ============================================
// NOTIFICATIONS PANEL COMPONENT
// ============================================
const NotificationsPanel = () => {
  const navigate = useNavigate();
  const { data: notifications, isLoading } = useGetNotificationsQuery();

  if (isLoading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Skeleton variant="text" width={200} height={32} />
        <Stack spacing={1} sx={{ mt: 2 }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rectangular" height={50} sx={{ borderRadius: 1 }} />
          ))}
        </Stack>
      </Paper>
    );
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'assignment':
        return <Assignment color="primary" fontSize="small" />;
      case 'overdue':
        return <AssignmentLate color="error" fontSize="small" />;
      case 'due_today':
        return <Schedule color="warning" fontSize="small" />;
      default:
        return <Notifications color="action" fontSize="small" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'assignment':
        return 'primary.main';
      case 'overdue':
        return 'error.main';
      case 'due_today':
        return 'warning.main';
      default:
        return 'text.secondary';
    }
  };

  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <NotificationsActive color="warning" />
          <Typography variant="h6" fontWeight={600}>Notifications</Typography>
        </Stack>
        {notifications && notifications.unread_count > 0 && (
          <Chip label={`${notifications.unread_count} new`} size="small" color="error" />
        )}
      </Stack>

      {notifications && notifications.notifications.length > 0 ? (
        <Stack spacing={1}>
          {notifications.notifications.slice(0, 5).map((notification) => (
            <Card
              key={notification.id}
              variant="outlined"
              sx={{
                bgcolor: notification.read ? 'transparent' : alpha('#1976d2', 0.05),
                '&:hover': { boxShadow: 1 },
              }}
            >
              <CardActionArea onClick={() => notification.task_id && navigate('/tasks')}>
                <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                  <Stack direction="row" spacing={1} alignItems="flex-start">
                    <Box sx={{ mt: 0.5 }}>{getNotificationIcon(notification.type)}</Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={500} color={getNotificationColor(notification.type)}>
                        {notification.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {notification.message}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Stack>
      ) : (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Notifications sx={{ fontSize: 48, color: 'grey.300', mb: 1 }} />
          <Typography color="text.secondary">No notifications</Typography>
        </Box>
      )}
    </Paper>
  );
};

// ============================================
// RECENTLY VIEWED COMPONENT
// ============================================
const RecentlyViewedList = () => {
  const navigate = useNavigate();
  const { data: recent, isLoading } = useGetRecentlyViewedQuery();

  if (isLoading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Skeleton variant="text" width={200} height={32} />
        <Stack spacing={1} sx={{ mt: 2 }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rectangular" height={40} sx={{ borderRadius: 1 }} />
          ))}
        </Stack>
      </Paper>
    );
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'task':
        return <Assignment fontSize="small" />;
      case 'project':
        return <Folder fontSize="small" />;
      case 'sprint':
        return <Speed fontSize="small" />;
      default:
        return <History fontSize="small" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'task':
        return '#ed6c02';
      case 'project':
        return '#1565c0';
      case 'sprint':
        return '#2e7d32';
      default:
        return '#9e9e9e';
    }
  };

  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <History color="action" />
        <Typography variant="h6" fontWeight={600}>Recently Viewed</Typography>
      </Stack>

      {recent && recent.items.length > 0 ? (
        <Stack spacing={1}>
          {recent.items.slice(0, 6).map((item, index) => (
            <Card
              key={`${item.type}_${item.id}_${index}`}
              variant="outlined"
              sx={{ '&:hover': { boxShadow: 1 } }}
            >
              <CardActionArea onClick={() => navigate(item.type === 'project' ? '/projects' : '/tasks')}>
                <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Box sx={{ color: getTypeColor(item.type) }}>{getTypeIcon(item.type)}</Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={500} noWrap>{item.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{item.type}</Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Stack>
      ) : (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <History sx={{ fontSize: 48, color: 'grey.300', mb: 1 }} />
          <Typography color="text.secondary">No recent items</Typography>
        </Box>
      )}
    </Paper>
  );
};

// ============================================
// TIME TRACKING SUMMARY COMPONENT
// ============================================
const TimeTrackingSummary = () => {
  const { data: timeData, isLoading } = useGetTimeTrackingSummaryQuery();

  if (isLoading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Skeleton variant="text" width={200} height={32} />
        <Stack spacing={2} sx={{ mt: 2 }}>
          {[1, 2].map((i) => (
            <Skeleton key={i} variant="rectangular" height={40} sx={{ borderRadius: 1 }} />
          ))}
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Timer color="info" />
          <Typography variant="h6" fontWeight={600}>Time Tracking</Typography>
        </Stack>
        <Chip
          label={`${timeData?.utilization_percentage || 0}% utilized`}
          size="small"
          color={timeData && timeData.utilization_percentage >= 80 ? 'success' : 'warning'}
          variant="outlined"
        />
      </Stack>

      {/* Summary Stats */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={6}>
          <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1, textAlign: 'center' }}>
            <Typography variant="h5" fontWeight={700} color="primary.main">
              {timeData?.total_logged_hours || 0}h
            </Typography>
            <Typography variant="caption" color="text.secondary">Logged</Typography>
          </Box>
        </Grid>
        <Grid item xs={6}>
          <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1, textAlign: 'center' }}>
            <Typography variant="h5" fontWeight={700} color="text.secondary">
              {timeData?.total_estimated_hours || 0}h
            </Typography>
            <Typography variant="caption" color="text.secondary">Estimated</Typography>
          </Box>
        </Grid>
      </Grid>

      {/* Projects Breakdown */}
      {timeData && timeData.projects.length > 0 ? (
        <Stack spacing={1}>
          <Typography variant="caption" fontWeight={600} color="text.secondary">BY PROJECT</Typography>
          {timeData.projects.slice(0, 3).map((project) => (
            <Box key={project.project_name}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                <Typography variant="body2" noWrap sx={{ maxWidth: 120 }}>{project.project_name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {project.logged_hours}h / {project.estimated_hours}h
                </Typography>
              </Stack>
              <Box sx={{ position: 'relative', height: 4, borderRadius: 1, bgcolor: 'grey.300', overflow: 'hidden' }}>
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '100%',
                    width: `${Math.min(Number(project.utilization) || 0, 100)}%`,
                    bgcolor: Number(project.utilization) >= 100 ? 'error.main' : Number(project.utilization) >= 80 ? 'success.main' : 'primary.main',
                    borderRadius: 1,
                    transition: 'width 0.3s ease',
                    minWidth: Number(project.utilization) > 0 ? 2 : 0,
                  }}
                />
              </Box>
            </Box>
          ))}
        </Stack>
      ) : (
        <Box sx={{ py: 2, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">No time data available</Typography>
        </Box>
      )}
    </Paper>
  );
};

// ============================================
// WORKSPACE SWITCHER COMPONENT
// ============================================
const WorkspaceSwitcher = () => {
  const navigate = useNavigate();
  const { data: workspaces, isLoading } = useGetUserWorkspacesQuery();

  if (isLoading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Skeleton variant="text" width={200} height={32} />
        <Stack spacing={1} sx={{ mt: 2 }}>
          {[1, 2].map((i) => (
            <Skeleton key={i} variant="rectangular" height={50} sx={{ borderRadius: 1 }} />
          ))}
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Workspaces color="primary" />
          <Typography variant="h6" fontWeight={600}>Workspaces</Typography>
        </Stack>
        <Chip label={`${workspaces?.total || 0}`} size="small" color="primary" variant="outlined" />
      </Stack>

      {workspaces && workspaces.workspaces.length > 0 ? (
        <Stack spacing={1}>
          {workspaces.workspaces.slice(0, 4).map((workspace) => (
            <Card key={workspace.id} variant="outlined" sx={{ '&:hover': { boxShadow: 1 } }}>
              <CardActionArea onClick={() => navigate('/projects')}>
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Typography variant="body2" fontWeight={600}>{workspace.name}</Typography>
                        {workspace.is_owner && (
                          <Chip label="Owner" size="small" sx={{ height: 16, fontSize: '0.6rem' }} />
                        )}
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {workspace.projects_count} project{workspace.projects_count !== 1 ? 's' : ''}
                      </Typography>
                    </Box>
                    <ChevronRight fontSize="small" color="action" />
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Stack>
      ) : (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Workspaces sx={{ fontSize: 48, color: 'grey.300', mb: 1 }} />
          <Typography color="text.secondary">No workspaces</Typography>
        </Box>
      )}
    </Paper>
  );
};

// ============================================
// MILESTONE PROGRESS REPORT COMPONENT
// ============================================
const MilestoneProgressReport = () => {
  const navigate = useNavigate();
  const { data: milestones, isLoading } = useGetMilestoneProgressQuery();

  if (isLoading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Skeleton variant="text" width={200} height={32} />
        <Stack spacing={2} sx={{ mt: 2 }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rectangular" height={70} sx={{ borderRadius: 1 }} />
          ))}
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Flag color="secondary" />
          <Typography variant="h6" fontWeight={600}>Milestone Progress</Typography>
        </Stack>
        <Chip label={`${milestones?.total || 0} milestones`} size="small" color="secondary" variant="outlined" />
      </Stack>

      {milestones && milestones.milestones.length > 0 ? (
        <Stack spacing={2}>
          {milestones.milestones.slice(0, 4).map((milestone) => (
            <Card key={milestone.id} variant="outlined" sx={{ borderColor: milestone.is_overdue ? 'error.main' : 'divider' }}>
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2" fontWeight={600} noWrap>{milestone.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{milestone.project_name}</Typography>
                  </Box>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    {milestone.is_overdue && (
                      <Chip label="Overdue" size="small" color="error" sx={{ height: 18, fontSize: '0.65rem' }} />
                    )}
                    {milestone.days_remaining !== null && !milestone.is_overdue && (
                      <Chip
                        label={`${milestone.days_remaining}d left`}
                        size="small"
                        color={milestone.days_remaining <= 7 ? 'warning' : 'default'}
                        sx={{ height: 18, fontSize: '0.65rem' }}
                      />
                    )}
                  </Stack>
                </Stack>
                {milestone.total_tasks > 0 ? (
                  <>
                    <Box sx={{ position: 'relative', height: 6, borderRadius: 1, bgcolor: 'grey.300', overflow: 'hidden' }}>
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          height: '100%',
                          width: `${Number(milestone.completion_percentage) || 0}%`,
                          bgcolor: milestone.is_overdue ? 'error.main' : Number(milestone.completion_percentage) >= 75 ? 'success.main' : Number(milestone.completion_percentage) > 0 ? 'primary.main' : 'grey.400',
                          borderRadius: 1,
                          transition: 'width 0.3s ease',
                          minWidth: Number(milestone.completion_percentage) > 0 ? 4 : 0,
                        }}
                      />
                    </Box>
                    <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        {milestone.completed_tasks}/{milestone.total_tasks} tasks
                      </Typography>
                      <Typography variant="caption" fontWeight={600} color={Number(milestone.completion_percentage) >= 75 ? 'success.main' : 'text.secondary'}>
                        {milestone.completion_percentage}%
                      </Typography>
                    </Stack>
                  </>
                ) : (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', py: 0.5 }}>
                    No tasks in this milestone
                  </Typography>
                )}
              </CardContent>
            </Card>
          ))}
        </Stack>
      ) : (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Flag sx={{ fontSize: 48, color: 'grey.300', mb: 1 }} />
          <Typography color="text.secondary">No milestones found</Typography>
        </Box>
      )}
    </Paper>
  );
};

// ============================================
// DASHBOARD FILTERS BAR COMPONENT
// ============================================
interface DashboardFiltersBarProps {
  filters: DashboardFiltersType;
  onFilterChange: (filters: DashboardFiltersType) => void;
}

const DashboardFiltersBar = ({ filters, onFilterChange }: DashboardFiltersBarProps) => {
  const { data: options, isLoading } = useGetFilterOptionsQuery();

  const handleChange = (key: keyof DashboardFiltersType, value: string) => {
    const newFilters = { ...filters, [key]: value || undefined };
    // Clear dependent filters when parent changes
    if (key === 'workspace_id') {
      newFilters.project_id = undefined;
    }
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    onFilterChange({});
  };

  const hasActiveFilters = Object.values(filters).some((v) => v);

  // Filter projects based on selected workspace
  const filteredProjects = options?.projects.filter(
    (p) => !filters.workspace_id || p.workspace_id === Number(filters.workspace_id)
  ) || [];

  if (isLoading) {
    return (
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} variant="rectangular" width={150} height={40} sx={{ borderRadius: 1 }} />
          ))}
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <FilterList color="primary" />
        <Typography variant="subtitle1" fontWeight={600}>Filters</Typography>
        {hasActiveFilters && (
          <Chip
            label="Clear All"
            size="small"
            onClick={clearFilters}
            onDelete={clearFilters}
            deleteIcon={<Clear />}
            sx={{ ml: 'auto' }}
          />
        )}
      </Stack>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Date Range</InputLabel>
            <Select
              value={filters.date_range || ''}
              label="Date Range"
              onChange={(e) => handleChange('date_range', e.target.value)}
            >
              <MenuItem value="">All Time</MenuItem>
              {options?.date_ranges.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Workspace</InputLabel>
            <Select
              value={filters.workspace_id || ''}
              label="Workspace"
              onChange={(e) => handleChange('workspace_id', e.target.value)}
            >
              <MenuItem value="">All Workspaces</MenuItem>
              {options?.workspaces.map((ws) => (
                <MenuItem key={ws.id} value={ws.id}>{ws.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Project</InputLabel>
            <Select
              value={filters.project_id || ''}
              label="Project"
              onChange={(e) => handleChange('project_id', e.target.value)}
            >
              <MenuItem value="">All Projects</MenuItem>
              {filteredProjects.map((p) => (
                <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Assignee</InputLabel>
            <Select
              value={filters.assignee_id || ''}
              label="Assignee"
              onChange={(e) => handleChange('assignee_id', e.target.value)}
            >
              <MenuItem value="">All Assignees</MenuItem>
              {options?.assignees.map((a) => (
                <MenuItem key={a.id} value={a.id}>{a.username}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Status</InputLabel>
            <Select
              value={filters.status || ''}
              label="Status"
              onChange={(e) => handleChange('status', e.target.value)}
            >
              <MenuItem value="">All Statuses</MenuItem>
              {options?.statuses.map((s) => (
                <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Priority</InputLabel>
            <Select
              value={filters.priority || ''}
              label="Priority"
              onChange={(e) => handleChange('priority', e.target.value)}
            >
              <MenuItem value="">All Priorities</MenuItem>
              {options?.priorities.map((p) => (
                <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>
    </Paper>
  );
};

// ============================================
// QUICK CREATE FAB COMPONENT
// ============================================
const QuickCreateFAB = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <Box sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000 }}>
      {open && (
        <Stack spacing={1} sx={{ mb: 1 }}>
          <Tooltip title="New Task" placement="left">
            <IconButton
              color="primary"
              sx={{ bgcolor: 'background.paper', boxShadow: 2, '&:hover': { bgcolor: 'primary.light', color: 'white' } }}
              onClick={() => { navigate('/tasks'); setOpen(false); }}
            >
              <Assignment />
            </IconButton>
          </Tooltip>
          <Tooltip title="New Project" placement="left">
            <IconButton
              color="info"
              sx={{ bgcolor: 'background.paper', boxShadow: 2, '&:hover': { bgcolor: 'info.light', color: 'white' } }}
              onClick={() => { navigate('/projects'); setOpen(false); }}
            >
              <Folder />
            </IconButton>
          </Tooltip>
        </Stack>
      )}
      <Tooltip title={open ? 'Close' : 'Quick Create'} placement="left">
        <IconButton
          color="primary"
          sx={{
            bgcolor: 'primary.main',
            color: 'white',
            width: 56,
            height: 56,
            boxShadow: 3,
            '&:hover': { bgcolor: 'primary.dark' },
            transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }}
          onClick={() => setOpen(!open)}
        >
          <Add />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

// ============================================
// MAIN DASHBOARD PAGE COMPONENT
// ============================================
export const DashboardPage = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<DashboardFiltersType>({});

  const { data: overview, isLoading: loadingOverview } = useGetDashboardOverviewQuery();
  const { data: myTasks, isLoading: loadingTasks } = useGetMyTasksSummaryQuery();
  const { data: projects, isLoading: loadingProjects } = useListProjectsQuery();
  const { data: filteredData } = useGetFilteredOverviewQuery(filters, { skip: !Object.keys(filters).some(k => filters[k as keyof DashboardFiltersType]) });

  const isLoading = loadingOverview || loadingTasks;

  // Use filtered data if filters are applied, otherwise use regular overview
  const hasFilters = Object.values(filters).some((v) => v);
  const displayData = hasFilters && filteredData ? {
    total_projects: filteredData.total_projects,
    total_tasks: filteredData.total_tasks,
    completed_tasks: filteredData.completed_tasks,
    overdue_tasks: filteredData.overdue_tasks,
    tasks_by_status: filteredData.tasks_by_status,
    tasks_by_priority: filteredData.tasks_by_priority,
  } : overview;

  // Chart data for task status distribution
  const statusChartData = {
    labels: Object.keys(displayData?.tasks_by_status || {}).map((s) => s.replace('_', ' ')),
    datasets: [
      {
        data: Object.values(displayData?.tasks_by_status || {}),
        backgroundColor: ['#9e9e9e', '#667eea', '#f59e0b', '#10b981', '#ef4444'],
        borderWidth: 0,
      },
    ],
  };

  // Chart data for priority distribution
  const priorityChartData = {
    labels: Object.keys(displayData?.tasks_by_priority || {}),
    datasets: [
      {
        data: Object.values(displayData?.tasks_by_priority || {}),
        backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#764ba2'],
        borderWidth: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
    },
  };

  if (isLoading) {
    return (
      <Box>
        <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>Dashboard</Typography>
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
          <Grid item xs={12}>
            <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
          </Grid>
        </Grid>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Dashboard</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<Folder />} onClick={() => navigate('/projects')}>
            View Projects
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/tasks')}>
            New Task
          </Button>
        </Stack>
      </Stack>

      {/* Dashboard Filters */}
      <DashboardFiltersBar filters={filters} onFilterChange={setFilters} />

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Total Projects" value={displayData?.total_projects || 0} icon={<Folder />} color="#667eea" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Total Tasks" value={displayData?.total_tasks || 0} icon={<Assignment />} color="#764ba2" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Completed Tasks" value={displayData?.completed_tasks || 0} icon={<AssignmentTurnedIn />} color="#10b981" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Overdue Tasks" value={displayData?.overdue_tasks || 0} icon={<AssignmentLate />} color="#ef4444" />
        </Grid>
      </Grid>

      {/* Project Timeline Report - Full Width */}
      <Box sx={{ mb: 3 }}>
        {loadingProjects ? (
          <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
        ) : (
          <ProjectTimelineReport projects={projects || []} />
        )}
      </Box>

      {/* Charts Row */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>Tasks by Status</Typography>
            <Box sx={{ height: 250 }}>
              {Object.keys(displayData?.tasks_by_status || {}).length > 0 ? (
                <Doughnut data={statusChartData} options={chartOptions} />
              ) : (
                <Stack alignItems="center" justifyContent="center" sx={{ height: '100%' }}>
                  <Assignment sx={{ fontSize: 48, color: 'grey.300' }} />
                  <Typography color="text.secondary">No tasks yet</Typography>
                </Stack>
              )}
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>Tasks by Priority</Typography>
            <Box sx={{ height: 250 }}>
              {Object.keys(displayData?.tasks_by_priority || {}).length > 0 ? (
                <Doughnut data={priorityChartData} options={chartOptions} />
              ) : (
                <Stack alignItems="center" justifyContent="center" sx={{ height: '100%' }}>
                  <Assignment sx={{ fontSize: 48, color: 'grey.300' }} />
                  <Typography color="text.secondary">No tasks yet</Typography>
                </Stack>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* New Reports Row */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <UpcomingDeadlinesReport />
        </Grid>
        <Grid item xs={12} md={4}>
          <TeamWorkloadReport />
        </Grid>
        <Grid item xs={12} md={4}>
          <ProjectProgressReport />
        </Grid>
      </Grid>

      {/* Task Completion Trend + Active Sprints Row */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <TaskCompletionTrendChart />
        </Grid>
        <Grid item xs={12} md={4}>
          <ActiveSprintsReport />
        </Grid>
      </Grid>

      {/* Notifications + Recently Viewed + Workspace Switcher Row */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <NotificationsPanel />
        </Grid>
        <Grid item xs={12} md={4}>
          <RecentlyViewedList />
        </Grid>
        <Grid item xs={12} md={4}>
          <TimeTrackingSummary />
        </Grid>
      </Grid>

      {/* Workspace Switcher + Milestone Progress Row */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <WorkspaceSwitcher />
        </Grid>
        <Grid item xs={12} md={8}>
          <MilestoneProgressReport />
        </Grid>
      </Grid>

      {/* My Tasks and Activity */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="h6" fontWeight={600}>My Tasks</Typography>
              <Button size="small" onClick={() => navigate('/tasks')}>View All</Button>
            </Stack>

            {myTasks?.overdue && myTasks.overdue > 0 && (
              <Box sx={{ p: 2, mb: 2, bgcolor: (theme) => alpha(theme.palette.error.main, 0.1), borderRadius: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Warning color="error" />
                  <Typography color="error.main" fontWeight={500}>
                    {myTasks.overdue} overdue task{myTasks.overdue > 1 ? 's' : ''}
                  </Typography>
                </Stack>
              </Box>
            )}

            {myTasks?.due_this_week && myTasks.due_this_week > 0 && (
              <Box sx={{ p: 2, mb: 2, bgcolor: (theme) => alpha(theme.palette.warning.main, 0.1), borderRadius: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <CalendarToday color="warning" />
                  <Typography color="warning.main" fontWeight={500}>
                    {myTasks.due_this_week} task{myTasks.due_this_week > 1 ? 's' : ''} due this week
                  </Typography>
                </Stack>
              </Box>
            )}

            {myTasks?.tasks && myTasks.tasks.length > 0 ? (
              <Stack spacing={1}>
                {myTasks.tasks.slice(0, 5).map((task) => (
                  <Card key={task.id} variant="outlined" sx={{ transition: 'all 0.2s', '&:hover': { boxShadow: 1 } }}>
                    <CardActionArea onClick={() => navigate('/tasks')}>
                      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="subtitle2" fontWeight={600} noWrap>{task.title}</Typography>
                            {task.project_name && (
                              <Typography variant="caption" color="text.secondary">{task.project_name}</Typography>
                            )}
                          </Box>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <Chip label={task.status.replace('_', ' ')} color={statusColors[task.status] || 'default'} size="small" sx={{ height: 20 }} />
                            <Chip label={task.priority} color={priorityColors[task.priority] || 'default'} size="small" variant="outlined" sx={{ height: 20 }} />
                          </Stack>
                        </Stack>
                        {task.due_date && (
                          <Typography
                            variant="caption"
                            color={new Date(task.due_date) < new Date() ? 'error' : 'text.secondary'}
                            sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}
                          >
                            <CalendarToday sx={{ fontSize: 12 }} />
                            Due: {new Date(task.due_date).toLocaleDateString()}
                          </Typography>
                        )}
                      </CardContent>
                    </CardActionArea>
                  </Card>
                ))}
              </Stack>
            ) : (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <AssignmentTurnedIn sx={{ fontSize: 48, color: 'grey.300', mb: 1 }} />
                <Typography color="text.secondary">No tasks assigned to you</Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="h6" fontWeight={600}>Recent Activity</Typography>
            </Stack>
            <ActivityLogList compact limit={10} />
          </Paper>
        </Grid>
      </Grid>

      {/* Quick Create FAB */}
      <QuickCreateFAB />
    </Box>
  );
};
