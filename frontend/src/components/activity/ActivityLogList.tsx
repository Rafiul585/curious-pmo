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
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Typography,
  alpha,
} from '@mui/material';
import {
  Add,
  Check,
  Delete,
  Edit,
  FilterList,
  History,
  Person,
  Refresh,
  Visibility,
} from '@mui/icons-material';
import {
  ActivityLog,
  useListActivityLogsQuery,
  useGetRecentActivityQuery,
  useGetActivityByProjectQuery,
  useGetActivityByWorkspaceQuery,
} from '../../api/activityApi';

interface ActivityLogListProps {
  projectId?: number;
  workspaceId?: number;
  limit?: number;
  showFilters?: boolean;
  compact?: boolean;
}

const actionIcons: Record<string, React.ReactNode> = {
  create: <Add fontSize="small" />,
  update: <Edit fontSize="small" />,
  delete: <Delete fontSize="small" />,
  view: <Visibility fontSize="small" />,
  complete: <Check fontSize="small" />,
};

const actionColors: Record<string, 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info'> = {
  create: 'success',
  update: 'primary',
  delete: 'error',
  view: 'info',
  complete: 'success',
  assign: 'secondary',
  unassign: 'warning',
  comment: 'info',
};

export const ActivityLogList = ({
  projectId,
  workspaceId,
  limit = 20,
  showFilters = false,
  compact = false,
}: ActivityLogListProps) => {
  const [actionFilter, setActionFilter] = useState('');

  // Use appropriate query based on context
  const projectQuery = useGetActivityByProjectQuery(
    { project_id: projectId!, limit },
    { skip: !projectId }
  );
  const workspaceQuery = useGetActivityByWorkspaceQuery(
    { workspace_id: workspaceId!, limit },
    { skip: !workspaceId }
  );
  const recentQuery = useGetRecentActivityQuery(
    { limit },
    { skip: !!projectId || !!workspaceId }
  );

  // Select the right query results
  const query = projectId ? projectQuery : workspaceId ? workspaceQuery : recentQuery;
  const { data: activities, isLoading, refetch } = query;

  // Filter activities - ensure we have valid data
  const safeActivities = activities?.filter((a) => a && a.id) || [];
  const filteredActivities = actionFilter
    ? safeActivities.filter((a) => a.action === actionFilter)
    : safeActivities;

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
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

  const getActionDescription = (activity: ActivityLog) => {
    const action = activity.action?.toLowerCase() || 'updated';
    const entity = activity.content_type?.replace(/_/g, ' ') || 'item';
    const object = activity.object_repr || `#${activity.object_id}`;

    return `${action}d ${entity} "${object}"`;
  };

  const getUserInitial = (activity: ActivityLog) => {
    const name = activity?.user_name;
    if (name && typeof name === 'string' && name.length > 0) {
      return name[0].toUpperCase();
    }
    return '?';
  };

  const getUserName = (activity: ActivityLog) => {
    return activity?.user_name || 'Unknown User';
  };

  const uniqueActions = [...new Set(safeActivities.map((a) => a.action).filter(Boolean))];

  if (isLoading) {
    return (
      <Stack spacing={2}>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} variant="rectangular" height={60} sx={{ borderRadius: 1 }} />
        ))}
      </Stack>
    );
  }

  if (compact) {
    return (
      <Box>
        {filteredActivities && filteredActivities.length > 0 ? (
          <Stack spacing={1}>
            {filteredActivities.slice(0, limit).map((activity, idx) => (
              <Stack
                key={activity?.id || idx}
                direction="row"
                spacing={1.5}
                alignItems="center"
                sx={{
                  py: 1,
                  px: 1.5,
                  borderRadius: 1,
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <Avatar
                  sx={{
                    width: 28,
                    height: 28,
                    fontSize: '0.75rem',
                    bgcolor: (theme) =>
                      alpha(theme.palette[actionColors[activity?.action] || 'primary'].main, 0.1),
                    color: `${actionColors[activity?.action] || 'primary'}.main`,
                  }}
                >
                  {actionIcons[activity?.action] || <History fontSize="small" />}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" noWrap>
                    <strong>{getUserName(activity)}</strong> {getActionDescription(activity)}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                  {activity?.timestamp ? formatTimestamp(activity.timestamp) : ''}
                </Typography>
              </Stack>
            ))}
          </Stack>
        ) : (
          <Typography color="text.secondary" variant="body2" sx={{ py: 2, textAlign: 'center' }}>
            No activity yet
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <Box>
      {showFilters && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <FilterList color="action" />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Action Type</InputLabel>
              <Select
                value={actionFilter}
                label="Action Type"
                onChange={(e) => setActionFilter(e.target.value)}
              >
                <MenuItem value="">All Actions</MenuItem>
                {uniqueActions.map((action) => (
                  <MenuItem key={action} value={action}>
                    {action}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {actionFilter && (
              <Button size="small" onClick={() => setActionFilter('')}>
                Clear
              </Button>
            )}
            <Box sx={{ flex: 1 }} />
            <IconButton size="small" onClick={() => refetch()}>
              <Refresh />
            </IconButton>
          </Stack>
        </Paper>
      )}

      {filteredActivities && filteredActivities.length > 0 ? (
        <Stack spacing={2}>
          {filteredActivities.map((activity, index) => (
            <Card key={activity?.id || index} variant="outlined">
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Stack direction="row" spacing={2} alignItems="flex-start">
                  {/* Timeline dot */}
                  <Box sx={{ position: 'relative', pt: 0.5 }}>
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: (theme) =>
                          alpha(theme.palette[actionColors[activity?.action] || 'primary'].main, 0.1),
                        color: `${actionColors[activity?.action] || 'primary'}.main`,
                        border: 2,
                        borderColor: `${actionColors[activity?.action] || 'primary'}.main`,
                      }}
                    >
                      {actionIcons[activity?.action] || <History fontSize="small" />}
                    </Box>
                    {/* Connector line */}
                    {index < filteredActivities.length - 1 && (
                      <Box
                        sx={{
                          position: 'absolute',
                          left: '50%',
                          top: 40,
                          bottom: -16,
                          width: 2,
                          bgcolor: 'divider',
                          transform: 'translateX(-50%)',
                        }}
                      />
                    )}
                  </Box>

                  {/* Content */}
                  <Box sx={{ flex: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 0.5 }}>
                      <Avatar
                        sx={{
                          width: 24,
                          height: 24,
                          fontSize: '0.7rem',
                          bgcolor: 'primary.main',
                        }}
                      >
                        {getUserInitial(activity)}
                      </Avatar>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {getUserName(activity)}
                      </Typography>
                      <Chip
                        label={activity?.action || 'action'}
                        size="small"
                        color={actionColors[activity?.action] || 'default'}
                        sx={{ height: 20 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {activity?.timestamp ? formatTimestamp(activity.timestamp) : ''}
                      </Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {getActionDescription(activity)}
                    </Typography>
                    {activity?.reason && (
                      <Typography
                        variant="body2"
                        sx={{
                          mt: 1,
                          p: 1,
                          bgcolor: 'action.hover',
                          borderRadius: 1,
                          fontStyle: 'italic',
                        }}
                      >
                        "{activity.reason}"
                      </Typography>
                    )}
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <History sx={{ fontSize: 48, color: 'grey.300', mb: 1 }} />
          <Typography color="text.secondary">No activity logs found</Typography>
        </Paper>
      )}
    </Box>
  );
};
