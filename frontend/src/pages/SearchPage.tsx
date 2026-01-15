import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  Paper,
  Tabs,
  Tab,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Chip,
  Stack,
  LinearProgress,
  Divider,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AssignmentIcon from '@mui/icons-material/Assignment';
import FolderIcon from '@mui/icons-material/Folder';
import FlagIcon from '@mui/icons-material/Flag';
import SprintIcon from '@mui/icons-material/DirectionsRun';
import PersonIcon from '@mui/icons-material/Person';
import { useSearchAllQuery } from '../api/searchApi';

const PRIORITY_COLORS: Record<string, string> = {
  Low: '#4caf50',
  Medium: '#2196f3',
  High: '#ff9800',
  Critical: '#f44336',
};

const STATUS_COLORS: Record<string, string> = {
  'Not Started': '#9e9e9e',
  'In Progress': '#2196f3',
  'Review': '#ff9800',
  'Done': '#4caf50',
  'Completed': '#4caf50',
};

export const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState(0);

  const { data: searchResults, isLoading } = useSearchAllQuery(
    { q: query, limit: 50 },
    { skip: query.length < 2 }
  );

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) setQuery(q);
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.length >= 2) {
      setSearchParams({ q: query });
    }
  };

  const tabs = [
    { label: 'All', count: searchResults?.total_count || 0 },
    { label: 'Tasks', count: searchResults?.results.tasks.count || 0 },
    { label: 'Projects', count: searchResults?.results.projects.count || 0 },
    { label: 'Milestones', count: searchResults?.results.milestones.count || 0 },
    { label: 'Sprints', count: searchResults?.results.sprints.count || 0 },
    { label: 'Users', count: searchResults?.results.users.count || 0 },
  ];

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3 }}>
        Search
      </Typography>

      <Paper component="form" onSubmit={handleSearch} sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search tasks, projects, users..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      {isLoading && <LinearProgress sx={{ mb: 2 }} />}

      {query.length >= 2 && searchResults && (
        <>
          <Paper sx={{ mb: 2 }}>
            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="scrollable">
              {tabs.map((tab, idx) => (
                <Tab
                  key={tab.label}
                  label={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <span>{tab.label}</span>
                      <Chip label={tab.count} size="small" />
                    </Stack>
                  }
                />
              ))}
            </Tabs>
          </Paper>

          <Paper>
            {/* All Results */}
            {activeTab === 0 && (
              <Box>
                {searchResults.total_count === 0 ? (
                  <Box sx={{ p: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary">No results found for "{query}"</Typography>
                  </Box>
                ) : (
                  <>
                    {/* Tasks Section */}
                    {searchResults.results.tasks.count > 0 && (
                      <>
                        <Typography variant="subtitle2" sx={{ p: 2, bgcolor: 'action.hover' }}>
                          Tasks ({searchResults.results.tasks.count})
                        </Typography>
                        <List dense>
                          {searchResults.results.tasks.items.slice(0, 5).map((task) => (
                            <ListItemButton key={task.id} onClick={() => navigate(`/tasks?highlight=${task.id}`)}>
                              <ListItemIcon>
                                <AssignmentIcon />
                              </ListItemIcon>
                              <ListItemText
                                primary={task.title}
                                secondary={`${task.project?.name || 'No project'} • ${task.sprint?.name || 'No sprint'}`}
                              />
                              <Stack direction="row" spacing={0.5}>
                                <Chip
                                  label={task.status}
                                  size="small"
                                  sx={{ bgcolor: STATUS_COLORS[task.status], color: 'white' }}
                                />
                                <Chip
                                  label={task.priority}
                                  size="small"
                                  sx={{ bgcolor: PRIORITY_COLORS[task.priority], color: 'white' }}
                                />
                              </Stack>
                            </ListItemButton>
                          ))}
                        </List>
                        <Divider />
                      </>
                    )}

                    {/* Projects Section */}
                    {searchResults.results.projects.count > 0 && (
                      <>
                        <Typography variant="subtitle2" sx={{ p: 2, bgcolor: 'action.hover' }}>
                          Projects ({searchResults.results.projects.count})
                        </Typography>
                        <List dense>
                          {searchResults.results.projects.items.slice(0, 5).map((project) => (
                            <ListItemButton key={project.id} onClick={() => navigate(`/projects?highlight=${project.id}`)}>
                              <ListItemIcon>
                                <FolderIcon />
                              </ListItemIcon>
                              <ListItemText
                                primary={project.name}
                                secondary={project.workspace?.name || 'No workspace'}
                              />
                              <Chip
                                label={project.status}
                                size="small"
                                sx={{ bgcolor: STATUS_COLORS[project.status || 'Not Started'], color: 'white' }}
                              />
                            </ListItemButton>
                          ))}
                        </List>
                        <Divider />
                      </>
                    )}

                    {/* Users Section */}
                    {searchResults.results.users.count > 0 && (
                      <>
                        <Typography variant="subtitle2" sx={{ p: 2, bgcolor: 'action.hover' }}>
                          Users ({searchResults.results.users.count})
                        </Typography>
                        <List dense>
                          {searchResults.results.users.items.slice(0, 5).map((user) => (
                            <ListItemButton key={user.id}>
                              <ListItemIcon>
                                <PersonIcon />
                              </ListItemIcon>
                              <ListItemText primary={user.full_name || user.username} secondary={user.email} />
                            </ListItemButton>
                          ))}
                        </List>
                      </>
                    )}
                  </>
                )}
              </Box>
            )}

            {/* Tasks Tab */}
            {activeTab === 1 && (
              <List>
                {searchResults.results.tasks.items.length === 0 ? (
                  <Box sx={{ p: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary">No tasks found</Typography>
                  </Box>
                ) : (
                  searchResults.results.tasks.items.map((task) => (
                    <ListItemButton key={task.id} onClick={() => navigate(`/tasks?highlight=${task.id}`)}>
                      <ListItemIcon>
                        <AssignmentIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary={task.title}
                        secondary={
                          <span>
                            {task.project?.name || 'No project'} • {task.sprint?.name || 'No sprint'}
                            {task.assignee && ` • Assigned to: ${task.assignee}`}
                          </span>
                        }
                      />
                      <Stack direction="row" spacing={0.5}>
                        <Chip
                          label={task.status}
                          size="small"
                          sx={{ bgcolor: STATUS_COLORS[task.status], color: 'white' }}
                        />
                        <Chip
                          label={task.priority}
                          size="small"
                          sx={{ bgcolor: PRIORITY_COLORS[task.priority], color: 'white' }}
                        />
                      </Stack>
                    </ListItemButton>
                  ))
                )}
              </List>
            )}

            {/* Projects Tab */}
            {activeTab === 2 && (
              <List>
                {searchResults.results.projects.items.length === 0 ? (
                  <Box sx={{ p: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary">No projects found</Typography>
                  </Box>
                ) : (
                  searchResults.results.projects.items.map((project) => (
                    <ListItemButton key={project.id} onClick={() => navigate(`/projects?highlight=${project.id}`)}>
                      <ListItemIcon>
                        <FolderIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary={project.name}
                        secondary={`${project.workspace?.name || 'No workspace'} • ${project.start_date || 'No start date'} - ${project.end_date || 'No end date'}`}
                      />
                      <Chip
                        label={project.status}
                        size="small"
                        sx={{ bgcolor: STATUS_COLORS[project.status || 'Not Started'], color: 'white' }}
                      />
                    </ListItemButton>
                  ))
                )}
              </List>
            )}

            {/* Milestones Tab */}
            {activeTab === 3 && (
              <List>
                {searchResults.results.milestones.items.length === 0 ? (
                  <Box sx={{ p: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary">No milestones found</Typography>
                  </Box>
                ) : (
                  searchResults.results.milestones.items.map((milestone) => (
                    <ListItemButton key={milestone.id}>
                      <ListItemIcon>
                        <FlagIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary={milestone.name}
                        secondary={`${milestone.project.name} • ${milestone.start_date || 'No start'} - ${milestone.end_date || 'No end'}`}
                      />
                      <Chip
                        label={milestone.status}
                        size="small"
                        sx={{ bgcolor: STATUS_COLORS[milestone.status || 'Not Started'], color: 'white' }}
                      />
                    </ListItemButton>
                  ))
                )}
              </List>
            )}

            {/* Sprints Tab */}
            {activeTab === 4 && (
              <List>
                {searchResults.results.sprints.items.length === 0 ? (
                  <Box sx={{ p: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary">No sprints found</Typography>
                  </Box>
                ) : (
                  searchResults.results.sprints.items.map((sprint) => (
                    <ListItemButton key={sprint.id}>
                      <ListItemIcon>
                        <SprintIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary={sprint.name}
                        secondary={`${sprint.project.name} • ${sprint.milestone.name}`}
                      />
                      <Chip
                        label={sprint.status}
                        size="small"
                        sx={{ bgcolor: STATUS_COLORS[sprint.status || 'Not Started'], color: 'white' }}
                      />
                    </ListItemButton>
                  ))
                )}
              </List>
            )}

            {/* Users Tab */}
            {activeTab === 5 && (
              <List>
                {searchResults.results.users.items.length === 0 ? (
                  <Box sx={{ p: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary">No users found</Typography>
                  </Box>
                ) : (
                  searchResults.results.users.items.map((user) => (
                    <ListItemButton key={user.id}>
                      <ListItemIcon>
                        <PersonIcon />
                      </ListItemIcon>
                      <ListItemText primary={user.full_name || user.username} secondary={user.email} />
                    </ListItemButton>
                  ))
                )}
              </List>
            )}
          </Paper>
        </>
      )}

      {query.length > 0 && query.length < 2 && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">Enter at least 2 characters to search</Typography>
        </Paper>
      )}
    </Box>
  );
};
