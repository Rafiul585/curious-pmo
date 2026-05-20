import { api } from '../utils/api';
export const projectApi = api.injectEndpoints({
    endpoints: (build) => ({
        // List all projects
        listProjects: build.query({
            query: (params) => ({ url: '/projects/', params: params || {} }),
            transformResponse: (response) => {
                if (Array.isArray(response)) {
                    return response;
                }
                return response.results || [];
            },
            providesTags: (result) => result
                ? [...result.map(({ id }) => ({ type: 'Project', id })), 'Project']
                : ['Project'],
        }),
        // Get single project detail
        getProject: build.query({
            query: (id) => ({ url: `/projects/${id}/` }),
            providesTags: (_result, _error, id) => [{ type: 'Project', id }],
        }),
        // Create project
        createProject: build.mutation({
            query: (body) => ({ url: '/projects/', method: 'POST', body }),
            invalidatesTags: ['Project', 'Workspace'],
        }),
        // Update project
        updateProject: build.mutation({
            query: ({ id, data }) => ({
                url: `/projects/${id}/`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: (_result, _error, { id }) => [{ type: 'Project', id }, 'Project'],
        }),
        // Delete project
        deleteProject: build.mutation({
            query: (id) => ({ url: `/projects/${id}/`, method: 'DELETE' }),
            invalidatesTags: ['Project', 'Workspace'],
        }),
        // Get my projects
        getMyProjects: build.query({
            query: () => ({ url: '/projects/my_projects/' }),
            providesTags: ['Project'],
        }),
        // Add member to project
        addProjectMember: build.mutation({
            query: ({ projectId, userId, roleId }) => ({
                url: `/projects/${projectId}/add_member/`,
                method: 'POST',
                body: { user_id: userId, role_id: roleId },
            }),
            invalidatesTags: (_result, _error, { projectId }) => [
                { type: 'Project', id: projectId },
                'Project',
            ],
        }),
        // Remove member from project
        removeProjectMember: build.mutation({
            query: ({ projectId, userId }) => ({
                url: `/projects/${projectId}/remove_member/`,
                method: 'POST',
                body: { user_id: userId },
            }),
            invalidatesTags: (_result, _error, { projectId }) => [
                { type: 'Project', id: projectId },
                'Project',
            ],
        }),
        // Get project activity logs
        getProjectActivityLogs: build.query({
            query: ({ projectId, limit, action }) => ({
                url: `/projects/${projectId}/activity_logs/`,
                params: { limit, action },
            }),
            providesTags: (_result, _error, { projectId }) => [
                { type: 'Activity', id: `project-${projectId}` },
            ],
        }),
        // Get available workspace members (not yet in project)
        getAvailableMembers: build.query({
            query: (projectId) => ({
                url: `/projects/${projectId}/available_members/`,
            }),
            providesTags: (_result, _error, projectId) => [{ type: 'Project', id: projectId }],
        }),
    }),
});
export const { useListProjectsQuery, useGetProjectQuery, useCreateProjectMutation, useUpdateProjectMutation, useDeleteProjectMutation, useGetMyProjectsQuery, useAddProjectMemberMutation, useRemoveProjectMemberMutation, useGetProjectActivityLogsQuery, useGetAvailableMembersQuery, } = projectApi;
