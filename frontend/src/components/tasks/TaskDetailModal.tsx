import { useState, useEffect, useRef } from 'react';
import {
  Avatar,
  AvatarGroup,
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
  InputLabel,
  FormControl,
  LinearProgress,
  Link,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  OutlinedInput,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
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
  Add,
  CheckCircle,
  RadioButtonUnchecked,
  DeleteOutline,
  PlaylistAdd,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import {
  useGetTaskQuery,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useAssignTaskToMeMutation,
  useGetTaskActivityLogsQuery,
  useGetTaskTimeLogsQuery,
  useLogTimeMutation,
  useCreateTaskMutation,
  useListSubtasksQuery,
} from '../../api/taskApi';
import { useGetTaskCommentsQuery, useCreateCommentMutation } from '../../api/commentApi';
import {
  useListChecklistsQuery,
  useCreateChecklistMutation,
  useDeleteChecklistMutation,
  useCreateChecklistItemMutation,
  useUpdateChecklistItemMutation,
  useDeleteChecklistItemMutation,
} from '../../api/checklistApi';
import { useGetProjectQuery } from '../../api/projectApi';
import { useListTagsQuery, useAddTagToTaskMutation, useRemoveTagFromTaskMutation, useCreateTagMutation } from '../../api/tagApi';
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
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStart, setMentionStart] = useState(-1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    status: '',
    priority: '',
    due_date: '',
    assignee: '' as string | number,
    assignees: [] as number[],
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
  const { data: timeLogs } = useGetTaskTimeLogsQuery(taskId!, { skip: !taskId });
  const [updateTask, { isLoading: updating }] = useUpdateTaskMutation();
  const [deleteTask, { isLoading: deleting }] = useDeleteTaskMutation();
  const [assignToMe] = useAssignTaskToMeMutation();
  const [createComment, { isLoading: commenting }] = useCreateCommentMutation();
  const [logTime, { isLoading: loggingTime }] = useLogTimeMutation();
  const [uploadAttachment, { isLoading: uploading }] = useUploadAttachmentMutation();
  const [deleteAttachment] = useDeleteAttachmentMutation();
  const { data: subtasks } = useListSubtasksQuery(taskId!, { skip: !taskId });
  const [createTask] = useCreateTaskMutation();
  const { data: checklists } = useListChecklistsQuery(taskId!, { skip: !taskId });
  const [createChecklist] = useCreateChecklistMutation();
  const [deleteChecklist] = useDeleteChecklistMutation();
  const [createChecklistItem] = useCreateChecklistItemMutation();
  const [updateChecklistItem] = useUpdateChecklistItemMutation();
  const [deleteChecklistItem] = useDeleteChecklistItemMutation();

  const workspaceId = project?.workspace as number | undefined;
  const { data: workspaceTags } = useListTagsQuery(
    workspaceId ? { workspace: workspaceId } : undefined,
    { skip: !workspaceId }
  );
  const [addTagToTask] = useAddTagToTaskMutation();
  const [removeTagFromTask] = useRemoveTagFromTaskMutation();
  const [createTag] = useCreateTagMutation();
  const [tagMenuAnchor, setTagMenuAnchor] = useState<null | HTMLElement>(null);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#6B7280');

  const [logHours, setLogHours] = useState('');
  const [logNote, setLogNote] = useState('');
  const [showAddSubtask, setShowAddSubtask] = useState(false);
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [selectedSubtaskId, setSelectedSubtaskId] = useState<number | null>(null);
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [showNewChecklist, setShowNewChecklist] = useState(false);
  const [newItemText, setNewItemText] = useState<Record<number, string>>({});
  const [showNewItem, setShowNewItem] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (task) {
      setEditForm({
        title: task.title,
        description: task.description || '',
        status: task.status,
        priority: task.priority,
        due_date: task.due_date || '',
        assignee: task.assignee || '',
        assignees: task.assignees || [],
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
          assignees: editForm.assignees,
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

  const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNewComment(val);
    const pos = e.target.selectionStart ?? val.length;
    const match = val.slice(0, pos).match(/@(\w*)$/);
    if (match) {
      setMentionQuery(match[1]);
      setMentionStart(pos - match[0].length);
      setMentionOpen(true);
    } else {
      setMentionOpen(false);
    }
  };

  const handleMentionSelect = (username: string) => {
    const before = newComment.slice(0, mentionStart);
    const after = newComment.slice(mentionStart + 1 + mentionQuery.length);
    setNewComment(`${before}@${username} ${after}`);
    setMentionOpen(false);
    setTimeout(() => commentInputRef.current?.focus(), 0);
  };

  const mentionMembers = projectMembers
    .filter((m) => !mentionQuery || m.user.username.toLowerCase().startsWith(mentionQuery.toLowerCase()))
    .slice(0, 6);

  const handleAddSubtask = async () => {
    const title = subtaskTitle.trim();
    if (!taskId || !title || !task) return;
    try {
      await createTask({
        title,
        status: 'To-do',
        priority: 'Medium',
        sprint: task.sprint as number,
        parent: taskId,
      }).unwrap();
      setSubtaskTitle('');
      setShowAddSubtask(false);
      enqueueSnackbar('Subtask created', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to create subtask', { variant: 'error' });
    }
  };

  const handleCreateChecklist = async () => {
    const title = newChecklistTitle.trim();
    if (!taskId || !title) return;
    try {
      await createChecklist({ task: taskId, title }).unwrap();
      setNewChecklistTitle('');
      setShowNewChecklist(false);
      enqueueSnackbar('Checklist created', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to create checklist', { variant: 'error' });
    }
  };

  const handleAddItem = async (checklistId: number) => {
    const text = (newItemText[checklistId] || '').trim();
    if (!taskId || !text) return;
    try {
      await createChecklistItem({ checklist: checklistId, text, taskId }).unwrap();
      setNewItemText((p) => ({ ...p, [checklistId]: '' }));
      setShowNewItem((p) => ({ ...p, [checklistId]: false }));
    } catch {
      enqueueSnackbar('Failed to add item', { variant: 'error' });
    }
  };

  const handleToggleItem = async (itemId: number, checked: boolean) => {
    if (!taskId) return;
    try {
      await updateChecklistItem({ id: itemId, taskId, is_checked: checked }).unwrap();
    } catch {
      enqueueSnackbar('Failed to update item', { variant: 'error' });
    }
  };

  const handleLogTime = async () => {
    const hours = parseFloat(logHours);
    if (!taskId || isNaN(hours) || hours <= 0) return;
    try {
      await logTime({
        task: taskId,
        hours,
        date: new Date().toISOString().slice(0, 10),
        note: logNote.trim(),
      }).unwrap();
      setLogHours('');
      setLogNote('');
      enqueueSnackbar(`${hours}h logged`, { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to log time', { variant: 'error' });
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
                          {project?.custom_statuses && project.custom_statuses.length > 0 ? (
                            project.custom_statuses.map((s) => (
                              <MenuItem key={s.id} value={s.name}>{s.name}</MenuItem>
                            ))
                          ) : (
                            [
                              <MenuItem key="todo" value="To-do">To Do</MenuItem>,
                              <MenuItem key="inprogress" value="In Progress">In Progress</MenuItem>,
                              <MenuItem key="review" value="Review">Review</MenuItem>,
                              <MenuItem key="done" value="Done">Done</MenuItem>,
                            ]
                          )}
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
                        {task.is_blocked && (
                          <Chip
                            label="Blocked"
                            color="error"
                            size="small"
                            sx={{ fontWeight: 600 }}
                          />
                        )}
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

                  {/* Subtasks */}
                  <Box sx={{ mb: 2 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Subtasks
                        {subtasks && subtasks.length > 0 && (
                          <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                            ({subtasks.filter((s) => s.status === 'Done').length}/{subtasks.length} done)
                          </Typography>
                        )}
                      </Typography>
                      <Button
                        size="small"
                        startIcon={<Add fontSize="small" />}
                        onClick={() => setShowAddSubtask(true)}
                      >
                        Add
                      </Button>
                    </Stack>

                    {subtasks && subtasks.length > 0 && (
                      <Stack spacing={0.5} sx={{ mb: 1 }}>
                        {subtasks.map((sub) => (
                          <Paper
                            key={sub.id}
                            variant="outlined"
                            sx={{
                              px: 1.5,
                              py: 0.75,
                              cursor: 'pointer',
                              '&:hover': { bgcolor: 'action.hover' },
                            }}
                            onClick={() => setSelectedSubtaskId(sub.id)}
                          >
                            <Stack direction="row" alignItems="center" spacing={1}>
                              {sub.status === 'Done' ? (
                                <CheckCircle fontSize="small" color="success" />
                              ) : (
                                <RadioButtonUnchecked fontSize="small" color="disabled" />
                              )}
                              <Typography
                                variant="body2"
                                sx={{
                                  flex: 1,
                                  textDecoration: sub.status === 'Done' ? 'line-through' : 'none',
                                  color: sub.status === 'Done' ? 'text.secondary' : 'text.primary',
                                }}
                              >
                                {sub.title}
                              </Typography>
                              <Chip
                                label={sub.status}
                                size="small"
                                color={
                                  sub.status === 'Done' ? 'success' :
                                  sub.status === 'In Progress' ? 'primary' :
                                  sub.status === 'Review' ? 'warning' : 'default'
                                }
                                sx={{ fontSize: '0.65rem', height: 18 }}
                              />
                            </Stack>
                          </Paper>
                        ))}
                      </Stack>
                    )}

                    {showAddSubtask && (
                      <TextField
                        autoFocus
                        size="small"
                        fullWidth
                        placeholder="Subtask title… (Enter to save, Escape to cancel)"
                        value={subtaskTitle}
                        onChange={(e) => setSubtaskTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); handleAddSubtask(); }
                          if (e.key === 'Escape') { setShowAddSubtask(false); setSubtaskTitle(''); }
                        }}
                        onBlur={() => { if (!subtaskTitle.trim()) { setShowAddSubtask(false); } }}
                        variant="outlined"
                        sx={{ mt: 0.5 }}
                      />
                    )}
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  {/* Checklists */}
                  <Box sx={{ mb: 2 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Checklists
                      </Typography>
                      <Button
                        size="small"
                        startIcon={<PlaylistAdd fontSize="small" />}
                        onClick={() => setShowNewChecklist(true)}
                      >
                        Add Checklist
                      </Button>
                    </Stack>

                    {showNewChecklist && (
                      <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                        <TextField
                          autoFocus
                          size="small"
                          placeholder="Checklist title…"
                          value={newChecklistTitle}
                          onChange={(e) => setNewChecklistTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); handleCreateChecklist(); }
                            if (e.key === 'Escape') { setShowNewChecklist(false); setNewChecklistTitle(''); }
                          }}
                          sx={{ flex: 1 }}
                        />
                        <Button size="small" variant="contained" onClick={handleCreateChecklist} disabled={!newChecklistTitle.trim()}>
                          Add
                        </Button>
                        <Button size="small" onClick={() => { setShowNewChecklist(false); setNewChecklistTitle(''); }}>
                          Cancel
                        </Button>
                      </Stack>
                    )}

                    {checklists && checklists.map((cl) => {
                      const pct = cl.total_items > 0
                        ? Math.round((cl.checked_items / cl.total_items) * 100)
                        : 0;
                      return (
                        <Box key={cl.id} sx={{ mb: 2 }}>
                          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
                            <Typography variant="body2" fontWeight={600}>{cl.title}</Typography>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Typography variant="caption" color="text.secondary">
                                {cl.checked_items}/{cl.total_items}
                              </Typography>
                              <IconButton
                                size="small"
                                onClick={() => taskId && deleteChecklist({ id: cl.id, taskId })}
                                sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}
                              >
                                <DeleteOutline fontSize="small" />
                              </IconButton>
                            </Stack>
                          </Stack>

                          <LinearProgress
                            variant="determinate"
                            value={pct}
                            color={pct === 100 ? 'success' : 'primary'}
                            sx={{ height: 4, borderRadius: 2, mb: 1 }}
                          />

                          <Stack spacing={0.5}>
                            {cl.items.map((item) => (
                              <Stack
                                key={item.id}
                                direction="row"
                                alignItems="center"
                                spacing={1}
                                sx={{
                                  px: 1,
                                  py: 0.5,
                                  borderRadius: 1,
                                  '&:hover .item-delete': { opacity: 1 },
                                }}
                              >
                                <IconButton
                                  size="small"
                                  onClick={() => handleToggleItem(item.id, !item.is_checked)}
                                  sx={{ p: 0 }}
                                >
                                  {item.is_checked
                                    ? <CheckCircle fontSize="small" color="success" />
                                    : <RadioButtonUnchecked fontSize="small" color="disabled" />}
                                </IconButton>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    flex: 1,
                                    textDecoration: item.is_checked ? 'line-through' : 'none',
                                    color: item.is_checked ? 'text.secondary' : 'text.primary',
                                  }}
                                >
                                  {item.text}
                                </Typography>
                                <IconButton
                                  className="item-delete"
                                  size="small"
                                  onClick={() => taskId && deleteChecklistItem({ id: item.id, taskId })}
                                  sx={{ p: 0, opacity: 0, transition: 'opacity 0.15s', color: 'text.disabled', '&:hover': { color: 'error.main' } }}
                                >
                                  <DeleteOutline fontSize="small" />
                                </IconButton>
                              </Stack>
                            ))}
                          </Stack>

                          {/* Add item row */}
                          {showNewItem[cl.id] ? (
                            <Stack direction="row" spacing={1} sx={{ mt: 0.5, pl: 1 }}>
                              <TextField
                                autoFocus
                                size="small"
                                placeholder="New item…"
                                value={newItemText[cl.id] || ''}
                                onChange={(e) => setNewItemText((p) => ({ ...p, [cl.id]: e.target.value }))}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') { e.preventDefault(); handleAddItem(cl.id); }
                                  if (e.key === 'Escape') setShowNewItem((p) => ({ ...p, [cl.id]: false }));
                                }}
                                sx={{ flex: 1 }}
                              />
                              <Button size="small" variant="contained" onClick={() => handleAddItem(cl.id)}>
                                Add
                              </Button>
                            </Stack>
                          ) : (
                            <Box
                              sx={{
                                mt: 0.5,
                                pl: 1,
                                cursor: 'pointer',
                                color: 'text.secondary',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                '&:hover': { color: 'text.primary' },
                              }}
                              onClick={() => setShowNewItem((p) => ({ ...p, [cl.id]: true }))}
                            >
                              <Add fontSize="small" />
                              <Typography variant="caption">Add item</Typography>
                            </Box>
                          )}
                        </Box>
                      );
                    })}
                  </Box>

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
                        <Box sx={{ position: 'relative', flex: 1 }}>
                          <TextField
                            value={newComment}
                            onChange={handleCommentChange}
                            onKeyDown={(e) => { if (e.key === 'Escape') setMentionOpen(false); }}
                            onBlur={() => setTimeout(() => setMentionOpen(false), 150)}
                            placeholder="Add a comment… type @ to mention someone"
                            fullWidth
                            multiline
                            rows={2}
                            size="small"
                            inputRef={commentInputRef}
                          />
                          {mentionOpen && mentionMembers.length > 0 && (
                            <Paper
                              elevation={4}
                              sx={{
                                position: 'absolute',
                                zIndex: 1500,
                                top: '100%',
                                left: 0,
                                right: 0,
                                maxHeight: 200,
                                overflow: 'auto',
                                mt: 0.5,
                                borderRadius: 1,
                              }}
                            >
                              <List dense disablePadding>
                                {mentionMembers.map((member) => (
                                  <ListItemButton
                                    key={member.user.id}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      handleMentionSelect(member.user.username);
                                    }}
                                  >
                                    <ListItemAvatar sx={{ minWidth: 36 }}>
                                      <Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem', bgcolor: 'primary.main' }}>
                                        {member.user.username[0].toUpperCase()}
                                      </Avatar>
                                    </ListItemAvatar>
                                    <ListItemText
                                      primary={member.user.username}
                                      primaryTypographyProps={{ variant: 'body2' }}
                                    />
                                  </ListItemButton>
                                ))}
                              </List>
                            </Paper>
                          )}
                        </Box>
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
                    {/* Assignees */}
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Assignees
                      </Typography>
                      {editMode ? (
                        <FormControl fullWidth size="small" sx={{ mt: 0.5 }}>
                          <InputLabel>Assignees</InputLabel>
                          <Select
                            multiple
                            value={editForm.assignees}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                assignees: e.target.value as number[],
                              }))
                            }
                            input={<OutlinedInput label="Assignees" />}
                            renderValue={(selected) =>
                              (selected as number[])
                                .map((id) => projectMembers.find((m) => m.user.id === id)?.user.username ?? id)
                                .join(', ')
                            }
                          >
                            {projectMembers.map((member) => (
                              <MenuItem key={member.user.id} value={member.user.id}>
                                <Avatar sx={{ width: 22, height: 22, mr: 1, fontSize: '0.65rem', bgcolor: 'primary.main' }}>
                                  {member.user.username[0].toUpperCase()}
                                </Avatar>
                                {member.user.first_name && member.user.last_name
                                  ? `${member.user.first_name} ${member.user.last_name}`
                                  : member.user.username}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      ) : task.assignees_details && task.assignees_details.length > 0 ? (
                        <AvatarGroup max={4} sx={{ mt: 0.5, justifyContent: 'flex-start', '& .MuiAvatar-root': { width: 28, height: 28, fontSize: '0.7rem' } }}>
                          {task.assignees_details.map((u) => (
                            <Tooltip key={u.id} title={u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.username}>
                              <Avatar sx={{ bgcolor: 'primary.main' }}>
                                {u.username[0].toUpperCase()}
                              </Avatar>
                            </Tooltip>
                          ))}
                        </AvatarGroup>
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

                    {/* Tags */}
                    <Box>
                      <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Typography variant="caption" color="text.secondary">Tags</Typography>
                        <Tooltip title="Add tag">
                          <IconButton
                            size="small"
                            onClick={(e) => setTagMenuAnchor(e.currentTarget)}
                          >
                            <Add fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 0.5, gap: 0.5 }}>
                        {task.tags_details && task.tags_details.length > 0 ? (
                          task.tags_details.map((tag) => (
                            <Chip
                              key={tag.id}
                              label={tag.name}
                              size="small"
                              onDelete={async () => {
                                try {
                                  await removeTagFromTask({ taskId: taskId!, tagId: tag.id }).unwrap();
                                } catch {
                                  enqueueSnackbar('Failed to remove tag', { variant: 'error' });
                                }
                              }}
                              sx={{
                                bgcolor: tag.color,
                                color: 'white',
                                '& .MuiChip-deleteIcon': { color: 'rgba(255,255,255,0.7)', '&:hover': { color: 'white' } },
                                fontSize: '0.65rem',
                                height: 20,
                              }}
                            />
                          ))
                        ) : (
                          <Typography variant="caption" color="text.disabled">None</Typography>
                        )}
                      </Stack>
                      <Menu
                        anchorEl={tagMenuAnchor}
                        open={Boolean(tagMenuAnchor)}
                        onClose={() => { setTagMenuAnchor(null); setNewTagName(''); setNewTagColor('#6B7280'); }}
                        PaperProps={{ sx: { minWidth: 220, p: 1 } }}
                      >
                        {workspaceTags && workspaceTags
                          .filter((t) => !task.tags_details?.find((td) => td.id === t.id))
                          .map((tag) => (
                            <MenuItem
                              key={tag.id}
                              dense
                              onClick={async () => {
                                setTagMenuAnchor(null);
                                try {
                                  await addTagToTask({ taskId: taskId!, tagId: tag.id }).unwrap();
                                } catch {
                                  enqueueSnackbar('Failed to add tag', { variant: 'error' });
                                }
                              }}
                            >
                              <Box
                                sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: tag.color, mr: 1, flexShrink: 0 }}
                              />
                              {tag.name}
                            </MenuItem>
                          ))}
                        <Divider sx={{ my: 0.5 }} />
                        <Box sx={{ px: 1, pt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">Create new tag</Typography>
                          <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                            <TextField
                              size="small"
                              placeholder="Tag name"
                              value={newTagName}
                              onChange={(e) => setNewTagName(e.target.value)}
                              onKeyDown={(e) => e.stopPropagation()}
                              sx={{ flex: 1, '& .MuiInputBase-input': { py: 0.5 } }}
                            />
                            <TextField
                              type="color"
                              size="small"
                              value={newTagColor}
                              onChange={(e) => setNewTagColor(e.target.value)}
                              sx={{ width: 48, '& .MuiInputBase-input': { py: 0.5, px: 0.5 } }}
                              InputLabelProps={{ shrink: true }}
                            />
                          </Stack>
                          <Button
                            size="small"
                            fullWidth
                            sx={{ mt: 0.5 }}
                            disabled={!newTagName.trim() || !workspaceId}
                            onClick={async () => {
                              if (!newTagName.trim() || !workspaceId) return;
                              setTagMenuAnchor(null);
                              try {
                                const tag = await createTag({ workspace: workspaceId, name: newTagName.trim(), color: newTagColor }).unwrap();
                                await addTagToTask({ taskId: taskId!, tagId: tag.id }).unwrap();
                                setNewTagName('');
                                setNewTagColor('#6B7280');
                              } catch {
                                enqueueSnackbar('Failed to create tag', { variant: 'error' });
                              }
                            }}
                          >
                            Create &amp; Add
                          </Button>
                        </Box>
                      </Menu>
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

                    <Divider />

                    {/* Time Tracking */}
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        Time Tracking
                      </Typography>

                      {/* Progress bar: actual / estimated */}
                      {task.estimated_hours != null && (
                        <Box sx={{ mt: 1 }}>
                          <Stack direction="row" justifyContent="space-between">
                            <Typography variant="caption" color="text.secondary">
                              {Number(task.actual_hours ?? 0).toFixed(1)}h logged
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {Number(task.estimated_hours).toFixed(1)}h estimated
                            </Typography>
                          </Stack>
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(
                              100,
                              (Number(task.actual_hours ?? 0) / Number(task.estimated_hours)) * 100
                            )}
                            color={
                              Number(task.actual_hours ?? 0) > Number(task.estimated_hours)
                                ? 'error'
                                : 'primary'
                            }
                            sx={{ mt: 0.5, borderRadius: 1, height: 6 }}
                          />
                        </Box>
                      )}

                      {task.estimated_hours == null && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          {Number(task.actual_hours ?? 0).toFixed(1)}h logged
                        </Typography>
                      )}

                      {/* Log time input */}
                      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                        <TextField
                          size="small"
                          type="number"
                          placeholder="Hours"
                          value={logHours}
                          onChange={(e) => setLogHours(e.target.value)}
                          inputProps={{ min: 0.1, step: 0.25 }}
                          sx={{ width: 90 }}
                        />
                        <TextField
                          size="small"
                          placeholder="Note (optional)"
                          value={logNote}
                          onChange={(e) => setLogNote(e.target.value)}
                          sx={{ flex: 1 }}
                        />
                        <Button
                          size="small"
                          variant="contained"
                          onClick={handleLogTime}
                          disabled={loggingTime || !logHours || Number(logHours) <= 0}
                        >
                          Log
                        </Button>
                      </Stack>

                      {/* Recent logs */}
                      {timeLogs && timeLogs.length > 0 && (
                        <Stack spacing={0.5} sx={{ mt: 1, maxHeight: 120, overflow: 'auto' }}>
                          {timeLogs.slice(0, 5).map((log) => (
                            <Stack
                              key={log.id}
                              direction="row"
                              justifyContent="space-between"
                              alignItems="center"
                              sx={{
                                px: 1,
                                py: 0.5,
                                borderRadius: 1,
                                bgcolor: (theme) => alpha(theme.palette.grey[500], 0.07),
                              }}
                            >
                              <Typography variant="caption" color="text.secondary" noWrap sx={{ flex: 1 }}>
                                {log.user_username}
                                {log.note ? ` — ${log.note}` : ''}
                              </Typography>
                              <Typography variant="caption" fontWeight={600} sx={{ ml: 1, whiteSpace: 'nowrap' }}>
                                {Number(log.hours).toFixed(1)}h · {log.date}
                              </Typography>
                            </Stack>
                          ))}
                        </Stack>
                      )}
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

      {/* Subtask modal (recursive) */}
      <TaskDetailModal
        taskId={selectedSubtaskId}
        open={Boolean(selectedSubtaskId)}
        onClose={() => setSelectedSubtaskId(null)}
        onDeleted={() => setSelectedSubtaskId(null)}
      />
    </Dialog>
  );
};
