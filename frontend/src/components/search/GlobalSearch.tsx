import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  TextField,
  InputAdornment,
  Paper,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Chip,
  Popper,
  ClickAwayListener,
  CircularProgress,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AssignmentIcon from '@mui/icons-material/Assignment';
import FolderIcon from '@mui/icons-material/Folder';
import PersonIcon from '@mui/icons-material/Person';
import { useLazyQuickSearchQuery, QuickSearchItem } from '../../api/searchApi';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  task: <AssignmentIcon fontSize="small" />,
  project: <FolderIcon fontSize="small" />,
  user: <PersonIcon fontSize="small" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  task: '#ed6c02',
  project: '#1976d2',
  user: '#9c27b0',
};

export const GlobalSearch = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  const [triggerSearch, { data: searchResults, isLoading }] = useLazyQuickSearchQuery();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 2) {
        triggerSearch({ q: query, limit: 8 });
        setOpen(true);
      } else {
        setOpen(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, triggerSearch]);

  const handleSelect = (item: QuickSearchItem) => {
    setOpen(false);
    setQuery('');

    switch (item.category) {
      case 'task':
        navigate(`/tasks?highlight=${item.id}`);
        break;
      case 'project':
        navigate(`/projects?highlight=${item.id}`);
        break;
      case 'user':
        // Navigate to user profile or team page
        break;
    }
  };

  const handleViewAll = () => {
    setOpen(false);
    navigate(`/search?q=${encodeURIComponent(query)}`);
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.length >= 2) {
      handleViewAll();
    }
    if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const getItemLabel = (item: QuickSearchItem): string => {
    return item.title || item.name || item.username || item.full_name || 'Unknown';
  };

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <Box ref={anchorRef} sx={{ position: 'relative', width: 300 }}>
        <TextField
          size="small"
          placeholder="Search tasks, projects..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && setOpen(true)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                {isLoading ? <CircularProgress size={20} /> : <SearchIcon />}
              </InputAdornment>
            ),
          }}
          sx={{
            width: '100%',
            '& .MuiOutlinedInput-root': {
              bgcolor: 'background.paper',
              borderRadius: 2,
            },
          }}
        />

        <Popper open={open} anchorEl={anchorRef.current} placement="bottom-start" sx={{ zIndex: 1300, width: 350 }}>
          <Paper elevation={8} sx={{ mt: 1, maxHeight: 400, overflow: 'auto' }}>
            {searchResults?.results.length === 0 ? (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography color="text.secondary">No results found for "{query}"</Typography>
              </Box>
            ) : (
              <>
                <List dense>
                  {searchResults?.results.map((item, index) => (
                    <ListItemButton key={`${item.category}-${item.id}-${index}`} onClick={() => handleSelect(item)}>
                      <ListItemIcon sx={{ minWidth: 36 }}>{CATEGORY_ICONS[item.category]}</ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                              {getItemLabel(item)}
                            </Typography>
                            <Chip
                              label={item.category}
                              size="small"
                              sx={{
                                bgcolor: CATEGORY_COLORS[item.category],
                                color: 'white',
                                fontSize: '0.65rem',
                                height: 18,
                              }}
                            />
                          </Box>
                        }
                        secondary={item.status || item.email}
                      />
                    </ListItemButton>
                  ))}
                </List>
                <Box sx={{ p: 1, borderTop: 1, borderColor: 'divider' }}>
                  <ListItemButton onClick={handleViewAll} sx={{ borderRadius: 1 }}>
                    <ListItemText
                      primary={
                        <Typography variant="body2" color="primary" sx={{ fontWeight: 500 }}>
                          View all results for "{query}"
                        </Typography>
                      }
                    />
                  </ListItemButton>
                </Box>
              </>
            )}
          </Paper>
        </Popper>
      </Box>
    </ClickAwayListener>
  );
};
