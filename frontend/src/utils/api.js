import { createApi, fetchBaseQuery, } from '@reduxjs/toolkit/query/react';
import { logout, setTokens } from '../store/slices/authSlice';
const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
const baseQuery = fetchBaseQuery({
    baseUrl,
    prepareHeaders: (headers, { getState }) => {
        const token = getState().auth.accessToken;
        if (token)
            headers.set('authorization', `Bearer ${token}`);
        return headers;
    },
});
// Enhanced base query with token refresh and error handling
const baseQueryWithReauth = async (args, api, extraOptions) => {
    let result = await baseQuery(args, api, extraOptions);
    // Handle 401 Unauthorized - try to refresh token
    if (result.error && result.error.status === 401) {
        const state = api.getState();
        const refreshToken = state.auth.refreshToken;
        if (refreshToken) {
            // Try to refresh the token
            const refreshResult = await baseQuery({
                url: '/auth/refresh/',
                method: 'POST',
                body: { refresh: refreshToken },
            }, api, extraOptions);
            if (refreshResult.data) {
                // Store the new token
                const data = refreshResult.data;
                api.dispatch(setTokens({ access: data.access }));
                // Retry the original request
                result = await baseQuery(args, api, extraOptions);
            }
            else {
                // Refresh failed - logout user
                api.dispatch(logout());
            }
        }
        else {
            // No refresh token - logout user
            api.dispatch(logout());
        }
    }
    return result;
};
export const api = createApi({
    reducerPath: 'api',
    baseQuery: baseQueryWithReauth,
    tagTypes: [
        'Me',
        'Project',
        'Task',
        'Notification',
        'Gantt',
        'Kanban',
        'Search',
        'Workspace',
        'Milestone',
        'Sprint',
        'Comment',
        'Attachment',
        'Activity',
        'Role',
        'User',
        'TaskDependency',
        'Dashboard',
        'TimeLog',
        'Checklist',
        'ProjectStatus',
        'Tag',
        'CustomField',
        'CustomFieldValue',
        'Automation',
        'Goal',
        'Template',
        'GitIntegration',
        'TaskGitLink',
        'Doc',
    ],
    endpoints: () => ({}),
});
