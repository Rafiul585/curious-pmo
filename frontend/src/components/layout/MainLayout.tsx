import { useState } from 'react';
import {
  AppBar,
  Avatar,
  Box,
  Divider,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Brightness4 as Brightness4Icon,
  Brightness7 as Brightness7Icon,
  Person,
  Settings,
  Logout,
} from '@mui/icons-material';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { toggleTheme } from '../../store/slices/themeSlice';
import { logout } from '../../store/slices/authSlice';
import { NavSidebar } from './NavSidebar';
import { GlobalSearch } from '../search/GlobalSearch';
import { NotificationBell } from '../notifications/NotificationBell';

export const MainLayout = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const mode = useAppSelector((s) => s.theme?.mode || 'light');
  const user = useAppSelector((s) => s.auth.user);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <NavSidebar />
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <AppBar
          position="sticky"
          color="default"
          elevation={0}
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Toolbar sx={{ gap: 2 }}>
            {/* Mobile menu button - only shown on mobile */}
            <IconButton edge="start" sx={{ display: { md: 'none' } }}>
              <MenuIcon />
            </IconButton>

            {/* Search bar - takes available space */}
            <Box sx={{ flexGrow: 1, maxWidth: 600 }}>
              <GlobalSearch />
            </Box>
            <Stack direction="row" spacing={1} alignItems="center">
              {/* Theme Toggle */}
              <Tooltip title={mode === 'dark' ? 'Light mode' : 'Dark mode'}>
                <IconButton onClick={() => dispatch(toggleTheme())}>
                  {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
                </IconButton>
              </Tooltip>

              {/* Notifications */}
              <NotificationBell />

              {/* User Menu */}
              <Tooltip title="Account">
                <IconButton onClick={(e) => setUserMenuAnchor(e.currentTarget)} sx={{ ml: 1 }}>
                  <Avatar
                    sx={{
                      width: 36,
                      height: 36,
                      bgcolor: 'primary.main',
                      fontSize: '1rem',
                    }}
                  >
                    {user?.username?.[0]?.toUpperCase() || 'U'}
                  </Avatar>
                </IconButton>
              </Tooltip>
            </Stack>
          </Toolbar>
        </AppBar>

        {/* User Menu Dropdown */}
        <Menu
          anchorEl={userMenuAnchor}
          open={Boolean(userMenuAnchor)}
          onClose={() => setUserMenuAnchor(null)}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          PaperProps={{
            sx: { width: 220, mt: 1 },
          }}
        >
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="subtitle2" fontWeight={600}>
              {user?.username || 'User'}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {user?.email || ''}
            </Typography>
          </Box>
          <Divider />
          <MenuItem
            onClick={() => {
              navigate('/profile');
              setUserMenuAnchor(null);
            }}
          >
            <ListItemIcon>
              <Person fontSize="small" />
            </ListItemIcon>
            My Profile
          </MenuItem>
          <MenuItem
            onClick={() => {
              navigate('/settings');
              setUserMenuAnchor(null);
            }}
          >
            <ListItemIcon>
              <Settings fontSize="small" />
            </ListItemIcon>
            Settings
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
            <ListItemIcon>
              <Logout fontSize="small" color="error" />
            </ListItemIcon>
            Logout
          </MenuItem>
        </Menu>

        {/* Main Content */}
        <Box component="main" sx={{ flex: 1, p: 3, bgcolor: 'background.default' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};
