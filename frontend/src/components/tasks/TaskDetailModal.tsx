import { useState, useEffect, useRef } from 'react';
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  Link,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  alpha,
} from '@mui/material';
import {
  Close,
  Edit,
  Delete,
  MoreVert,
  PersonAdd,
  Comment as CommentIcon,
  AttachFile,
  History,
  Flag,
  CalendarMonth,
  Assignment,
  CloudUpload,
  InsertDriveFile,
  Create,
  SwapHoriz,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import {
  useGetTaskQuery,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useAssignTaskToMeMutation,
  useGetTaskActivityLogsQuery,
} from '../../api/taskApi';
import { useGetTaskCommentsQuery, useCreateCommentMutation } from '../../api/commentApi';
import { useGetProjectQuery } from '../../api/projectApi';
import { useGetTaskAttachmentsQuery, useUploadAttachmentMutation, useDeleteAttachmentMutation } from '../../api/attachmentApi';

interface TaskDetailModalProps {
  taskId: number | null;
  open: boolean;
  onClose: () => void;
  onDeleted?: () => void;
}

const priorityColors: Record<string, 'default' | 'info' | 'warning' | 'error'> = {
  'Low': 'default',
  'Medium': 'info',
  'High': 'warning',
  'Critical': 'error',
};

const statusColors: Record<string, 'default' | 'primary' | 'warning' | 'success' | 'error'> = {
  'To-do': 'default',
  'In Progress': 'primary',
  'Review': 'warning',
  'Done': 'success',
};

export const TaskDetailModal = ({ taskId, open, onClose, onDeleted }: TaskDetailModalProps) => {
  const { enqueueSnackbar } = useSnackbar();
  const [tabValue, setTabValue] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [newComment, setNewComment] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    status: '',
    priority: '',
    due_date: '',
    assignee: '' as string | number,
    reporter: '' as string | number,
  });

  const { data: task, isLoading } = useGetTaskQuery(taskId!, { skip: !taskId });

  // Get project ID from task's sprint details to fetch project members
  const projectId = task?.sprint_details?.milestone?.project?.id;
  const { data: project } = useGetProjectQuery(projectId!, { skip: !projectId });
  const projectMembers = project?.members || [];
  const { data: comments } = useGetTaskCommentsQuery(taskId!, { skip: !taskId });
  const { data: activityData, isLoading: loadingActivity } = useGetTaskActivityLogsQuery(
    { taskId: taskId! },
    { skip: !taskId }
  );
  const { data: attachments, isLoading: loadingAttachments } = useGetTaskAttachmentsQuery(taskId!, { skip: !taskId });
  const [updateTask, { isLoading: updating }] = useUpdateTaskMutation();
  const [deleteTask, { isLoading: deleting }] = useDeleteTaskMutation();
  const [assignToMe] = useAssignTaskToMeMutation();
  const [createComment, { isLoading: commenting }] = useCreateCommentMutation();
  const [uploadAttachment, { isLoading: uploading }] = useUploadAttachmentMutation();
  const [deleteAttachment] = useDeleteAttachmentMutation();

  useEffect(() => {
    if (task) {
      setEditForm({
        title: task.title,
        description: task.description || '',
        status: task.status,
        priority: task.priority,
        due_date: task.due_date || '',
        assignee: task.assignee || '',
        reporter: task.reporter || '',
      });
    }
  }, [task]);

  const handleSave = async () => {
    if (!taskId) return;
    try {
      await updateTask({
        id: taskId,
        data: {
          title: editForm.title,
          description: editForm.description,
          status: editForm.status,
          priority: editForm.priority,
          due_date: editForm.due_date || undefined,
          assignee: editForm.assignee ? Number(editForm.assignee) : undefined,
          reporter: editForm.reporter ? Number(editForm.reporter) : undefined,
        },
      }).unwrap();
      enqueueSnackbar('Task updated successfully', { variant: 'success' });
      setEditMode(false);
    } catch {
      enqueueSnackbar('Failed to update task', { variant: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!taskId) return;
    try {
      await deleteTask(taskId).unwrap();
      enqueueSnackbar('Task deleted successfully', { variant: 'success' });
      onDeleted?.();
      onClose();
    } catch {
      enqueueSnackbar('Failed to delete task', { variant: 'error' });
    }
  };

  const handleAssignToMe = async () => {
    if (!taskId) return;
    try {
      await assignToMe(taskId).unwrap();
      enqueueSnackbar('Task assigned to you', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to assign task', { variant: 'error' });
    }
    setMenuAnchor(null);
  };

  const handleAddComment = async () => {
    if (!taskId || !newComment.trim()) return;
    try {
      await createComment({ content: newComment, task: taskId }).unwrap();
      setNewComment('');
      enqueueSnackbar('Comment added', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to add comment', { variant: 'error' });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !taskId) return;
    try {
      await uploadAttachment({ file, task: taskId }).unwrap();
      enqueueSnackbar('File uploaded successfully', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to upload file', { variant: 'error' });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteAttachment = async (attachmentId: number) => {
    if (!taskId) return;
    try {
      await deleteAttachment({ id: attachmentId, taskId }).unwrap();
      enqueueSnackbar('Attachment deleted', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to delete attachment', { variant: 'error' });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'CREATED': return <Create fontSize="small" color="success" />;
      case 'UPDATED': return <Edit fontSize="small" color="primary" />;
      case 'STATUS_CHANGE': return <SwapHoriz fontSize="small" color="info" />;
      case 'TASK_STATUS_CHANGED': return <SwapHoriz fontSize="small" color="info" />;
      case 'DELETED': return <Delete fontSize="small" color="error" />;
      default: return <History fontSize="small" color="action" />;
    }
  };

  const formatActivityValue = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (typeof value === 'object') {
      // For task/entity objects, show a summary
      const obj = value as Record<string, unknown>;
      if (obj.title) return String(obj.title);
      if (obj.name) return String(obj.name);
      if (obj.status) return String(obj.status);
      // Show key fields for complex objects
      const keys = Object.keys(obj).slice(0, 3);
      return keys.map(k => `${k}: ${obj[k]}`).join(', ');
    }
    return String(value);
  };

  if (!taskId) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={2}>
            <Assignment color="primary" />
            {editMode ? (
              <TextField
                value={editForm.title}
                onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                variant="standard"
                fullWidth
                sx={{ minWidth: 300 }}
              />
            ) : (
              <Typography variant="h6" fontWeight={600}>
                {task?.title || 'Loading...'}
              </Typography>
            )}
          </Stack>
          <Stack direction="row" spacing={1}>
            {!editMode && (
              <>
                <IconButton onClick={() => setEditMode(true)} size="small">
                  <Edit />
                </IconButton>
                <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)} size="small">
                  <MoreVert />
                </IconButton>
              </>
            )}
            <IconButton onClick={onClose} size="small">
              <Close />
            </IconButton>
          </Stack>
        </Stack>
      </DialogTitle>

      {isLoading ? (
        <LinearProgress />
      ) : (
        <>
          <DialogContent dividers>
            {task && (
              <Grid container spacing={3}>
                {/* Main Content */}
                <Grid item xs={12} md={8}>
                  {/* Status & Priority Chips */}
                  <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                    {editMode ? (
                      <>
                        <TextField
                          label="Status"
                          value={editForm.status}
                          onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                          select
                          size="small"
                          sx={{ minWidth: 120 }}
                        >
                          <MenuItem value="To-do">To Do</MenuItem>
                          <MenuItem value="In Progress">In Progress</MenuItem>
                          <MenuItem value="Review">Review</MenuItem>
                          <MenuItem value="Done">Done</MenuItem>
                        </TextField>
                        <TextField
                          label="Priority"
                          value={editForm.priority}
                          onChange={(e) => setEditForm((f) => ({ ...f, priority: e.target.value }))}
                          select
                          size="small"
                          sx={{ minWidth: 120 }}
                        >
                          <MenuItem value="Low">Low</MenuItem>
                          <MenuItem value="Medium">Medium</MenuItem>
                          <MenuItem value="High">High</MenuItem>
                          <MenuItem value="Critical">Critical</MenuItem>
                        </TextField>
                      </>
                    ) : (
                      <>
                        <Chip
                          label={task.status}
                          color={statusColors[task.status] || 'default'}
                          size="small"
                        />
                        <Chip
                          icon={<Flag fontSize="small" />}
                          label={task.priority}
                          color={priorityColors[task.priority] || 'default'}
                          size="small"
                          variant="outlined"
                        />
                      </>
                    )}
                  </Stack>

                  {/* Description */}
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Description
                  </Typography>
                  {editMode ? (
                    <TextField
                      value={editForm.description}
                      onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                      multiline
                      rows={4}
                      fullWidth
                      placeholder="Add a description..."
                    />
                  ) : (
                    <Typography variant="body2" sx={{ mb: 3 }}>
                      {task.description || 'No description provided.'}
                    </Typography>
                  )}

                  <Divider sx={{ my: 2 }} />

                  {/* Tabs for Comments & Activity */}
                  <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 2 }}>
                    <Tab icon={<CommentIcon fontSize="small" />} iconPosition="start" label="Comments" />
                    <Tab icon={<History fontSize="small" />} iconPosition="start" label="Activity" />
                    <Tab icon={<AttachFile fontSize="small" />} iconPosition="start" label="Attachments" />
                  </Tabs>

                  {/* Comments Tab */}
                  {tabValue === 0 && (
                    <Box>
                      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                        <TextField
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Add a comment..."
                          fullWidth
                          multiline
                          rows={2}
                          size="small"
                        />
                        <Button
                          variant="contained"
                          onClick={handleAddComment}
                          disabled={!newComment.trim() || commenting}
                          sx={{ alignSelf: 'flex-end' }}
                        >
                          Post
                        </Button>
                      </Stack>
                      {comments && comments.length > 0 ? (
                        <Stack spacing={2}>
                          {comments.map((comment) => (
                            <Box
                              key={comment.id}
                              sx={{
                                p: 2,
                                borderRadius: 2,
                                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05),
                              }}
                            >
                              <Stack direction="row" spacing={2}>
                                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                                  {comment.author?.username?.[0]?.toUpperCase() || '?'}
                                </Avatar>
                                <Box sx={{ flex: 1 }}>
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <Typography variant="subtitle2" fontWeight={600}>
                                      {comment.author.username}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {new Date(comment.created_at).toLocaleString()}
                                    </Typography>
                                  </Stack>
                                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                                    {comment.content}
                                  </Typography>
                                </Box>
                              </Stack>
                            </Box>
                          ))}
                        </Stack>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No comments yet. Be the first to comment!
                        </Typography>
                      )}
                    </Box>
                  )}

                  {/* Activity Tab */}
                  {tabValue === 1 && (
                    <Box>
                      {loadingActivity ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                          <CircularProgress size={24} />
                        </Box>
                      ) : activityData?.activity_logs && activityData.activity_logs.length > 0 ? (
                        <List dense>
                          {activityData.activity_logs.map((log, index) => (
                            <ListItem
                              key={log.id || index}
                              sx={{
                                borderRadius: 1,
                                mb: 1,
                                bgcolor: (theme) => alpha(theme.palette.grey[500], 0.05),
                              }}
                            >
                              <ListItemIcon sx={{ minWidth: 36 }}>
                                {getActivityIcon(log.action)}
                              </ListItemIcon>
                              <ListItemText
                                primary={
                                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                    <Typography variant="body2" fontWeight={600}>
                                      {log.user_name || 'System'}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      {log.description || log.action.toLowerCase().replace(/_/g, ' ')}
                                    </Typography>
                                    {log.changed_fields && log.changed_fields.length > 0 && (
                                      <Stack direction="row" spacing={0.5}>
                                        {log.changed_fields.slice(0, 3).map((field: string) => (
                                          <Chip key={field} label={field} size="small" variant="outlined" />
                                        ))}
                                      </Stack>
                                    )}
                                  </Stack>
                                }
                                secondary={
                                  <Typography variant="caption" color="text.secondary">
                                    {new Date(log.timestamp).toLocaleString()}
                                  </Typography>
                                }
                              />
                            </ListItem>
                          ))}
                        </List>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No activity recorded yet.
                        </Typography>
                      )}
                    </Box>
                  )}

                  {/* Attachments Tab */}
                  {tabValue === 2 && (
                    <Box>
                      <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleFileUpload}
                      />
                      <Button
                        variant="outlined"
                        startIcon={uploading ? <CircularProgress size={16} /> : <CloudUpload />}
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        sx={{ mb: 2 }}
                      >
                        {uploading ? 'Uploading...' : 'Upload File'}
                      </Button>

                      {loadingAttachments ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                          <CircularProgress size={24} />
                        </Box>
                      ) : attachments && attachments.length > 0 ? (
                        <List dense>
                          {attachments.map((attachment) => (
                            <ListItem
                              key={attachment.id}
                              secondaryAction={
                                <IconButton
                                  edge="end"
                                  size="small"
                                  onClick={() => handleDeleteAttachment(attachment.id)}
                                >
                                  <Delete fontSize="small" />
                                </IconButton>
                              }
                              sx={{
                                borderRadius: 1,
                                mb: 1,
                                bgcolor: (theme) => alpha(theme.palette.grey[500], 0.05),
                              }}
                            >
                              <ListItemIcon sx={{ minWidth: 36 }}>
                                <InsertDriveFile color="primary" />
                              </ListItemIcon>
                              <ListItemText
                                primary={
                                  <Link
                                    href={attachment.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    underline="hover"
                                  >
                                    {attachment.filename}
                                  </Link>
                                }
                                secondary={
                                  <Typography variant="caption" color="text.secondary">
                                    {formatFileSize(attachment.file_size)} • Uploaded by {attachment.uploaded_by_name} • {new Date(attachment.uploaded_at).toLocaleString()}
                                  </Typography>
                                }
                              />
                            </ListItem>
                          ))}
                        </List>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No attachments yet. Upload files to share with the team.
                        </Typography>
                      )}
                    </Box>
                  )}
                </Grid>

                {/* Sidebar */}
                <Grid item xs={12} md={4}>
                  <Stack spacing={2}>
                    {/* Assignee */}
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Assignee
                      </Typography>
                      {editMode ? (
                        <TextField
                          select
                          value={editForm.assignee}
                          onChange={(e) => setEditForm((f) => ({ ...f, assignee: e.target.value }))}
                          size="small"
                          fullWidth
                          sx={{ mt: 0.5 }}
                        >
                          <MenuItem value="">Unassigned</MenuItem>
                          {projectMembers.map((member) => (
                            <MenuItem key={member.user.id} value={member.user.id}>
                              {member.user.first_name && member.user.last_name
                                ? `${member.user.first_name} ${member.user.last_name}`
                                : member.user.username}
                            </MenuItem>
                          ))}
                        </TextField>
                      ) : task.assignee_details ? (
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5 }}>
                          <Avatar sx={{ width: 28, height: 28, bgcolor: 'primary.main' }}>
                            {task.assignee_details?.username?.[0]?.toUpperCase() || '?'}
                          </Avatar>
                          <Typography variant="body2">
                            {task.assignee_details.first_name && task.assignee_details.last_name
                              ? `${task.assignee_details.first_name} ${task.assignee_details.last_name}`
                              : task.assignee_details.username}
                          </Typography>
                        </Stack>
                      ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          Unassigned
                        </Typography>
                      )}
                    </Box>

                    {/* Reporter */}
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Reporter
                      </Typography>
                      {editMode ? (
                        <TextField
                          select
                          value={editForm.reporter}
                          onChange={(e) => setEditForm((f) => ({ ...f, reporter: e.target.value }))}
                          size="small"
                          fullWidth
                          sx={{ mt: 0.5 }}
                        >
                          <MenuItem value="">Unknown</MenuItem>
                          {projectMembers.map((member) => (
                            <MenuItem key={member.user.id} value={member.user.id}>
                              {member.user.first_name && member.user.last_name
                                ? `${member.user.first_name} ${member.user.last_name}`
                                : member.user.username}
                            </MenuItem>
                          ))}
                        </TextField>
                      ) : task.reporter_details ? (
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5 }}>
                          <Avatar sx={{ width: 28, height: 28, bgcolor: 'secondary.main' }}>
                            {task.reporter_details?.username?.[0]?.toUpperCase() || '?'}
                          </Avatar>
                          <Typography variant="body2">
                            {task.reporter_details.username}
                          </Typography>
                        </Stack>
                      ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          Unknown
                        </Typography>
                      )}
                    </Box>

                    <Divider />

                    {/* Due Date */}
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Due Date
                      </Typography>
                      {editMode ? (
                        <TextField
                          type="date"
                          value={editForm.due_date}
                          onChange={(e) => setEditForm((f) => ({ ...f, due_date: e.target.value }))}
                          size="small"
                          fullWidth
                          sx={{ mt: 0.5 }}
                        />
                      ) : (
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5 }}>
                          <CalendarMonth fontSize="small" color="action" />
                          <Typography variant="body2">
                            {task.due_date
                              ? new Date(task.due_date).toLocaleDateString()
                              : 'No due date'}
                          </Typography>
                        </Stack>
                      )}
                    </Box>

                    {/* Sprint */}
                    {task.sprint_details && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Sprint
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                          {task.sprint_details.name}
                        </Typography>
                      </Box>
                    )}

                    {/* Created At */}
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Created
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {task.created_at
                          ? new Date(task.created_at).toLocaleString()
                          : 'Unknown'}
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>
              </Grid>
            )}
          </DialogContent>

          <DialogActions>
            {editMode ? (
              <>
                <Button onClick={() => setEditMode(false)}>Cancel</Button>
                <Button onClick={handleSave} variant="contained" disabled={updating}>
                  {updating ? 'Saving...' : 'Save Changes'}
                </Button>
              </>
            ) : (
              <Button onClick={onClose}>Close</Button>
            )}
          </DialogActions>
        </>
      )}

      {/* More Menu */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={handleAssignToMe}>
          <PersonAdd fontSize="small" sx={{ mr: 1 }} /> Assign to me
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <Delete fontSize="small" sx={{ mr: 1 }} /> Delete task
        </MenuItem>
      </Menu>
    </Dialog>
  );
};
