import { useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  Typography,
  alpha,
} from '@mui/material';
import {
  Check,
  Circle,
  DoneAll,
  FilterList,
  Notifications,
  NotificationsActive,
  NotificationsNone,
  Refresh,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import {
  useListNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  Notification as NotificationItem,
} from '../api/notificationApi';

const notificationTypeIcons: Record<string, React.ReactNode> = {
  assignment: '📋',
  status_change: '🔄',
  comment: '💬',
  mention: '@',
  deadline: '⏰',
  member_added: '👥',
  general: '🔔',
};

const notificationTypeColors: Record<string, string> = {
  assignment: 'success.main',
  status_change: 'warning.main',
  comment: 'info.main',
  mention: 'primary.main',
  deadline: 'error.main',
  member_added: 'secondary.main',
  general: 'grey.500',
};

export const NotificationsPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [tabValue, setTabValue] = useState(0);
  const [typeFilter, setTypeFilter] = useState('');

  const { data: notifications, isLoading, refetch } = useListNotificationsQuery();
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead, { isLoading: markingAll }] = useMarkAllNotificationsReadMutation();

  const handleMarkRead = async (id: number) => {
    try {
      await markRead(id).unwrap();
    } catch {
      enqueueSnackbar('Failed to mark notification as read', { variant: 'error' });
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead().unwrap();
      enqueueSnackbar('All notifications marked as read', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to mark all as read', { variant: 'error' });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  // Filter notifications
  const unreadNotifications = notifications?.filter((n) => !n.read) || [];
  const readNotifications = notifications?.filter((n) => n.read) || [];

  let displayNotifications: NotificationItem[] = [];
  if (tabValue === 0) {
    displayNotifications = notifications || [];
  } else if (tabValue === 1) {
    displayNotifications = unreadNotifications;
  } else {
    displayNotifications = readNotifications;
  }

  // Apply type filter
  if (typeFilter) {
    displayNotifications = displayNotifications.filter((n) => n.notification_type === typeFilter);
  }

  const uniqueTypes = [...new Set(notifications?.map((n) => n.notification_type) || [])];

  const NotificationCard = ({ notification }: { notification: NotificationItem }) => (
    <Card
      sx={{
        transition: 'all 0.2s',
        bgcolor: notification.read ? 'background.paper' : (theme) => alpha(theme.palette.primary.main, 0.04),
        borderLeft: 3,
        borderColor: notification.read ? 'divider' : 'primary.main',
        '&:hover': {
          boxShadow: 2,
        },
      }}
    >
      <CardContent>
        <Stack direction="row" spacing={2} alignItems="flex-start">
          <Avatar
            sx={{
              width: 40,
              height: 40,
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
              color: notificationTypeColors[notification.notification_type] || 'primary.main',
              fontSize: '1.2rem',
            }}
          >
            {notificationTypeIcons[notification.notification_type] || <Notifications fontSize="small" />}
          </Avatar>

          <Box sx={{ flex: 1 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Typography variant="subtitle2" fontWeight={notification.read ? 400 : 600}>
                  {notification.verb}
                </Typography>
                {notification.actor && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    by {notification.actor.username}
                  </Typography>
                )}
              </Box>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Typography variant="caption" color="text.secondary">
                  {formatDate(notification.timestamp)}
                </Typography>
                {!notification.read && (
                  <Circle sx={{ fontSize: 8, color: 'primary.main' }} />
                )}
              </Stack>
            </Stack>

            <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} alignItems="center">
              <Chip
                label={notification.notification_type.replace(/_/g, ' ')}
                size="small"
                variant="outlined"
                sx={{ textTransform: 'capitalize' }}
              />
              {!notification.read && (
                <Button
                  size="small"
                  startIcon={<Check />}
                  onClick={() => handleMarkRead(notification.id)}
                  sx={{ ml: 'auto' }}
                >
                  Mark as read
                </Button>
              )}
            </Stack>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Typography variant="h5" fontWeight={700}>
            Notifications
          </Typography>
          {unreadNotifications.length > 0 && (
            <Chip
              label={`${unreadNotifications.length} unread`}
              color="primary"
              size="small"
            />
          )}
        </Stack>
        <Stack direction="row" spacing={1}>
          <IconButton onClick={() => refetch()} title="Refresh">
            <Refresh />
          </IconButton>
          {unreadNotifications.length > 0 && (
            <Button
              variant="outlined"
              startIcon={<DoneAll />}
              onClick={handleMarkAllRead}
              disabled={markingAll}
            >
              Mark all read
            </Button>
          )}
        </Stack>
      </Stack>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab
            icon={<Notifications />}
            iconPosition="start"
            label={`All (${notifications?.length || 0})`}
          />
          <Tab
            icon={<NotificationsActive />}
            iconPosition="start"
            label={`Unread (${unreadNotifications.length})`}
          />
          <Tab
            icon={<NotificationsNone />}
            iconPosition="start"
            label={`Read (${readNotifications.length})`}
          />
        </Tabs>
      </Paper>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <FilterList color="action" />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Notification Type</InputLabel>
            <Select
              value={typeFilter}
              label="Notification Type"
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <MenuItem value="">All Types</MenuItem>
              {uniqueTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {type.replace(/_/g, ' ')}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {typeFilter && (
            <Button size="small" onClick={() => setTypeFilter('')}>
              Clear Filter
            </Button>
          )}
        </Stack>
      </Paper>

      {/* Notifications List */}
      {isLoading ? (
        <Stack spacing={2}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} variant="rectangular" height={100} sx={{ borderRadius: 2 }} />
          ))}
        </Stack>
      ) : displayNotifications.length > 0 ? (
        <Stack spacing={2}>
          {displayNotifications.map((notification) => (
            <NotificationCard key={notification.id} notification={notification} />
          ))}
        </Stack>
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <NotificationsNone sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {tabValue === 1 ? 'No unread notifications' : 'No notifications'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {tabValue === 1
              ? "You're all caught up!"
              : 'Notifications about tasks, projects, and mentions will appear here.'}
          </Typography>
        </Paper>
      )}
    </Box>
  );
};
