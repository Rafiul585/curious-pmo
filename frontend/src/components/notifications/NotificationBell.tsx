import { useState } from 'react';
import {
  Avatar,
  Badge,
  Box,
  Button,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Popover,
  Stack,
  Tooltip,
  Typography,
  alpha,
  CircularProgress,
} from '@mui/material';
import {
  Notifications,
  NotificationsNone,
  MarkEmailRead,
  Comment,
  Assignment,
  PersonAdd,
  Schedule,
  Info,
  CheckCircle,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import {
  useGetUnreadNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} from '../../api/notificationApi';

const notificationIcons: Record<string, React.ReactNode> = {
  mention: <Comment fontSize="small" />,
  assignment: <Assignment fontSize="small" />,
  comment: <Comment fontSize="small" />,
  status_change: <CheckCircle fontSize="small" />,
  deadline: <Schedule fontSize="small" />,
  member_added: <PersonAdd fontSize="small" />,
  general: <Info fontSize="small" />,
};

const notificationColors: Record<string, string> = {
  mention: 'primary.main',
  assignment: 'success.main',
  comment: 'info.main',
  status_change: 'warning.main',
  deadline: 'error.main',
  member_added: 'secondary.main',
  general: 'grey.500',
};

export const NotificationBell = () => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const { data: unreadCount, isLoading: loadingCount } = useGetUnreadCountQuery(undefined, {
    pollingInterval: 30000, // Poll every 30 seconds
  });
  const { data: notifications, isLoading: loadingNotifications } = useGetUnreadNotificationsQuery(
    undefined,
    { skip: !anchorEl }
  );
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead, { isLoading: markingAll }] = useMarkAllNotificationsReadMutation();

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = async (notification: {
    id: number;
    target_url?: string;
    target_content_type?: string;
    target_object_id?: number;
  }) => {
    await markRead(notification.id).unwrap();
    handleClose();

    // Navigate based on notification type
    if (notification.target_url) {
      navigate(notification.target_url);
    } else if (notification.target_content_type && notification.target_object_id) {
      const type = notification.target_content_type.toLowerCase();
      if (type === 'task') {
        navigate(`/tasks?highlight=${notification.target_object_id}`);
      } else if (type === 'project') {
        navigate(`/projects/${notification.target_object_id}`);
      }
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead().unwrap();
      handleClose(); // Close popover after marking all read
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const count = unreadCount?.unread_count || 0;
  const open = Boolean(anchorEl);

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton
          onClick={handleOpen}
          sx={{
            color: open ? 'primary.main' : 'text.secondary',
          }}
        >
          <Badge
            badgeContent={count}
            color="error"
            max={99}
            sx={{
              '& .MuiBadge-badge': {
                fontSize: '0.7rem',
                height: 18,
                minWidth: 18,
              },
            }}
          >
            {count > 0 ? <Notifications /> : <NotificationsNone />}
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: {
            width: 360,
            maxHeight: 480,
            overflow: 'hidden',
            borderRadius: 2,
          },
        }}
      >
        {/* Header */}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ px: 2, py: 1.5, bgcolor: 'grey.50' }}
        >
          <Typography variant="subtitle1" fontWeight={600}>
            Notifications
          </Typography>
          <Button
            size="small"
            startIcon={markingAll ? <CircularProgress size={14} /> : <MarkEmailRead />}
            onClick={handleMarkAllRead}
            disabled={markingAll || count === 0}
          >
            Mark all read
          </Button>
        </Stack>

        <Divider />

        {/* Notification List */}
        {loadingNotifications ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <CircularProgress size={24} />
          </Box>
        ) : notifications && notifications.length > 0 ? (
          <List sx={{ p: 0, maxHeight: 360, overflow: 'auto' }}>
            {notifications.map((notification) => (
              <ListItem key={notification.id} disablePadding divider>
                <ListItemButton
                  onClick={() => handleNotificationClick(notification)}
                  sx={{
                    py: 1.5,
                    px: 2,
                    bgcolor: !notification.read
                      ? (theme) => alpha(theme.palette.primary.main, 0.05)
                      : 'transparent',
                  }}
                >
                  <ListItemAvatar>
                    <Avatar
                      sx={{
                        width: 36,
                        height: 36,
                        bgcolor: (theme) =>
                          alpha(
                            theme.palette[
                              notificationColors[notification.notification_type]?.split('.')[0] as 'primary'
                            ]?.main || theme.palette.grey[500],
                            0.15
                          ),
                        color: notificationColors[notification.notification_type] || 'grey.500',
                      }}
                    >
                      {notificationIcons[notification.notification_type] || <Info fontSize="small" />}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography variant="body2" sx={{ fontWeight: !notification.read ? 600 : 400 }}>
                        {notification.actor?.username && (
                          <Typography component="span" fontWeight={600}>
                            {notification.actor.username}{' '}
                          </Typography>
                        )}
                        {notification.verb}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        {formatTimeAgo(notification.timestamp)}
                      </Typography>
                    }
                  />
                  {!notification.read && (
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: 'primary.main',
                        ml: 1,
                      }}
                    />
                  )}
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        ) : (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <NotificationsNone sx={{ fontSize: 48, color: 'grey.300', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              No new notifications
            </Typography>
          </Box>
        )}

        {/* Footer */}
        <Divider />
        <Box sx={{ p: 1.5, textAlign: 'center' }}>
          <Button
            size="small"
            onClick={() => {
              handleClose();
              navigate('/notifications');
            }}
          >
            View all notifications
          </Button>
        </Box>
      </Popover>
    </>
  );
};

// Helper function to format time ago
function formatTimeAgo(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}
