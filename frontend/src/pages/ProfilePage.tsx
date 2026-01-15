import { useState, useEffect } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  alpha,
} from '@mui/material';
import {
  Person,
  Email,
  Lock,
  Visibility,
  VisibilityOff,
  Edit,
  Save,
  Badge,
  CalendarMonth,
  Assignment,
  Folder,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useGetCurrentUserQuery, useUpdateUserMutation, useChangePasswordMutation } from '../api/userApi';
import { useGetMyTasksQuery } from '../api/taskApi';
import { useGetMyProjectsQuery } from '../api/projectApi';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export const ProfilePage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [tabValue, setTabValue] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const { data: user, isLoading } = useGetCurrentUserQuery();
  const { data: myTasks } = useGetMyTasksQuery();
  const { data: myProjects } = useGetMyProjectsQuery();

  const [updateUser, { isLoading: updating }] = useUpdateUserMutation();
  const [changePassword, { isLoading: changingPassword }] = useChangePasswordMutation();

  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [passwordError, setPasswordError] = useState('');

  // Initialize form when user data loads
  useEffect(() => {
    if (user) {
      setProfileForm({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
      });
    }
  }, [user]);

  const handleProfileSave = async () => {
    if (!user) return;
    try {
      await updateUser({ id: user.id, data: profileForm }).unwrap();
      enqueueSnackbar('Profile updated successfully', { variant: 'success' });
      setEditMode(false);
    } catch {
      enqueueSnackbar('Failed to update profile', { variant: 'error' });
    }
  };

  const handlePasswordChange = async () => {
    setPasswordError('');

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordForm.new_password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }

    try {
      await changePassword({
        old_password: passwordForm.old_password,
        new_password: passwordForm.new_password,
      }).unwrap();
      enqueueSnackbar('Password changed successfully', { variant: 'success' });
      setPasswordForm({ old_password: '', new_password: '', confirm_password: '' });
    } catch {
      enqueueSnackbar('Failed to change password. Check your current password.', { variant: 'error' });
    }
  };

  if (isLoading || !user) {
    return <Typography>Loading...</Typography>;
  }

  const pendingTasks = myTasks?.filter((t) => t.status !== 'done').length || 0;
  const completedTasks = myTasks?.filter((t) => t.status === 'done').length || 0;

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>
        My Profile
      </Typography>

      <Grid container spacing={3}>
        {/* Profile Card */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 2, textAlign: 'center' }}>
            <Avatar
              sx={{
                width: 120,
                height: 120,
                mx: 'auto',
                mb: 2,
                bgcolor: 'primary.main',
                fontSize: '3rem',
              }}
            >
              {user.username?.[0]?.toUpperCase() || '?'}
            </Avatar>
            <Typography variant="h6" fontWeight={600}>
              {user.first_name && user.last_name
                ? `${user.first_name} ${user.last_name}`
                : user.username}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              @{user.username}
            </Typography>
            {user.role && (
              <Typography
                variant="body2"
                sx={{
                  display: 'inline-block',
                  px: 2,
                  py: 0.5,
                  borderRadius: 10,
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                  color: 'primary.main',
                  fontWeight: 500,
                }}
              >
                {typeof user.role === 'string' ? user.role : user.role.name}
              </Typography>
            )}

            <Divider sx={{ my: 3 }} />

            {/* Stats */}
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" fontWeight={700} color="primary.main">
                    {myProjects?.length || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Projects
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" fontWeight={700} color="success.main">
                    {completedTasks}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Completed
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" fontWeight={700} color="warning.main">
                    {pendingTasks}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pending
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" fontWeight={700}>
                    {myTasks?.length || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Tasks
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Settings Tabs */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ borderRadius: 2 }}>
            <Tabs
              value={tabValue}
              onChange={(_, v) => setTabValue(v)}
              sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
            >
              <Tab icon={<Person />} iconPosition="start" label="Profile" />
              <Tab icon={<Lock />} iconPosition="start" label="Security" />
              <Tab icon={<Assignment />} iconPosition="start" label="Activity" />
            </Tabs>

            {/* Profile Tab */}
            <TabPanel value={tabValue} index={0}>
              <Box sx={{ px: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                  <Typography variant="h6" fontWeight={600}>
                    Personal Information
                  </Typography>
                  {!editMode ? (
                    <Button startIcon={<Edit />} onClick={() => setEditMode(true)}>
                      Edit
                    </Button>
                  ) : (
                    <Stack direction="row" spacing={1}>
                      <Button onClick={() => setEditMode(false)}>Cancel</Button>
                      <Button
                        variant="contained"
                        startIcon={<Save />}
                        onClick={handleProfileSave}
                        disabled={updating}
                      >
                        {updating ? 'Saving...' : 'Save'}
                      </Button>
                    </Stack>
                  )}
                </Stack>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="First Name"
                      value={editMode ? profileForm.first_name : user.first_name || ''}
                      onChange={(e) => setProfileForm((f) => ({ ...f, first_name: e.target.value }))}
                      fullWidth
                      disabled={!editMode}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Badge />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Last Name"
                      value={editMode ? profileForm.last_name : user.last_name || ''}
                      onChange={(e) => setProfileForm((f) => ({ ...f, last_name: e.target.value }))}
                      fullWidth
                      disabled={!editMode}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Email"
                      value={editMode ? profileForm.email : user.email}
                      onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))}
                      fullWidth
                      disabled={!editMode}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Email />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Username"
                      value={user.username}
                      fullWidth
                      disabled
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Person />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Member Since"
                      value={user.date_joined ? new Date(user.date_joined).toLocaleDateString() : 'Unknown'}
                      fullWidth
                      disabled
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <CalendarMonth />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                </Grid>
              </Box>
            </TabPanel>

            {/* Security Tab */}
            <TabPanel value={tabValue} index={1}>
              <Box sx={{ px: 3 }}>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
                  Change Password
                </Typography>

                {passwordError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {passwordError}
                  </Alert>
                )}

                <Stack spacing={2} sx={{ maxWidth: 400 }}>
                  <TextField
                    label="Current Password"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwordForm.old_password}
                    onChange={(e) => setPasswordForm((f) => ({ ...f, old_password: e.target.value }))}
                    fullWidth
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowCurrentPassword(!showCurrentPassword)}>
                            {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                  <TextField
                    label="New Password"
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm((f) => ({ ...f, new_password: e.target.value }))}
                    fullWidth
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowNewPassword(!showNewPassword)}>
                            {showNewPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                  <TextField
                    label="Confirm New Password"
                    type="password"
                    value={passwordForm.confirm_password}
                    onChange={(e) => setPasswordForm((f) => ({ ...f, confirm_password: e.target.value }))}
                    fullWidth
                  />
                  <Button
                    variant="contained"
                    onClick={handlePasswordChange}
                    disabled={changingPassword || !passwordForm.old_password || !passwordForm.new_password}
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    {changingPassword ? 'Changing...' : 'Change Password'}
                  </Button>
                </Stack>
              </Box>
            </TabPanel>

            {/* Activity Tab */}
            <TabPanel value={tabValue} index={2}>
              <Box sx={{ px: 3 }}>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
                  Recent Activity
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Your recent activity will be displayed here.
                </Typography>
              </Box>
            </TabPanel>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};
