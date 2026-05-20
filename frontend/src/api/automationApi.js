import { api } from '../utils/api';
export const automationApi = api.injectEndpoints({
    endpoints: (build) => ({
        listAutomations: build.query({
            query: (projectId) => ({ url: '/automations/', params: { project: projectId } }),
            transformResponse: (r) => Array.isArray(r) ? r : (r.results ?? []),
            providesTags: (_result, _error, projectId) => [
                { type: 'Automation', id: `project-${projectId}` },
            ],
        }),
        createAutomation: build.mutation({
            query: (body) => ({ url: '/automations/', method: 'POST', body }),
            invalidatesTags: (_result, _error, { project }) => [
                { type: 'Automation', id: `project-${project}` },
            ],
        }),
        updateAutomation: build.mutation({
            query: ({ id, data }) => ({ url: `/automations/${id}/`, method: 'PATCH', body: data }),
            invalidatesTags: (result) => result ? [{ type: 'Automation', id: `project-${result.project}` }] : [],
        }),
        deleteAutomation: build.mutation({
            query: ({ id }) => ({ url: `/automations/${id}/`, method: 'DELETE' }),
            invalidatesTags: (_result, _error, { projectId }) => [
                { type: 'Automation', id: `project-${projectId}` },
            ],
        }),
    }),
});
export const { useListAutomationsQuery, useCreateAutomationMutation, useUpdateAutomationMutation, useDeleteAutomationMutation, } = automationApi;
