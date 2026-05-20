import { api } from '../utils/api';
export const dashboardApi = api.injectEndpoints({
    endpoints: (build) => ({
        // Get user dashboard overview
        getDashboardOverview: build.query({
            query: () => ({ url: '/dashboard/overview/' }),
            providesTags: ['Dashboard', 'Task', 'Project'],
        }),
        // Get my tasks summary for dashboard
        getMyTasksSummary: build.query({
            query: () => ({ url: '/dashboard/my_tasks/' }),
            providesTags: ['Dashboard', 'Task'],
        }),
        // Admin dashboard overview
        getAdminOverview: build.query({
            query: () => ({ url: '/dashboard/admin_overview/' }),
            providesTags: ['Dashboard'],
        }),
        // Workspace overview
        getWorkspaceOverview: build.query({
            query: (workspaceId) => ({ url: '/dashboard/workspace_overview/', params: { workspace_id: workspaceId } }),
            providesTags: (_result, _error, id) => [{ type: 'Dashboard', id: `workspace-${id}` }],
        }),
        // Project overview
        getProjectOverview: build.query({
            query: (projectId) => ({ url: '/dashboard/project_overview/', params: { project_id: projectId } }),
            providesTags: (_result, _error, id) => [{ type: 'Dashboard', id: `project-${id}` }],
        }),
        // Milestone overview
        getMilestoneOverview: build.query({
            query: (milestoneId) => ({ url: '/dashboard/milestone_overview/', params: { milestone_id: milestoneId } }),
            providesTags: (_result, _error, id) => [{ type: 'Dashboard', id: `milestone-${id}` }],
        }),
        // Sprint overview
        getSprintOverview: build.query({
            query: (sprintId) => ({ url: '/dashboard/sprint_overview/', params: { sprint_id: sprintId } }),
            providesTags: (_result, _error, id) => [{ type: 'Dashboard', id: `sprint-${id}` }],
        }),
        // Task overview (for task detail)
        getTaskOverview: build.query({
            query: (taskId) => ({ url: '/dashboard/task_overview/', params: { task_id: taskId } }),
            providesTags: (_result, _error, id) => [{ type: 'Dashboard', id: `task-${id}` }],
        }),
        // Upcoming deadlines
        getUpcomingDeadlines: build.query({
            query: () => ({ url: '/dashboard/upcoming_deadlines/' }),
            providesTags: ['Dashboard', 'Task'],
        }),
        // Team workload
        getTeamWorkload: build.query({
            query: () => ({ url: '/dashboard/team_workload/' }),
            providesTags: ['Dashboard', 'Task'],
        }),
        // Workload calendar (per-day breakdown for dedicated page)
        getWorkloadCalendar: build.query({
            query: ({ start, end }) => ({
                url: '/dashboard/team_workload/',
                params: { start, end },
            }),
            providesTags: ['Dashboard', 'Task'],
        }),
        // Projects progress
        getProjectsProgress: build.query({
            query: () => ({ url: '/dashboard/projects_progress/' }),
            providesTags: ['Dashboard', 'Project'],
        }),
        // Active sprints
        getActiveSprints: build.query({
            query: () => ({ url: '/dashboard/active_sprints/' }),
            providesTags: ['Dashboard', 'Task'],
        }),
        // Task completion trend
        getTaskCompletionTrend: build.query({
            query: () => ({ url: '/dashboard/task_completion_trend/' }),
            providesTags: ['Dashboard', 'Task'],
        }),
        // Notifications
        getNotifications: build.query({
            query: () => ({ url: '/dashboard/notifications/' }),
            providesTags: ['Dashboard', 'Task'],
        }),
        // Recently viewed
        getRecentlyViewed: build.query({
            query: () => ({ url: '/dashboard/recently_viewed/' }),
            providesTags: ['Dashboard'],
        }),
        // Time tracking summary
        getTimeTrackingSummary: build.query({
            query: () => ({ url: '/dashboard/time_tracking_summary/' }),
            providesTags: ['Dashboard', 'Task'],
        }),
        // User workspaces
        getUserWorkspaces: build.query({
            query: () => ({ url: '/dashboard/user_workspaces/' }),
            providesTags: ['Dashboard', 'Workspace'],
        }),
        // Milestone progress
        getMilestoneProgress: build.query({
            query: (filters) => ({
                url: '/dashboard/milestone_progress/',
                params: filters || {},
            }),
            providesTags: ['Dashboard', 'Project'],
        }),
        // Filter options
        getFilterOptions: build.query({
            query: () => ({ url: '/dashboard/filter_options/' }),
            providesTags: ['Dashboard'],
        }),
        // Filtered overview
        getFilteredOverview: build.query({
            query: (filters) => ({
                url: '/dashboard/filtered_overview/',
                params: filters,
            }),
            providesTags: ['Dashboard', 'Task', 'Project'],
        }),
        // Velocity (D7)
        getVelocity: build.query({
            query: ({ projectId, lastNSprints = 6 }) => ({
                url: '/dashboard/velocity/',
                params: { project: projectId, last_n_sprints: lastNSprints },
            }),
            providesTags: (_r, _e, { projectId }) => [{ type: 'Dashboard', id: `velocity-${projectId}` }],
        }),
        // Cumulative Flow (D7)
        getCumulativeFlow: build.query({
            query: ({ projectId, days = 60 }) => ({
                url: '/dashboard/cumulative_flow/',
                params: { project: projectId, days },
            }),
            providesTags: (_r, _e, { projectId }) => [{ type: 'Dashboard', id: `cumflow-${projectId}` }],
        }),
        // Cycle Time (D7)
        getCycleTime: build.query({
            query: (projectId) => ({
                url: '/dashboard/cycle_time/',
                params: { project: projectId },
            }),
            providesTags: (_r, _e, projectId) => [{ type: 'Dashboard', id: `cycletime-${projectId}` }],
        }),
    }),
});
export const { useGetDashboardOverviewQuery, useGetMyTasksSummaryQuery, useGetAdminOverviewQuery, useGetWorkspaceOverviewQuery, useGetProjectOverviewQuery, useGetMilestoneOverviewQuery, useGetSprintOverviewQuery, useGetTaskOverviewQuery, useGetUpcomingDeadlinesQuery, useGetTeamWorkloadQuery, useGetProjectsProgressQuery, useGetActiveSprintsQuery, useGetTaskCompletionTrendQuery, useGetNotificationsQuery, useGetRecentlyViewedQuery, useGetTimeTrackingSummaryQuery, useGetUserWorkspacesQuery, useGetMilestoneProgressQuery, useGetFilterOptionsQuery, useGetFilteredOverviewQuery, useGetWorkloadCalendarQuery, useGetVelocityQuery, useGetCumulativeFlowQuery, useGetCycleTimeQuery, } = dashboardApi;
