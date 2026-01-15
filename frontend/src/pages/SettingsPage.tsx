import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Typography,
  alpha,
} from '@mui/material';
import {
  DarkMode,
  LightMode,
  Notifications,
  Email,
  Language,
  Security,
  Storage,
  Info,
  Palette,
  NotificationsActive,
  NotificationsOff,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { setThemeMode } from '../store/slices/themeSlice';

interface SettingCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}

const SettingCard = ({ icon, title, description, children }: SettingCardProps) => (
  <Card variant="outlined">
    <CardContent>
      <Stack direction="row" spacing={2} alignItems="flex-start">
        <Box
          sx={{
            p: 1,
            borderRadius: 2,
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
            color: 'primary.main',
          }}
        >
          {icon}
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {description}
          </Typography>
          {children}
        </Box>
      </Stack>
    </CardContent>
  </Card>
);

export const SettingsPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const dispatch = useAppDispatch();
  const themeMode = useAppSelector((state) => state.theme.mode);

  // Local state for settings (would normally persist to backend/localStorage)
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [taskReminders, setTaskReminders] = useState(true);
  const [projectUpdates, setProjectUpdates] = useState(true);
  const [language, setLanguage] = useState('en');

  const handleThemeChange = (mode: 'light' | 'dark' | 'system') => {
    dispatch(setThemeMode(mode));
    enqueueSnackbar(`Theme changed to ${mode} mode`, { variant: 'success' });
  };

  const handleSaveNotifications = () => {
    // In a real app, this would save to backend
    enqueueSnackbar('Notification preferences saved', { variant: 'success' });
  };

  const handleExportData = () => {
    enqueueSnackbar('Data export started. You will receive an email when ready.', { variant: 'info' });
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>
        Settings
      </Typography>

      <Grid container spacing={3}>
        {/* Appearance Settings */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
              <Palette color="primary" />
              <Typography variant="h6" fontWeight={600}>
                Appearance
              </Typography>
            </Stack>

            <Stack spacing={2}>
              <SettingCard
                icon={themeMode === 'dark' ? <DarkMode /> : <LightMode />}
                title="Theme"
                description="Choose your preferred color theme for the application"
              >
                <Stack direction="row" spacing={1}>
                  <Button
                    variant={themeMode === 'light' ? 'contained' : 'outlined'}
                    size="small"
                    startIcon={<LightMode />}
                    onClick={() => handleThemeChange('light')}
                  >
                    Light
                  </Button>
                  <Button
                    variant={themeMode === 'dark' ? 'contained' : 'outlined'}
                    size="small"
                    startIcon={<DarkMode />}
                    onClick={() => handleThemeChange('dark')}
                  >
                    Dark
                  </Button>
                  <Button
                    variant={themeMode === 'system' ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => handleThemeChange('system')}
                  >
                    System
                  </Button>
                </Stack>
              </SettingCard>

              <SettingCard
                icon={<Language />}
                title="Language"
                description="Select your preferred language"
              >
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel>Language</InputLabel>
                  <Select
                    value={language}
                    label="Language"
                    onChange={(e) => setLanguage(e.target.value)}
                  >
                    <MenuItem value="en">English</MenuItem>
                    <MenuItem value="bn">Bengali</MenuItem>
                    <MenuItem value="es">Spanish</MenuItem>
                    <MenuItem value="fr">French</MenuItem>
                    <MenuItem value="de">German</MenuItem>
                  </Select>
                </FormControl>
              </SettingCard>
            </Stack>
          </Paper>
        </Grid>

        {/* Notification Settings */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
              <Notifications color="primary" />
              <Typography variant="h6" fontWeight={600}>
                Notifications
              </Typography>
            </Stack>

            <SettingCard
              icon={<Email />}
              title="Email Notifications"
              description="Receive important updates via email"
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={emailNotifications}
                    onChange={(e) => setEmailNotifications(e.target.checked)}
                  />
                }
                label={emailNotifications ? 'Enabled' : 'Disabled'}
              />
            </SettingCard>

            <SettingCard
              icon={pushNotifications ? <NotificationsActive /> : <NotificationsOff />}
              title="Push Notifications"
              description="Get real-time notifications in the browser"
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={pushNotifications}
                    onChange={(e) => setPushNotifications(e.target.checked)}
                  />
                }
                label={pushNotifications ? 'Enabled' : 'Disabled'}
              />
            </SettingCard>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
              Notification Types
            </Typography>

            <Stack spacing={1}>
              <FormControlLabel
                control={
                  <Switch
                    checked={taskReminders}
                    onChange={(e) => setTaskReminders(e.target.checked)}
                    size="small"
                  />
                }
                label="Task due date reminders"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={projectUpdates}
                    onChange={(e) => setProjectUpdates(e.target.checked)}
                    size="small"
                  />
                }
                label="Project updates and mentions"
              />
            </Stack>

            <Button
              variant="contained"
              size="small"
              onClick={handleSaveNotifications}
              sx={{ mt: 2 }}
            >
              Save Preferences
            </Button>
          </Paper>
        </Grid>

        {/* Data & Privacy */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
              <Storage color="primary" />
              <Typography variant="h6" fontWeight={600}>
                Data & Privacy
              </Typography>
            </Stack>

            <Stack spacing={2}>
              <SettingCard
                icon={<Storage />}
                title="Export Your Data"
                description="Download a copy of all your data including tasks, projects, and activity"
              >
                <Button variant="outlined" size="small" onClick={handleExportData}>
                  Request Data Export
                </Button>
              </SettingCard>

              <Alert severity="info">
                Your data is securely stored and never shared with third parties without your consent.
              </Alert>
            </Stack>
          </Paper>
        </Grid>

        {/* About */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
              <Info color="primary" />
              <Typography variant="h6" fontWeight={600}>
                About
              </Typography>
            </Stack>

            <Stack spacing={2}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Application
                </Typography>
                <Typography variant="body1" fontWeight={500}>
                  ClickPM - Project Management Tool
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Version
                </Typography>
                <Typography variant="body1" fontWeight={500}>
                  1.0.0
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Developed by
                </Typography>
                <Typography variant="body1" fontWeight={500}>
                  ADN DigiNet
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};
