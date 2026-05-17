import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Chip,
  Dialog,
  Divider,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  Add as AddIcon,
  BarChart as BarChartIcon,
  Dashboard as DashboardIcon,
  Folder as FolderIcon,
  Search as SearchIcon,
  ViewKanban as ViewKanbanIcon,
  Workspaces as WorkspacesIcon,
} from '@mui/icons-material';
import { useLazyQuickSearchQuery } from '../../api/searchApi';

interface PaletteItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
  badge?: string;
  action: () => void;
}

interface PaletteSection {
  title: string;
  items: PaletteItem[];
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export const CommandPalette = ({ open, onClose }: Props) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [triggerSearch, { data: searchData }] = useLazyQuickSearchQuery();
  const activeItemRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
    }
  }, [open]);

  // Debounce search trigger
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length >= 2) {
      debounceRef.current = setTimeout(() => {
        triggerSearch({ q: query.trim(), limit: 8 });
      }, 300);
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, triggerSearch]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    activeItemRef.current?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const go = (path: string) => {
    navigate(path);
    onClose();
  };

  const staticSections: PaletteSection[] = [
    {
      title: 'Navigation',
      items: [
        { id: 'nav-dashboard', icon: <DashboardIcon fontSize="small" />, label: 'Dashboard', action: () => go('/dashboard') },
        { id: 'nav-projects', icon: <FolderIcon fontSize="small" />, label: 'Projects', action: () => go('/projects') },
        { id: 'nav-tasks', icon: <AssignmentIcon fontSize="small" />, label: 'My Tasks', action: () => go('/tasks') },
        { id: 'nav-kanban', icon: <ViewKanbanIcon fontSize="small" />, label: 'Kanban Board', action: () => go('/kanban') },
        { id: 'nav-gantt', icon: <BarChartIcon fontSize="small" />, label: 'Gantt Chart', action: () => go('/gantt') },
        { id: 'nav-workspaces', icon: <WorkspacesIcon fontSize="small" />, label: 'Workspaces', action: () => go('/workspaces') },
      ],
    },
    {
      title: 'Quick Actions',
      items: [
        {
          id: 'action-create-project',
          icon: <AddIcon fontSize="small" />,
          label: 'Create Project',
          subtitle: 'Opens Projects page',
          action: () => go('/projects'),
        },
        {
          id: 'action-create-task',
          icon: <AddIcon fontSize="small" />,
          label: 'Create Task',
          subtitle: 'Opens Tasks page',
          action: () => go('/tasks'),
        },
      ],
    },
  ];

  const buildSearchSections = (): PaletteSection[] => {
    if (!searchData?.results?.length) {
      return [{ title: 'No results', items: [] }];
    }
    const taskItems: PaletteItem[] = searchData.results
      .filter((r) => r.type === 'task')
      .map((r) => ({
        id: `task-${r.id}`,
        icon: <AssignmentIcon fontSize="small" />,
        label: r.title ?? r.name ?? 'Untitled',
        subtitle: r.status ?? undefined,
        badge: 'task',
        action: () => go('/tasks'),
      }));
    const projectItems: PaletteItem[] = searchData.results
      .filter((r) => r.type === 'project')
      .map((r) => ({
        id: `project-${r.id}`,
        icon: <FolderIcon fontSize="small" />,
        label: r.name ?? 'Untitled',
        subtitle: r.status ?? undefined,
        badge: 'project',
        action: () => go(`/projects/${r.id}`),
      }));
    const sections: PaletteSection[] = [];
    if (taskItems.length) sections.push({ title: 'Tasks', items: taskItems });
    if (projectItems.length) sections.push({ title: 'Projects', items: projectItems });
    return sections.length ? sections : [{ title: 'No results', items: [] }];
  };

  const activeSections = query.trim().length >= 2 ? buildSearchSections() : staticSections;

  // Assign flat indices for keyboard navigation
  let counter = 0;
  const indexedSections = activeSections.map((section) => ({
    ...section,
    items: section.items.map((item) => ({ ...item, _idx: counter++ })),
  }));
  const totalItems = counter;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, totalItems - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      indexedSections.flatMap((s) => s.items).find((item) => item._idx === activeIndex)?.action();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{ sx: { mt: '10vh', verticalAlign: 'top', borderRadius: 3 } }}
    >
      <Box onKeyDown={handleKeyDown}>
        <TextField
          autoFocus
          fullWidth
          placeholder="Search tasks, projects… or type a command"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
            sx: { fontSize: '1.1rem', '& fieldset': { border: 'none' } },
          }}
          sx={{ px: 1, pt: 1 }}
        />

        <Divider />

        <List dense sx={{ maxHeight: 380, overflow: 'auto', py: 0.5 }}>
          {indexedSections.map((section) =>
            section.items.length === 0 ? (
              <Typography
                key={section.title}
                variant="body2"
                color="text.secondary"
                sx={{ px: 2, py: 2, textAlign: 'center' }}
              >
                No results for "{query}"
              </Typography>
            ) : (
              <Box key={section.title}>
                <Typography
                  variant="caption"
                  fontWeight={700}
                  color="text.secondary"
                  sx={{
                    px: 2,
                    pt: 1.5,
                    pb: 0.5,
                    display: 'block',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  {section.title}
                </Typography>
                {section.items.map((item) => (
                  <ListItemButton
                    key={item.id}
                    ref={item._idx === activeIndex ? activeItemRef : undefined}
                    selected={item._idx === activeIndex}
                    onClick={item.action}
                    sx={{ borderRadius: 1, mx: 0.5, my: 0.1 }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 36,
                        color: item._idx === activeIndex ? 'primary.main' : 'text.secondary',
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      secondary={item.subtitle}
                      primaryTypographyProps={{
                        fontSize: '0.9rem',
                        fontWeight: item._idx === activeIndex ? 600 : 400,
                      }}
                      secondaryTypographyProps={{ fontSize: '0.75rem' }}
                    />
                    {item.badge && (
                      <Chip label={item.badge} size="small" sx={{ fontSize: '0.65rem', height: 18 }} />
                    )}
                  </ListItemButton>
                ))}
              </Box>
            )
          )}
        </List>

        <Divider />

        <Box sx={{ px: 2, py: 0.75, display: 'flex', gap: 2 }}>
          <Typography variant="caption" color="text.secondary">↑↓ navigate</Typography>
          <Typography variant="caption" color="text.secondary">↵ select</Typography>
          <Typography variant="caption" color="text.secondary">Esc close</Typography>
        </Box>
      </Box>
    </Dialog>
  );
};
