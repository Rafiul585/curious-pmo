import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  CircularProgress,
  Link,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { ArrowBack, Save, Delete } from '@mui/icons-material';
import MDEditor from '@uiw/react-md-editor';
import { useSnackbar } from 'notistack';
import { useGetDocQuery, useUpdateDocMutation, useDeleteDocMutation } from '../api/docApi';
import { useGetProjectQuery } from '../api/projectApi';

export const DocDetailPage = () => {
  const { projectId, docId } = useParams<{ projectId: string; docId: string }>();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const pid = Number(projectId);
  const did = Number(docId);

  const { data: doc, isLoading, error } = useGetDocQuery(did);
  const { data: project } = useGetProjectQuery(pid);
  const [updateDoc, { isLoading: saving }] = useUpdateDocMutation();
  const [deleteDoc, { isLoading: deleting }] = useDeleteDocMutation();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (doc) {
      setTitle(doc.title);
      setContent(doc.content ?? '');
      setDirty(false);
    }
  }, [doc]);

  const handleSave = async () => {
    try {
      await updateDoc({ id: did, projectId: pid, data: { title: title.trim(), content } }).unwrap();
      enqueueSnackbar('Doc saved', { variant: 'success' });
      setDirty(false);
    } catch {
      enqueueSnackbar('Failed to save doc', { variant: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this document? This cannot be undone.')) return;
    try {
      await deleteDoc({ id: did, projectId: pid }).unwrap();
      enqueueSnackbar('Doc deleted', { variant: 'success' });
      navigate(`/projects/${pid}?tab=6`);
    } catch {
      enqueueSnackbar('Failed to delete doc', { variant: 'error' });
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="rectangular" height={60} sx={{ mb: 2, borderRadius: 1 }} />
        <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 1 }} />
      </Box>
    );
  }

  if (error || !doc) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Document not found.</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate(`/projects/${pid}?tab=6`)} sx={{ mt: 2 }}>
          Back to Docs
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 960, mx: 'auto' }}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link component={RouterLink} to="/projects" underline="hover" color="inherit">
          Projects
        </Link>
        <Link component={RouterLink} to={`/projects/${pid}?tab=6`} underline="hover" color="inherit">
          {project?.name ?? `Project ${pid}`}
        </Link>
        <Typography color="text.primary" noWrap sx={{ maxWidth: 240 }}>
          {doc.title}
        </Typography>
      </Breadcrumbs>

      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <TextField
            value={title}
            onChange={(e) => { setTitle(e.target.value); setDirty(true); }}
            variant="standard"
            fullWidth
            inputProps={{ style: { fontSize: '1.5rem', fontWeight: 700 } }}
            placeholder="Document title"
            sx={{ mr: 2 }}
          />
          <Stack direction="row" spacing={1} flexShrink={0}>
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save />}
              onClick={handleSave}
              disabled={saving || !dirty || !title.trim()}
            >
              Save
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<Delete />}
              onClick={handleDelete}
              disabled={deleting}
            >
              Delete
            </Button>
          </Stack>
        </Stack>

        <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
          Last updated {new Date(doc.updated_at).toLocaleString()}
          {doc.created_by_username && ` · Created by ${doc.created_by_username}`}
        </Typography>

        <Box data-color-mode="light">
          <MDEditor
            value={content}
            onChange={(val) => { setContent(val ?? ''); setDirty(true); }}
            height={500}
            preview="live"
          />
        </Box>
      </Paper>
    </Box>
  );
};
