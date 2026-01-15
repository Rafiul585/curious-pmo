import {
  Box,
  Collapse,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Divider,
  Typography,
  alpha,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Workspaces as WorkspacesIcon,
  Assignment as AssignmentIcon,
  ViewKanban as ViewKanbanIcon,
  BarChart as BarChartIcon,
  Search as SearchIcon,
  Folder as FolderIcon,
  Person as PersonIcon,
  ExpandLess,
  ExpandMore,
} from '@mui/icons-material';
import { NavLink, useLocation } from 'react-router-dom';
import { useState } from 'react';

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
  children?: { label: string; to: string }[];
}

interface DividerItem {
  divider: true;
  label?: string;
}

type NavItemOrDivider = NavItem | DividerItem;

const navItems: NavItemOrDivider[] = [
  { label: 'Dashboard', to: '/dashboard', icon: <DashboardIcon /> },
  { divider: true },
  { label: 'Workspaces', to: '/workspaces', icon: <WorkspacesIcon /> },
  {
    label: 'Projects',
    to: '/projects',
    icon: <FolderIcon />,
  },
  { label: 'Tasks', to: '/tasks', icon: <AssignmentIcon /> },
  { divider: true, label: 'VIEWS' },
  { label: 'Gantt Chart', to: '/gantt', icon: <BarChartIcon /> },
  { label: 'Kanban Board', to: '/kanban', icon: <ViewKanbanIcon /> },
  { divider: true, label: 'TOOLS' },
  { label: 'Search', to: '/search', icon: <SearchIcon /> },
  { divider: true },
  { label: 'My Profile', to: '/profile', icon: <PersonIcon /> },
];

const DRAWER_WIDTH = 240;

export const NavSidebar = () => {
  const location = useLocation();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  const toggleMenu = (label: string) => {
    setOpenMenus((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const isActive = (to: string) => location.pathname === to || location.pathname.startsWith(`${to}/`);

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          borderRight: 1,
          borderColor: 'divider',
        },
      }}
    >
      <Toolbar sx={{ justifyContent: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Logo Icon */}
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(102, 126, 234, 0.4)',
            }}
          >
            <Typography sx={{ color: 'white', fontWeight: 800, fontSize: '1rem' }}>C</Typography>
          </Box>
          {/* Logo Text */}
          <Typography
            variant="h6"
            sx={{
              fontWeight: 800,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.5px',
            }}
          >
            CuriousPMO
          </Typography>
        </Box>
      </Toolbar>
      <Divider />
      <Box sx={{ overflow: 'auto', flex: 1 }}>
        <List sx={{ px: 1 }}>
          {navItems.map((item, index) => {
            if ('divider' in item) {
              return (
                <Box key={`divider-${index}`}>
                  {item.label ? (
                    <Typography
                      variant="caption"
                      fontWeight={600}
                      color="text.secondary"
                      sx={{ px: 2, pt: 2, pb: 1, display: 'block' }}
                    >
                      {item.label}
                    </Typography>
                  ) : (
                    <Divider sx={{ my: 1 }} />
                  )}
                </Box>
              );
            }

            const navItem = item as NavItem;
            const active = isActive(navItem.to);

            if (navItem.children) {
              const isOpen = openMenus[navItem.label] ?? false;
              const hasActiveChild = navItem.children.some((child) => isActive(child.to));

              return (
                <Box key={navItem.label}>
                  <ListItemButton
                    onClick={() => toggleMenu(navItem.label)}
                    sx={{
                      borderRadius: 2,
                      mb: 0.5,
                      bgcolor: hasActiveChild ? (theme) => alpha(theme.palette.primary.main, 0.1) : 'transparent',
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40, color: hasActiveChild ? 'primary.main' : 'text.secondary' }}>
                      {navItem.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={navItem.label}
                      primaryTypographyProps={{
                        fontWeight: hasActiveChild ? 600 : 400,
                        color: hasActiveChild ? 'primary.main' : 'text.primary',
                      }}
                    />
                    {isOpen ? <ExpandLess /> : <ExpandMore />}
                  </ListItemButton>
                  <Collapse in={isOpen} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                      {navItem.children.map((child) => (
                        <ListItemButton
                          key={child.to}
                          component={NavLink}
                          to={child.to}
                          sx={{
                            pl: 6,
                            borderRadius: 2,
                            mb: 0.5,
                            bgcolor: isActive(child.to) ? (theme) => alpha(theme.palette.primary.main, 0.1) : 'transparent',
                          }}
                        >
                          <ListItemText
                            primary={child.label}
                            primaryTypographyProps={{
                              fontSize: '0.875rem',
                              fontWeight: isActive(child.to) ? 600 : 400,
                              color: isActive(child.to) ? 'primary.main' : 'text.primary',
                            }}
                          />
                        </ListItemButton>
                      ))}
                    </List>
                  </Collapse>
                </Box>
              );
            }

            return (
              <ListItemButton
                key={navItem.to}
                component={NavLink}
                to={navItem.to}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  bgcolor: active ? (theme) => alpha(theme.palette.primary.main, 0.1) : 'transparent',
                  '&:hover': {
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: active ? 'primary.main' : 'text.secondary' }}>
                  {navItem.icon}
                </ListItemIcon>
                <ListItemText
                  primary={navItem.label}
                  primaryTypographyProps={{
                    fontWeight: active ? 600 : 400,
                    color: active ? 'primary.main' : 'text.primary',
                  }}
                />
              </ListItemButton>
            );
          })}
        </List>
      </Box>

      {/* Footer */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="caption" color="text.secondary" display="block" textAlign="center">
          ClickPM v1.0
        </Typography>
      </Box>
    </Drawer>
  );
};
