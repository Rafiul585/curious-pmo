import { api } from '../utils/api';
export const workspaceApi = api.injectEndpoints({
    endpoints: (build) => ({
        // List workspaces
        listWorkspaces: build.query({
            query: () => ({ url: '/workspaces/' }),
            transformResponse: (response) => {
                // Handle both paginated and direct array responses
                if (Array.isArray(response)) {
                    return response;
                }
                return response.results || [];
            },
            providesTags: (result) => result
                ? [...result.map(({ id }) => ({ type: 'Workspace', id })), 'Workspace']
                : ['Workspace'],
        }),
        // Get single workspace detail
        getWorkspace: build.query({
            query: (id) => ({ url: `/workspaces/${id}/` }),
            providesTags: (_result, _error, id) => [{ type: 'Workspace', id }],
        }),
        // Create workspace
        createWorkspace: build.mutation({
            query: (body) => ({ url: '/workspaces/', method: 'POST', body }),
            invalidatesTags: ['Workspace'],
        }),
        // Update workspace
        updateWorkspace: build.mutation({
            query: ({ id, data }) => ({
                url: `/workspaces/${id}/`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: (_result, _error, { id }) => [{ type: 'Workspace', id }, 'Workspace'],
        }),
        // Delete workspace
        deleteWorkspace: build.mutation({
            query: (id) => ({ url: `/workspaces/${id}/`, method: 'DELETE' }),
            invalidatesTags: ['Workspace', 'Project'],
        }),
        // Get my workspaces
        getMyWorkspaces: build.query({
            query: () => ({ url: '/workspaces/my_workspaces/' }),
            providesTags: ['Workspace'],
        }),
        // Get workspace members
        getWorkspaceMembers: build.query({
            query: (id) => ({ url: `/workspaces/${id}/members/` }),
            providesTags: (_result, _error, id) => [{ type: 'Workspace', id }],
        }),
        // Add member to workspace
        addWorkspaceMember: build.mutation({
            query: ({ workspaceId, userId, isAdmin, isGuest }) => ({
                url: `/workspaces/${workspaceId}/add_member/`,
                method: 'POST',
                body: { user_id: userId, is_admin: isAdmin || false, is_guest: isGuest || false },
            }),
            invalidatesTags: (_result, _error, { workspaceId }) => [{ type: 'Workspace', id: workspaceId }],
        }),
        // Remove member from workspace
        removeWorkspaceMember: build.mutation({
            query: ({ workspaceId, userId }) => ({
                url: `/workspaces/${workspaceId}/remove_member/`,
                method: 'POST',
                body: { user_id: userId },
            }),
            invalidatesTags: (_result, _error, { workspaceId }) => [{ type: 'Workspace', id: workspaceId }],
        }),
        // Get workspace projects
        getWorkspaceProjects: build.query({
            query: (id) => ({ url: `/workspaces/${id}/workspace_projects/` }),
            providesTags: (_result, _error, id) => [{ type: 'Workspace', id }, 'Project'],
        }),
        // Grant project access
        grantProjectAccess: build.mutation({
            query: ({ workspaceId, userId, projectId, canView, canEdit }) => ({
                url: `/workspaces/${workspaceId}/grant_project_access/`,
                method: 'POST',
                body: { user_id: userId, project_id: projectId, can_view: canView, can_edit: canEdit },
            }),
            invalidatesTags: (_result, _error, { workspaceId }) => [{ type: 'Workspace', id: workspaceId }],
        }),
        // Revoke project access
        revokeProjectAccess: build.mutation({
            query: ({ workspaceId, userId, projectId }) => ({
                url: `/workspaces/${workspaceId}/revoke_project_access/`,
                method: 'POST',
                body: { user_id: userId, project_id: projectId },
            }),
            invalidatesTags: (_result, _error, { workspaceId }) => [{ type: 'Workspace', id: workspaceId }],
        }),
        // Get member project access list
        getMemberProjectAccess: build.query({
            query: (id) => ({ url: `/workspaces/${id}/member_project_access/` }),
            providesTags: (_result, _error, id) => [{ type: 'Workspace', id }],
        }),
        // Get my memberships (with is_guest flag)
        getMyMemberships: build.query({
            query: () => ({ url: '/workspaces/my_memberships/' }),
            providesTags: ['Workspace'],
        }),
        // Get workspace activity logs
        getWorkspaceActivityLogs: build.query({
            query: ({ workspaceId, limit, action }) => ({
                url: `/workspaces/${workspaceId}/activity_logs/`,
                params: { limit, action },
            }),
            providesTags: (_result, _error, { workspaceId }) => [
                { type: 'Activity', id: `workspace-${workspaceId}` },
            ],
        }),
    }),
});
export const { useListWorkspacesQuery, useGetWorkspaceQuery, useCreateWorkspaceMutation, useUpdateWorkspaceMutation, useDeleteWorkspaceMutation, useGetMyWorkspacesQuery, useGetWorkspaceMembersQuery, useAddWorkspaceMemberMutation, useRemoveWorkspaceMemberMutation, useGetWorkspaceProjectsQuery, useGrantProjectAccessMutation, useRevokeProjectAccessMutation, useGetMemberProjectAccessQuery, useGetMyMembershipsQuery, useGetWorkspaceActivityLogsQuery, } = workspaceApi;
