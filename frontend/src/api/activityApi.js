import { api } from '../utils/api';
export const activityApi = api.injectEndpoints({
    endpoints: (build) => ({
        // List all activity logs
        listActivityLogs: build.query({
            query: (params) => ({ url: '/activity/', params: params || {} }),
            providesTags: ['Activity'],
        }),
        // Get my activity
        getMyActivity: build.query({
            query: (params) => ({ url: '/activity/my_activity/', params: params || {} }),
            providesTags: ['Activity'],
        }),
        // Get recent activity
        getRecentActivity: build.query({
            query: (params) => ({ url: '/activity/recent/', params: params || {} }),
            providesTags: ['Activity'],
        }),
        // Get activity by entity type
        getActivityByEntity: build.query({
            query: (params) => ({ url: '/activity/by_entity/', params }),
            providesTags: ['Activity'],
        }),
        // Get activity by workspace
        getActivityByWorkspace: build.query({
            query: (params) => ({ url: '/activity/by_workspace/', params }),
            providesTags: ['Activity'],
        }),
        // Get activity by project
        getActivityByProject: build.query({
            query: (params) => ({ url: '/activity/by_project/', params }),
            providesTags: ['Activity'],
        }),
        // Get activity by user
        getActivityByUser: build.query({
            query: (params) => ({ url: '/activity/by_user/', params }),
            providesTags: ['Activity'],
        }),
        // Get activity by action type
        getActivityByAction: build.query({
            query: (params) => ({ url: '/activity/by_action/', params }),
            providesTags: ['Activity'],
        }),
        // Get activity by date range
        getActivityByDateRange: build.query({
            query: (params) => ({ url: '/activity/by_date_range/', params }),
            providesTags: ['Activity'],
        }),
        // Get available action types
        getActionTypes: build.query({
            query: () => ({ url: '/activity/action_types/' }),
        }),
        // Get available entity types
        getEntityTypes: build.query({
            query: () => ({ url: '/activity/entity_types/' }),
        }),
        // Get activity summary
        getActivitySummary: build.query({
            query: (params) => ({ url: '/activity/summary/', params: params || {} }),
            providesTags: ['Activity'],
        }),
    }),
});
export const { useListActivityLogsQuery, useGetMyActivityQuery, useGetRecentActivityQuery, useGetActivityByEntityQuery, useGetActivityByWorkspaceQuery, useGetActivityByProjectQuery, useGetActivityByUserQuery, useGetActivityByActionQuery, useGetActivityByDateRangeQuery, useGetActionTypesQuery, useGetEntityTypesQuery, useGetActivitySummaryQuery, } = activityApi;
