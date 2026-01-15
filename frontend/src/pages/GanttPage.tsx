import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Chip,
  LinearProgress,
  Tooltip,
  Stack,
  IconButton,
  Avatar,
  ToggleButton,
  ToggleButtonGroup,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  alpha,
  Card,
  CardContent,
  Grid,
  Badge,
  Button,
} from '@mui/material';
import {
  ChevronRight,
  ExpandMore,
  ZoomIn,
  ZoomOut,
  ViewTimeline,
  ViewList,
  CalendarMonth,
  Dashboard,
  ChevronLeft,
} from '@mui/icons-material';
import { useListProjectsQuery } from '../api/projectApi';
import {
  useGetProjectTimelineQuery,
  useUpdateTimelineItemMutation,
  TimelineItem,
} from '../api/ganttApi';

// Types
type ViewType = 'gantt' | 'list' | 'calendar' | 'portfolio';

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

// ============================================
// GANTT VIEW COMPONENT
// ============================================
interface GanttBarProps {
  item: TimelineItem;
  timelineStart: Date;
  totalDays: number;
  dayWidth: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  hasChildren: boolean;
  onDragEnd: (itemId: string, newStart: string, newEnd: string) => void;
  rowIndex: number;
}

const GanttBar = ({
  item,
  timelineStart,
  dayWidth,
  isExpanded,
  onToggleExpand,
  hasChildren,
  onDragEnd,
}: GanttBarProps) => {
  const barRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const originalStart = useRef(0);
  const originalWidth = useRef(0);

  const itemStart = item.start_date ? new Date(item.start_date) : timelineStart;
  const itemEnd = item.end_date ? new Date(item.end_date) : itemStart;

  const startOffset = Math.max(0, (itemStart.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24));
  const duration = Math.max(1, (itemEnd.getTime() - itemStart.getTime()) / (1000 * 60 * 60 * 24) + 1);

  const leftPx = startOffset * dayWidth;
  const widthPx = duration * dayWidth;

  const barColor = STATUS_COLORS[item.status] || TYPE_COLORS[item.type];
  const indent = item.level * 20;

  const handleMouseDown = (e: React.MouseEvent, type: 'move' | 'resize-start' | 'resize-end') => {
    if (!item.editable) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    dragStartX.current = e.clientX;
    originalStart.current = leftPx;
    originalWidth.current = widthPx;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - dragStartX.current;

      if (barRef.current) {
        if (type === 'move') {
          const newLeft = Math.max(0, originalStart.current + deltaX);
          barRef.current.style.left = `${newLeft}px`;
        } else if (type === 'resize-end') {
          const newWidth = Math.max(dayWidth, originalWidth.current + deltaX);
          barRef.current.style.width = `${newWidth}px`;
        } else if (type === 'resize-start') {
          const newLeft = Math.max(0, originalStart.current + deltaX);
          const newWidth = Math.max(dayWidth, originalWidth.current - deltaX);
          barRef.current.style.left = `${newLeft}px`;
          barRef.current.style.width = `${newWidth}px`;
        }
      }
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      const deltaX = upEvent.clientX - dragStartX.current;
      const deltaDays = Math.round(deltaX / dayWidth);

      if (deltaDays !== 0) {
        let newStartDate = new Date(itemStart);
        let newEndDate = new Date(itemEnd);

        if (type === 'move') {
          newStartDate.setDate(newStartDate.getDate() + deltaDays);
          newEndDate.setDate(newEndDate.getDate() + deltaDays);
        } else if (type === 'resize-end') {
          newEndDate.setDate(newEndDate.getDate() + deltaDays);
        } else if (type === 'resize-start') {
          newStartDate.setDate(newStartDate.getDate() + deltaDays);
        }

        onDragEnd(
          item.id,
          newStartDate.toISOString().split('T')[0],
          newEndDate.toISOString().split('T')[0]
        );
      } else if (barRef.current) {
        barRef.current.style.left = `${leftPx}px`;
        barRef.current.style.width = `${widthPx}px`;
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        height: 40,
        borderBottom: '1px solid',
        borderColor: 'divider',
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      <Box
        sx={{
          width: 280,
          minWidth: 280,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          pl: `${indent + 8}px`,
          pr: 1,
          borderRight: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        {hasChildren ? (
          <IconButton size="small" onClick={onToggleExpand} sx={{ mr: 0.5 }}>
            {isExpanded ? <ExpandMore fontSize="small" /> : <ChevronRight fontSize="small" />}
          </IconButton>
        ) : (
          <Box sx={{ width: 28 }} />
        )}

        <Chip
          label={item.type.charAt(0).toUpperCase()}
          size="small"
          sx={{
            bgcolor: TYPE_COLORS[item.type],
            color: 'white',
            fontSize: '0.65rem',
            height: 20,
            width: 20,
            mr: 1,
            '& .MuiChip-label': { px: 0 },
          }}
        />

        <Tooltip title={item.name}>
          <Typography
            variant="body2"
            noWrap
            sx={{
              flex: 1,
              fontWeight: item.type === 'project' ? 600 : 400,
              fontSize: item.type === 'task' ? '0.8rem' : '0.875rem',
            }}
          >
            {item.name}
          </Typography>
        </Tooltip>

        {item.assignee && (
          <Tooltip title={item.assignee.username}>
            <Avatar sx={{ width: 22, height: 22, fontSize: '0.65rem', bgcolor: 'primary.main', ml: 1 }}>
              {item.assignee.initials}
            </Avatar>
          </Tooltip>
        )}
      </Box>

      <Box sx={{ flex: 1, position: 'relative', height: '100%', overflow: 'hidden' }}>
        <Tooltip
          title={
            <Box>
              <Typography variant="body2" fontWeight={600}>{item.name}</Typography>
              <Typography variant="caption" display="block">
                {item.start_date} → {item.end_date}
              </Typography>
              <Typography variant="caption" display="block">Progress: {item.progress}%</Typography>
              <Typography variant="caption" display="block">Status: {item.status}</Typography>
            </Box>
          }
        >
          <Box
            ref={barRef}
            sx={{
              position: 'absolute',
              top: 6,
              left: leftPx,
              width: widthPx,
              height: 28,
              borderRadius: 1,
              cursor: item.editable ? (isDragging ? 'grabbing' : 'grab') : 'default',
              overflow: 'hidden',
              boxShadow: isDragging ? 3 : 1,
              transition: isDragging ? 'none' : 'box-shadow 0.2s',
              zIndex: isDragging ? 10 : 1,
            }}
          >
            <Box sx={{ position: 'absolute', inset: 0, bgcolor: alpha(barColor, 0.3), border: `1px solid ${barColor}`, borderRadius: 1 }} />
            <Box sx={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: `${item.progress}%`, bgcolor: barColor, borderRadius: '4px 0 0 4px' }} />
            <Box onMouseDown={(e) => handleMouseDown(e, 'move')} sx={{ position: 'absolute', inset: 0, left: 8, right: 8 }} />
            {item.editable && <Box onMouseDown={(e) => handleMouseDown(e, 'resize-start')} sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 8, cursor: 'ew-resize' }} />}
            {item.editable && <Box onMouseDown={(e) => handleMouseDown(e, 'resize-end')} sx={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 8, cursor: 'ew-resize' }} />}
            {widthPx > 40 && (
              <Typography variant="caption" sx={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: item.progress > 50 ? 'white' : 'text.primary', fontWeight: 500, fontSize: '0.7rem', pointerEvents: 'none' }}>
                {item.progress}%
              </Typography>
            )}
            {item.priority && (
              <Box sx={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', width: 8, height: 8, borderRadius: '50%', bgcolor: PRIORITY_COLORS[item.priority] || '#9e9e9e' }} />
            )}
          </Box>
        </Tooltip>
      </Box>
    </Box>
  );
};

// Gantt View Component
interface GanttViewProps {
  items: TimelineItem[];
  dayWidth: number;
  onDragEnd: (itemId: string, newStart: string, newEnd: string) => void;
}

const GanttView = ({ items, dayWidth, onDragEnd }: GanttViewProps) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useMemo(() => {
    const allParents = new Set(items.filter((item) => items.some((child) => child.parent_id === item.id)).map((item) => item.id));
    setExpandedItems(allParents);
  }, [items]);

  const visibleItems = useMemo(() => {
    const result: TimelineItem[] = [];
    const itemIds = new Set(items.map((i) => i.id));

    for (const item of items) {
      let parent = item.parent_id;
      let isHidden = false;
      while (parent) {
        // Only check expansion if parent is in the current items list
        // If parent is filtered out, don't hide the item
        if (itemIds.has(parent) && !expandedItems.has(parent)) {
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
  const totalDays = months.reduce((sum, m) => sum + m.days, 0);

  return (
    <Box sx={{ overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', borderBottom: '2px solid', borderColor: 'divider', bgcolor: 'grey.100' }}>
        <Box sx={{ width: 280, minWidth: 280, flexShrink: 0, p: 1, borderRight: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle2">Task / Item</Typography>
        </Box>
        <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {months.map((month, idx) => (
            <Box key={idx} sx={{ width: month.days * dayWidth, minWidth: month.days * dayWidth, textAlign: 'center', py: 1, borderRight: '1px solid', borderColor: 'divider' }}>
              <Typography variant="caption" fontWeight={600}>{month.name}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
      <Box sx={{ position: 'relative', overflow: 'auto', maxHeight: 'calc(100vh - 300px)' }}>
        {visibleItems.map((item, index) => (
          <GanttBar
            key={item.id}
            item={item}
            timelineStart={timelineStart}
            totalDays={totalDays}
            dayWidth={dayWidth}
            isExpanded={expandedItems.has(item.id)}
            onToggleExpand={() => toggleExpand(item.id)}
            hasChildren={hasChildren(item.id)}
            onDragEnd={onDragEnd}
            rowIndex={index}
          />
        ))}
      </Box>
    </Box>
  );
};

// ============================================
// LIST VIEW COMPONENT
// ============================================
interface ListViewProps {
  items: TimelineItem[];
}

const ListView = ({ items }: ListViewProps) => {
  const tasks = items.filter((item) => item.type === 'task');

  return (
    <TableContainer sx={{ maxHeight: 'calc(100vh - 300px)' }}>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.100' }}>Task Name</TableCell>
            <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.100' }}>Status</TableCell>
            <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.100' }}>Priority</TableCell>
            <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.100' }}>Assignee</TableCell>
            <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.100' }}>Start Date</TableCell>
            <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.100' }}>End Date</TableCell>
            <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.100' }}>Progress</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {tasks.map((task) => (
            <TableRow key={task.id} hover>
              <TableCell>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: TYPE_COLORS.task }} />
                  <Typography variant="body2">{task.name}</Typography>
                </Stack>
              </TableCell>
              <TableCell>
                <Chip label={task.status} size="small" sx={{ bgcolor: alpha(STATUS_COLORS[task.status] || '#9e9e9e', 0.2), color: STATUS_COLORS[task.status] || '#9e9e9e', fontWeight: 500 }} />
              </TableCell>
              <TableCell>
                {task.priority && (
                  <Chip label={task.priority} size="small" sx={{ bgcolor: alpha(PRIORITY_COLORS[task.priority] || '#9e9e9e', 0.2), color: PRIORITY_COLORS[task.priority] || '#9e9e9e', fontWeight: 500 }} />
                )}
              </TableCell>
              <TableCell>
                {task.assignee && (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem', bgcolor: 'primary.main' }}>{task.assignee.initials}</Avatar>
                    <Typography variant="body2">{task.assignee.username}</Typography>
                  </Stack>
                )}
              </TableCell>
              <TableCell><Typography variant="body2">{task.start_date || '-'}</Typography></TableCell>
              <TableCell><Typography variant="body2">{task.end_date || '-'}</Typography></TableCell>
              <TableCell>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box sx={{ flex: 1, height: 6, bgcolor: 'grey.200', borderRadius: 1, overflow: 'hidden' }}>
                    <Box sx={{ width: `${task.progress}%`, height: '100%', bgcolor: STATUS_COLORS[task.status] || 'primary.main' }} />
                  </Box>
                  <Typography variant="caption" sx={{ minWidth: 35 }}>{task.progress}%</Typography>
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

// ============================================
// CALENDAR VIEW COMPONENT
// ============================================
interface CalendarViewProps {
  items: TimelineItem[];
}

const CalendarView = ({ items }: CalendarViewProps) => {
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

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <IconButton onClick={prevMonth}><ChevronLeft /></IconButton>
        <Typography variant="h6" fontWeight={600}>{monthName}</Typography>
        <IconButton onClick={nextMonth}><ChevronRight /></IconButton>
      </Stack>

      <Grid container spacing={0.5}>
        {days.map((day) => (
          <Grid item xs={12 / 7} key={day}>
            <Box sx={{ p: 1, textAlign: 'center', bgcolor: 'grey.100', fontWeight: 600 }}>
              <Typography variant="caption">{day}</Typography>
            </Box>
          </Grid>
        ))}

        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
          <Grid item xs={12 / 7} key={`empty-${i}`}>
            <Box sx={{ p: 1, minHeight: 80, bgcolor: 'grey.50' }} />
          </Grid>
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dayTasks = tasksOnDay(day);
          const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();

          return (
            <Grid item xs={12 / 7} key={day}>
              <Box
                sx={{
                  p: 0.5,
                  minHeight: 80,
                  border: '1px solid',
                  borderColor: isToday ? 'primary.main' : 'divider',
                  bgcolor: isToday ? alpha('#1976d2', 0.05) : 'background.paper',
                  overflow: 'hidden',
                }}
              >
                <Typography variant="caption" fontWeight={isToday ? 700 : 400} color={isToday ? 'primary.main' : 'text.secondary'}>
                  {day}
                </Typography>
                <Stack spacing={0.25} sx={{ mt: 0.5 }}>
                  {dayTasks.slice(0, 3).map((task) => (
                    <Tooltip key={task.id} title={`${task.name} (${task.progress}%)`}>
                      <Box
                        sx={{
                          px: 0.5,
                          py: 0.25,
                          bgcolor: alpha(TYPE_COLORS[task.type], 0.2),
                          borderLeft: `3px solid ${TYPE_COLORS[task.type]}`,
                          borderRadius: 0.5,
                          overflow: 'hidden',
                        }}
                      >
                        <Typography variant="caption" noWrap sx={{ fontSize: '0.65rem' }}>
                          {task.name}
                        </Typography>
                      </Box>
                    </Tooltip>
                  ))}
                  {dayTasks.length > 3 && (
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                      +{dayTasks.length - 3} more
                    </Typography>
                  )}
                </Stack>
              </Box>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};

// ============================================
// PORTFOLIO VIEW COMPONENT (Multi-Project)
// ============================================
interface PortfolioViewProps {
  projects: { id: number; name: string; status?: string; start_date?: string; end_date?: string }[];
}

const PortfolioView = ({ projects }: PortfolioViewProps) => {
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
        maxDate: new Date(now.getFullYear(), now.getMonth() + 6, 0),
        totalDays: 180,
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
      monthList.push({ name: current.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), days: monthDays });
      current.setMonth(current.getMonth() + 1);
      current.setDate(1);
    }
    return monthList;
  }, [minDate, maxDate]);

  return (
    <Box>
      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
        All Projects Timeline
      </Typography>

      <Box sx={{ display: 'flex', borderBottom: '2px solid', borderColor: 'divider', bgcolor: 'grey.100' }}>
        <Box sx={{ width: 200, minWidth: 200, flexShrink: 0, p: 1, borderRight: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle2">Project</Typography>
        </Box>
        <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {months.map((month, idx) => (
            <Box key={idx} sx={{ width: `${(month.days / totalDays) * 100}%`, textAlign: 'center', py: 1, borderRight: '1px solid', borderColor: 'divider' }}>
              <Typography variant="caption" fontWeight={600}>{month.name}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {projects.map((project, index) => {
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
              height: 50,
              borderBottom: '1px solid',
              borderColor: 'divider',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <Box sx={{ width: 200, minWidth: 200, flexShrink: 0, px: 1, borderRight: '1px solid', borderColor: 'divider' }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: color }} />
                <Typography variant="body2" fontWeight={500} noWrap>{project.name}</Typography>
              </Stack>
            </Box>
            <Box sx={{ flex: 1, position: 'relative', height: '100%' }}>
              <Tooltip title={`${project.name}: ${project.start_date} → ${project.end_date}`}>
                <Box
                  sx={{
                    position: 'absolute',
                    top: 10,
                    left: `${leftPercent}%`,
                    width: `${widthPercent}%`,
                    height: 30,
                    bgcolor: color,
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    px: 1,
                    boxShadow: 1,
                  }}
                >
                  <Typography variant="caption" sx={{ color: 'white', fontWeight: 500 }} noWrap>
                    {project.name}
                  </Typography>
                </Box>
              </Tooltip>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};

// ============================================
// MAIN GANTT PAGE COMPONENT
// ============================================
export const GanttPage = () => {
  const [selectedProject, setSelectedProject] = useState<number | ''>('');
  const [viewType, setViewType] = useState<ViewType>('gantt');
  const [dayWidth, setDayWidth] = useState(15); // Default 15px

  // Portfolio filters
  const [portfolioStatusFilter, setPortfolioStatusFilter] = useState<string>('');

  // Timeline filters
  const [taskStatusFilter, setTaskStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');

  const { data: projects, isLoading: loadingProjects } = useListProjectsQuery();

  // Auto-select first project when projects load
  useEffect(() => {
    if (projects && projects.length > 0 && selectedProject === '') {
      setSelectedProject(projects[0].id);
    }
  }, [projects, selectedProject]);

  // Filter projects for portfolio view
  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    if (!portfolioStatusFilter) return projects;
    return projects.filter((p) => p.status === portfolioStatusFilter);
  }, [projects, portfolioStatusFilter]);

  // Get unique statuses for filter dropdown
  const availableStatuses = useMemo(() => {
    if (!projects) return [];
    const statuses = new Set(projects.map((p) => p.status).filter(Boolean));
    return Array.from(statuses) as string[];
  }, [projects]);

  // Clear all filters
  const clearFilters = () => {
    setTaskStatusFilter('');
    setPriorityFilter('');
    setAssigneeFilter('');
    setTypeFilter('');
    setPortfolioStatusFilter('');
  };

  const hasActiveFilters = taskStatusFilter || priorityFilter || assigneeFilter || typeFilter || portfolioStatusFilter;

  const { data: timelineData, isLoading: loadingTimeline } = useGetProjectTimelineQuery(
    selectedProject as number,
    { skip: !selectedProject || viewType === 'portfolio' }
  );
  const [updateTimelineItem] = useUpdateTimelineItemMutation();

  // Get filter options - use predefined values for consistency
  const filterOptions = useMemo(() => {
    // Predefined options matching backend model choices
    const statuses = ['To-do', 'In Progress', 'Review', 'Done'];
    const priorities = ['Low', 'Medium', 'High', 'Critical'];
    const types = ['project', 'milestone', 'sprint', 'task'];

    // Assignees are extracted from actual data
    const assignees = new Map<string, { id: string; username: string }>();
    if (timelineData?.items) {
      timelineData.items.forEach((item) => {
        if (item.assignee) {
          assignees.set(item.assignee.username, {
            id: String(item.assignee.id || item.assignee.username),
            username: item.assignee.username,
          });
        }
      });
    }

    return {
      statuses,
      priorities,
      assignees: Array.from(assignees.values()),
      types,
    };
  }, [timelineData]);

  // Filter timeline items
  const filteredItems = useMemo(() => {
    if (!timelineData?.items) return [];

    const hasTaskFilters = taskStatusFilter || priorityFilter || assigneeFilter;

    // If filtering by type only, just filter by type
    if (typeFilter && !hasTaskFilters) {
      return timelineData.items.filter((item) => item.type === typeFilter);
    }

    // If no task-specific filters, return all items (or filtered by type)
    if (!hasTaskFilters) {
      return timelineData.items;
    }

    // For task-specific filters (status, priority, assignee):
    // 1. Find tasks that match the filters
    // 2. Include their parent items (sprint, milestone, project)
    const matchingTaskIds = new Set<string>();
    const parentIdsToInclude = new Set<string>();

    // First pass: find matching tasks and collect their parent chain
    timelineData.items.forEach((item) => {
      if (item.type === 'task') {
        let matches = true;
        if (taskStatusFilter && item.status !== taskStatusFilter) matches = false;
        if (priorityFilter && item.priority !== priorityFilter) matches = false;
        if (assigneeFilter && item.assignee?.username !== assigneeFilter) matches = false;

        if (matches) {
          matchingTaskIds.add(item.id);
          // Add all parents to the include set
          let parentId = item.parent_id;
          while (parentId) {
            parentIdsToInclude.add(parentId);
            const parent = timelineData.items.find((i) => i.id === parentId);
            parentId = parent?.parent_id || null;
          }
        }
      }
    });

    // Second pass: include matching tasks and their parents
    return timelineData.items.filter((item) => {
      if (typeFilter && item.type !== typeFilter) return false;
      if (item.type === 'task') return matchingTaskIds.has(item.id);
      return parentIdsToInclude.has(item.id);
    });
  }, [timelineData, taskStatusFilter, priorityFilter, assigneeFilter, typeFilter]);

  const handleDragEnd = useCallback(
    async (itemId: string, newStart: string, newEnd: string) => {
      if (!selectedProject) return;
      const [type, id] = itemId.split('-');
      await updateTimelineItem({
        projectId: selectedProject as number,
        data: {
          item_type: type as 'project' | 'milestone' | 'sprint' | 'task',
          item_id: parseInt(id),
          start_date: newStart,
          end_date: newEnd,
        },
      });
    },
    [selectedProject, updateTimelineItem]
  );

  const handleViewChange = (_: React.MouseEvent<HTMLElement>, newView: ViewType | null) => {
    if (newView) setViewType(newView);
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={600}>Project Views</Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <ToggleButtonGroup value={viewType} exclusive onChange={handleViewChange} size="small">
            <ToggleButton value="gantt">
              <Tooltip title="Gantt Chart"><ViewTimeline /></Tooltip>
            </ToggleButton>
            <ToggleButton value="list">
              <Tooltip title="List View"><ViewList /></Tooltip>
            </ToggleButton>
            <ToggleButton value="calendar">
              <Tooltip title="Calendar View"><CalendarMonth /></Tooltip>
            </ToggleButton>
            <ToggleButton value="portfolio">
              <Tooltip title="Portfolio View"><Dashboard /></Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>

          {viewType === 'gantt' && (
            <>
              <IconButton onClick={() => setDayWidth((w) => Math.max(10, w - 5))} size="small"><ZoomOut /></IconButton>
              <Typography variant="body2" color="text.secondary">{dayWidth}px</Typography>
              <IconButton onClick={() => setDayWidth((w) => Math.min(60, w + 5))} size="small"><ZoomIn /></IconButton>
            </>
          )}

          {viewType !== 'portfolio' ? (
            <FormControl size="small" sx={{ minWidth: 250 }}>
              <InputLabel>Select Project</InputLabel>
              <Select value={selectedProject} label="Select Project" onChange={(e) => setSelectedProject(e.target.value as number)}>
                {projects?.map((project) => (
                  <MenuItem key={project.id} value={project.id}>{project.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : (
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Filter by Status</InputLabel>
              <Select
                value={portfolioStatusFilter}
                label="Filter by Status"
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
        </Stack>
      </Stack>

      {/* Filters Row */}
      {viewType !== 'portfolio' && selectedProject && timelineData && (
        <Paper sx={{ p: 1.5, mb: 2 }}>
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="body2" fontWeight={600} color="text.secondary" sx={{ mr: 1 }}>
              Filters:
            </Typography>

            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>Type</InputLabel>
              <Select value={typeFilter} label="Type" onChange={(e) => setTypeFilter(e.target.value)}>
                <MenuItem value="">All Types</MenuItem>
                {filterOptions.types.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Status</InputLabel>
              <Select value={taskStatusFilter} label="Status" onChange={(e) => setTaskStatusFilter(e.target.value)}>
                <MenuItem value="">All Statuses</MenuItem>
                {filterOptions.statuses.map((status) => (
                  <MenuItem key={status} value={status}>{status}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>Priority</InputLabel>
              <Select value={priorityFilter} label="Priority" onChange={(e) => setPriorityFilter(e.target.value)}>
                <MenuItem value="">All Priorities</MenuItem>
                {filterOptions.priorities.map((priority) => (
                  <MenuItem key={priority} value={priority}>{priority}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Assignee</InputLabel>
              <Select value={assigneeFilter} label="Assignee" onChange={(e) => setAssigneeFilter(e.target.value)}>
                <MenuItem value="">All Assignees</MenuItem>
                {filterOptions.assignees.map((assignee) => (
                  <MenuItem key={assignee.username} value={assignee.username}>{assignee.username}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button
              size="small"
              variant="outlined"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              sx={{ borderRadius: 4, minWidth: 80 }}
            >
              Clear All
            </Button>

            <Chip
              label={`${filteredItems.length} / ${timelineData.items.length} items`}
              size="small"
              color="primary"
              sx={{ color: 'white', borderRadius: 4 }}
            />
          </Stack>
        </Paper>
      )}

      {loadingProjects && <LinearProgress />}

      {viewType === 'portfolio' ? (
        <Paper sx={{ p: 2 }}>
          {!projects || projects.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Dashboard sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No Projects Available
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Create your first project to see the portfolio view here.
              </Typography>
            </Box>
          ) : filteredProjects.length > 0 ? (
            <PortfolioView projects={filteredProjects} />
          ) : (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Dashboard sx={{ fontSize: 48, color: 'grey.300', mb: 1 }} />
              <Typography color="text.secondary" gutterBottom>
                No projects match the selected filter
              </Typography>
              <Button size="small" variant="outlined" onClick={() => setPortfolioStatusFilter('')}>
                Clear Filter
              </Button>
            </Box>
          )}
        </Paper>
      ) : (
        <>
          {!projects || projects.length === 0 ? (
            <Paper sx={{ p: 6, textAlign: 'center' }}>
              <ViewTimeline sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No Projects Available
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Create your first project to see the timeline here.
              </Typography>
            </Paper>
          ) : !selectedProject ? (
            <Paper sx={{ p: 6, textAlign: 'center' }}>
              <ViewTimeline sx={{ fontSize: 48, color: 'grey.300', mb: 1 }} />
              <Typography color="text.secondary" gutterBottom>
                Please select a project to view the timeline
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Use the dropdown above to select a project
              </Typography>
            </Paper>
          ) : loadingTimeline ? (
            <Paper sx={{ p: 2 }}>
              <LinearProgress />
              <Typography color="text.secondary" textAlign="center" sx={{ mt: 2 }}>
                Loading timeline...
              </Typography>
            </Paper>
          ) : timelineData && timelineData.items.length > 0 ? (
            filteredItems.length > 0 ? (
              <Paper sx={{ p: viewType === 'calendar' ? 2 : 0, overflow: 'hidden' }}>
                {viewType === 'gantt' && (
                  <GanttView items={filteredItems} dayWidth={dayWidth} onDragEnd={handleDragEnd} />
                )}
                {viewType === 'list' && <ListView items={filteredItems} />}
                {viewType === 'calendar' && <CalendarView items={filteredItems} />}
              </Paper>
            ) : (
              <Paper sx={{ p: 6, textAlign: 'center' }}>
                <ViewTimeline sx={{ fontSize: 48, color: 'grey.300', mb: 1 }} />
                <Typography color="text.secondary" gutterBottom>
                  No items match the selected filters
                </Typography>
                <Button size="small" variant="outlined" onClick={clearFilters} sx={{ mt: 1 }}>
                  Clear Filters
                </Button>
              </Paper>
            )
          ) : (
            <Paper sx={{ p: 6, textAlign: 'center' }}>
              <ViewTimeline sx={{ fontSize: 48, color: 'grey.300', mb: 1 }} />
              <Typography color="text.secondary" gutterBottom>
                No timeline data for this project
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Add milestones, sprints, or tasks to see them here
              </Typography>
            </Paper>
          )}
        </>
      )}

      {/* Legend */}
      {viewType !== 'portfolio' && selectedProject && timelineData && (
        <Paper sx={{ p: 2, mt: 2 }}>
          <Stack direction="row" spacing={3} flexWrap="wrap" alignItems="center">
            <Typography variant="caption" fontWeight={600} color="text.secondary">Types:</Typography>
            {Object.entries(TYPE_COLORS).map(([type, color]) => (
              <Stack key={type} direction="row" spacing={0.5} alignItems="center">
                <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: color }} />
                <Typography variant="caption">{type}</Typography>
              </Stack>
            ))}
            <Box sx={{ width: 16 }} />
            <Typography variant="caption" fontWeight={600} color="text.secondary">Priority:</Typography>
            {Object.entries(PRIORITY_COLORS).map(([priority, color]) => (
              <Stack key={priority} direction="row" spacing={0.5} alignItems="center">
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
                <Typography variant="caption">{priority}</Typography>
              </Stack>
            ))}
          </Stack>
        </Paper>
      )}
    </Box>
  );
};
