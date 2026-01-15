import { api } from '../utils/api';

export interface DashboardOverview {
  total_projects: number;
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  overdue_tasks: number;
  tasks_by_status: Record<string, number>;
  tasks_by_priority: Record<string, number>;
  recent_activity: {
    id: number;
    action: string;
    object_repr: string;
    timestamp: string;
  }[];
}

export interface MyTasksSummary {
  total: number;
  by_status: Record<string, number>;
  by_priority: Record<string, number>;
  overdue: number;
  due_this_week: number;
  tasks: {
    id: number;
    title: string;
    status: string;
    priority: string;
    due_date?: string;
    project_name?: string;
  }[];
}

export interface UpcomingDeadlineTask {
  id: number;
  title: string;
  status: string;
  priority: string;
  due_date: string;
  days_until_due: number;
  project_name?: string;
  assignee?: {
    id: number;
    username: string;
    initials: string;
  };
}

export interface UpcomingDeadlines {
  total: number;
  due_today: UpcomingDeadlineTask[];
  due_tomorrow: UpcomingDeadlineTask[];
  due_this_week: UpcomingDeadlineTask[];
  tasks: UpcomingDeadlineTask[];
}

export interface TeamMember {
  id: number;
  username: string;
  email: string;
  initials: string;
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  todo_tasks: number;
  overdue_tasks: number;
  completion_rate: number;
}

export interface TeamWorkload {
  team_members: TeamMember[];
  total_members: number;
  total_assigned_tasks: number;
  total_unassigned_tasks: number;
}

export interface ProjectProgress {
  id: number;
  name: string;
  status: string;
  start_date?: string;
  end_date?: string;
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  overdue_tasks: number;
  completion_percentage: number;
}

export interface ProjectsProgress {
  projects: ProjectProgress[];
  total_projects: number;
}

// Active Sprints
export interface ActiveSprint {
  id: number;
  name: string;
  project_name?: string;
  milestone_name?: string;
  start_date?: string;
  end_date?: string;
  days_remaining?: number;
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  todo_tasks: number;
  completion_percentage: number;
}

export interface ActiveSprints {
  sprints: ActiveSprint[];
  total_active: number;
}

// Task Completion Trend
export interface WeekData {
  week: string;
  week_start: string;
  week_end: string;
  completed: number;
  created: number;
}

export interface TaskCompletionTrend {
  weeks: WeekData[];
  total_completed: number;
  total_created: number;
  trend: 'up' | 'down';
}

// Notifications
export interface Notification {
  id: string;
  type: 'assignment' | 'overdue' | 'due_today' | 'mention';
  title: string;
  message: string;
  project_name?: string;
  task_id?: number;
  timestamp: string;
  read: boolean;
}

export interface Notifications {
  notifications: Notification[];
  total: number;
  unread_count: number;
}

// Recently Viewed
export interface RecentItem {
  id: number;
  type: string;
  name: string;
  action: string;
  status?: string;
  timestamp: string;
}

export interface RecentlyViewed {
  items: RecentItem[];
  total: number;
}

// Time Tracking Summary
export interface ProjectTimeData {
  project_name: string;
  estimated_hours: number;
  logged_hours: number;
  tasks_count: number;
  utilization: number;
}

export interface TimeTrackingSummary {
  total_estimated_hours: number;
  total_logged_hours: number;
  utilization_percentage: number;
  projects: ProjectTimeData[];
  total_projects: number;
}

// User Workspaces
export interface UserWorkspace {
  id: number;
  name: string;
  description?: string;
  is_owner: boolean;
  projects_count: number;
  created_at: string;
}

export interface UserWorkspaces {
  workspaces: UserWorkspace[];
  total: number;
}

// Milestone Progress
export interface MilestoneProgress {
  id: number;
  name: string;
  project_name: string;
  project_id: number;
  status: string;
  start_date?: string;
  end_date?: string;
  days_remaining?: number;
  is_overdue: boolean;
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  overdue_tasks: number;
  completion_percentage: number;
}

export interface MilestoneProgressResponse {
  milestones: MilestoneProgress[];
  total: number;
}

// Filter Options
export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterOptions {
  workspaces: { id: number; name: string }[];
  projects: { id: number; name: string; workspace_id: number }[];
  assignees: { id: number; username: string; email: string }[];
  statuses: FilterOption[];
  priorities: FilterOption[];
  date_ranges: FilterOption[];
}

// Filtered Overview
export interface FilteredOverview {
  filters_applied: {
    workspace_id?: string;
    project_id?: string;
    assignee_id?: string;
    status?: string;
    priority?: string;
    date_range?: string;
  };
  total_projects: number;
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  overdue_tasks: number;
  tasks_by_status: Record<string, number>;
  tasks_by_priority: Record<string, number>;
  tasks_by_assignee: { assignee__id: number; assignee__username: string; total: number; completed: number }[];
}

// Dashboard Filters
export interface DashboardFilters {
  workspace_id?: string;
  project_id?: string;
  assignee_id?: string;
  status?: string;
  priority?: string;
  date_range?: string;
}

export interface AdminOverview extends DashboardOverview {
  total_users: number;
  active_users: number;
  total_workspaces: number;
  users_by_role: Record<string, number>;
}

export interface WorkspaceOverview {
  workspace_id: number;
  workspace_name: string;
  total_projects: number;
  total_members: number;
  projects: {
    id: number;
    name: string;
    status: string;
    tasks_count: number;
    completed_tasks: number;
  }[];
}

export interface ProjectOverview {
  project_id: number;
  project_name: string;
  status: string;
  progress: number;
  total_tasks: number;
  completed_tasks: number;
  milestones: {
    id: number;
    name: string;
    status: string;
    progress: number;
  }[];
  team_members: {
    id: number;
    username: string;
    tasks_count: number;
  }[];
}

export const dashboardApi = api.injectEndpoints({
  endpoints: (build) => ({
    // Get user dashboard overview
    getDashboardOverview: build.query<DashboardOverview, void>({
      query: () => ({ url: '/dashboard/overview/' }),
      providesTags: ['Dashboard', 'Task', 'Project'],
    }),

    // Get my tasks summary for dashboard
    getMyTasksSummary: build.query<MyTasksSummary, void>({
      query: () => ({ url: '/dashboard/my_tasks/' }),
      providesTags: ['Dashboard', 'Task'],
    }),

    // Admin dashboard overview
    getAdminOverview: build.query<AdminOverview, void>({
      query: () => ({ url: '/dashboard/admin_overview/' }),
      providesTags: ['Dashboard'],
    }),

    // Workspace overview
    getWorkspaceOverview: build.query<WorkspaceOverview, number>({
      query: (workspaceId) => ({ url: '/dashboard/workspace_overview/', params: { workspace_id: workspaceId } }),
      providesTags: (_result, _error, id) => [{ type: 'Dashboard', id: `workspace-${id}` }],
    }),

    // Project overview
    getProjectOverview: build.query<ProjectOverview, number>({
      query: (projectId) => ({ url: '/dashboard/project_overview/', params: { project_id: projectId } }),
      providesTags: (_result, _error, id) => [{ type: 'Dashboard', id: `project-${id}` }],
    }),

    // Milestone overview
    getMilestoneOverview: build.query<{
      milestone_id: number;
      milestone_name: string;
      progress: number;
      sprints: { id: number; name: string; status: string; progress: number }[];
    }, number>({
      query: (milestoneId) => ({ url: '/dashboard/milestone_overview/', params: { milestone_id: milestoneId } }),
      providesTags: (_result, _error, id) => [{ type: 'Dashboard', id: `milestone-${id}` }],
    }),

    // Sprint overview
    getSprintOverview: build.query<{
      sprint_id: number;
      sprint_name: string;
      progress: number;
      tasks_by_status: Record<string, number>;
      burndown_data?: { date: string; remaining: number }[];
    }, number>({
      query: (sprintId) => ({ url: '/dashboard/sprint_overview/', params: { sprint_id: sprintId } }),
      providesTags: (_result, _error, id) => [{ type: 'Dashboard', id: `sprint-${id}` }],
    }),

    // Task overview (for task detail)
    getTaskOverview: build.query<{
      task_id: number;
      task_title: string;
      time_spent: number;
      comments_count: number;
      attachments_count: number;
      activity_count: number;
    }, number>({
      query: (taskId) => ({ url: '/dashboard/task_overview/', params: { task_id: taskId } }),
      providesTags: (_result, _error, id) => [{ type: 'Dashboard', id: `task-${id}` }],
    }),

    // Upcoming deadlines
    getUpcomingDeadlines: build.query<UpcomingDeadlines, void>({
      query: () => ({ url: '/dashboard/upcoming_deadlines/' }),
      providesTags: ['Dashboard', 'Task'],
    }),

    // Team workload
    getTeamWorkload: build.query<TeamWorkload, void>({
      query: () => ({ url: '/dashboard/team_workload/' }),
      providesTags: ['Dashboard', 'Task'],
    }),

    // Projects progress
    getProjectsProgress: build.query<ProjectsProgress, void>({
      query: () => ({ url: '/dashboard/projects_progress/' }),
      providesTags: ['Dashboard', 'Project'],
    }),

    // Active sprints
    getActiveSprints: build.query<ActiveSprints, void>({
      query: () => ({ url: '/dashboard/active_sprints/' }),
      providesTags: ['Dashboard', 'Task'],
    }),

    // Task completion trend
    getTaskCompletionTrend: build.query<TaskCompletionTrend, void>({
      query: () => ({ url: '/dashboard/task_completion_trend/' }),
      providesTags: ['Dashboard', 'Task'],
    }),

    // Notifications
    getNotifications: build.query<Notifications, void>({
      query: () => ({ url: '/dashboard/notifications/' }),
      providesTags: ['Dashboard', 'Task'],
    }),

    // Recently viewed
    getRecentlyViewed: build.query<RecentlyViewed, void>({
      query: () => ({ url: '/dashboard/recently_viewed/' }),
      providesTags: ['Dashboard'],
    }),

    // Time tracking summary
    getTimeTrackingSummary: build.query<TimeTrackingSummary, void>({
      query: () => ({ url: '/dashboard/time_tracking_summary/' }),
      providesTags: ['Dashboard', 'Task'],
    }),

    // User workspaces
    getUserWorkspaces: build.query<UserWorkspaces, void>({
      query: () => ({ url: '/dashboard/user_workspaces/' }),
      providesTags: ['Dashboard', 'Workspace'],
    }),

    // Milestone progress
    getMilestoneProgress: build.query<MilestoneProgressResponse, DashboardFilters | void>({
      query: (filters) => ({
        url: '/dashboard/milestone_progress/',
        params: filters || {},
      }),
      providesTags: ['Dashboard', 'Project'],
    }),

    // Filter options
    getFilterOptions: build.query<FilterOptions, void>({
      query: () => ({ url: '/dashboard/filter_options/' }),
      providesTags: ['Dashboard'],
    }),

    // Filtered overview
    getFilteredOverview: build.query<FilteredOverview, DashboardFilters>({
      query: (filters) => ({
        url: '/dashboard/filtered_overview/',
        params: filters,
      }),
      providesTags: ['Dashboard', 'Task', 'Project'],
    }),
  }),
});

export const {
  useGetDashboardOverviewQuery,
  useGetMyTasksSummaryQuery,
  useGetAdminOverviewQuery,
  useGetWorkspaceOverviewQuery,
  useGetProjectOverviewQuery,
  useGetMilestoneOverviewQuery,
  useGetSprintOverviewQuery,
  useGetTaskOverviewQuery,
  useGetUpcomingDeadlinesQuery,
  useGetTeamWorkloadQuery,
  useGetProjectsProgressQuery,
  useGetActiveSprintsQuery,
  useGetTaskCompletionTrendQuery,
  useGetNotificationsQuery,
  useGetRecentlyViewedQuery,
  useGetTimeTrackingSummaryQuery,
  useGetUserWorkspacesQuery,
  useGetMilestoneProgressQuery,
  useGetFilterOptionsQuery,
  useGetFilteredOverviewQuery,
} = dashboardApi;
