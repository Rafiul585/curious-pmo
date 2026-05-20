import { api } from '../utils/api';
export const customFieldApi = api.injectEndpoints({
    endpoints: (build) => ({
        listCustomFields: build.query({
            query: (projectId) => ({ url: '/custom-fields/', params: { project: projectId } }),
            transformResponse: (r) => Array.isArray(r) ? r : (r.results ?? []),
            providesTags: (_result, _error, projectId) => [
                { type: 'CustomField', id: `project-${projectId}` },
            ],
        }),
        createCustomField: build.mutation({
            query: (body) => ({ url: '/custom-fields/', method: 'POST', body }),
            invalidatesTags: (_result, _error, { project }) => [
                { type: 'CustomField', id: `project-${project}` },
            ],
        }),
        updateCustomField: build.mutation({
            query: ({ id, data }) => ({ url: `/custom-fields/${id}/`, method: 'PATCH', body: data }),
            invalidatesTags: (result) => result ? [{ type: 'CustomField', id: `project-${result.project}` }] : [],
        }),
        deleteCustomField: build.mutation({
            query: ({ id }) => ({ url: `/custom-fields/${id}/`, method: 'DELETE' }),
            invalidatesTags: (_result, _error, { projectId }) => [
                { type: 'CustomField', id: `project-${projectId}` },
                'CustomFieldValue',
            ],
        }),
        getTaskCustomFieldValues: build.query({
            query: (taskId) => ({ url: `/tasks/${taskId}/custom_field_values/` }),
            providesTags: (_result, _error, taskId) => [
                { type: 'CustomFieldValue', id: `task-${taskId}` },
            ],
        }),
        setCustomFieldValue: build.mutation({
            query: ({ taskId, field, value }) => ({
                url: `/tasks/${taskId}/custom_field_values/`,
                method: 'POST',
                body: { field, value },
            }),
            invalidatesTags: (_result, _error, { taskId }) => [
                { type: 'CustomFieldValue', id: `task-${taskId}` },
            ],
        }),
    }),
});
export const { useListCustomFieldsQuery, useCreateCustomFieldMutation, useUpdateCustomFieldMutation, useDeleteCustomFieldMutation, useGetTaskCustomFieldValuesQuery, useSetCustomFieldValueMutation, } = customFieldApi;
