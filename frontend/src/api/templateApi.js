import { api } from '../utils/api';
export const templateApi = api.injectEndpoints({
    endpoints: (build) => ({
        listTemplates: build.query({
            query: (workspaceId) => ({ url: '/task-templates/', params: { workspace: workspaceId } }),
            transformResponse: (r) => Array.isArray(r) ? r : (r.results ?? []),
            providesTags: (_result, _error, workspaceId) => [
                { type: 'Template', id: `workspace-${workspaceId}` },
            ],
        }),
        createTemplate: build.mutation({
            query: (body) => ({ url: '/task-templates/', method: 'POST', body }),
            invalidatesTags: (_result, _error, { workspace }) => [
                { type: 'Template', id: `workspace-${workspace}` },
            ],
        }),
        updateTemplate: build.mutation({
            query: ({ id, data }) => ({ url: `/task-templates/${id}/`, method: 'PATCH', body: data }),
            invalidatesTags: (result) => result ? [{ type: 'Template', id: `workspace-${result.workspace}` }] : [],
        }),
        deleteTemplate: build.mutation({
            query: ({ id }) => ({ url: `/task-templates/${id}/`, method: 'DELETE' }),
            invalidatesTags: (_result, _error, { workspaceId }) => [
                { type: 'Template', id: `workspace-${workspaceId}` },
            ],
        }),
        createTaskFromTemplate: build.mutation({
            query: (body) => ({ url: '/tasks/from_template/', method: 'POST', body }),
            invalidatesTags: ['Task'],
        }),
    }),
});
export const { useListTemplatesQuery, useCreateTemplateMutation, useUpdateTemplateMutation, useDeleteTemplateMutation, useCreateTaskFromTemplateMutation, } = templateApi;
