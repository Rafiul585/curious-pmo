import { api } from '../utils/api';
export const gitApi = api.injectEndpoints({
    endpoints: (build) => ({
        listGitIntegrations: build.query({
            query: (workspaceId) => ({ url: '/git-integrations/', params: { workspace: workspaceId } }),
            providesTags: (_r, _e, workspaceId) => [{ type: 'GitIntegration', id: `ws-${workspaceId}` }],
        }),
        createGitIntegration: build.mutation({
            query: (body) => ({ url: '/git-integrations/', method: 'POST', body }),
            invalidatesTags: (_r, _e, { workspace }) => [{ type: 'GitIntegration', id: `ws-${workspace}` }],
        }),
        deleteGitIntegration: build.mutation({
            query: ({ id }) => ({ url: `/git-integrations/${id}/`, method: 'DELETE' }),
            invalidatesTags: (_r, _e, { workspaceId }) => [{ type: 'GitIntegration', id: `ws-${workspaceId}` }],
        }),
        listTaskGitLinks: build.query({
            query: (taskId) => ({ url: '/task-git-links/', params: { task: taskId } }),
            providesTags: (_r, _e, taskId) => [{ type: 'TaskGitLink', id: `task-${taskId}` }],
        }),
        createTaskGitLink: build.mutation({
            query: (body) => ({ url: '/task-git-links/', method: 'POST', body }),
            invalidatesTags: (_r, _e, { task }) => [{ type: 'TaskGitLink', id: `task-${task}` }],
        }),
        deleteTaskGitLink: build.mutation({
            query: ({ id }) => ({ url: `/task-git-links/${id}/`, method: 'DELETE' }),
            invalidatesTags: (_r, _e, { taskId }) => [{ type: 'TaskGitLink', id: `task-${taskId}` }],
        }),
    }),
});
export const { useListGitIntegrationsQuery, useCreateGitIntegrationMutation, useDeleteGitIntegrationMutation, useListTaskGitLinksQuery, useCreateTaskGitLinkMutation, useDeleteTaskGitLinkMutation, } = gitApi;
