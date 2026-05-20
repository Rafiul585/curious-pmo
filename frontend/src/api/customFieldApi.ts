import { api } from '../utils/api';

export interface CustomFieldDefinition {
  id: number;
  project: number;
  name: string;
  field_type: 'text' | 'number' | 'date' | 'dropdown' | 'checkbox' | 'url';
  options: string[];
  required: boolean;
  order: number;
}

export interface CustomFieldValue {
  id: number | null;
  task: number;
  field: number;
  field_name: string;
  field_type: CustomFieldDefinition['field_type'];
  field_options: string[];
  required: boolean;
  value: unknown;
}

export const customFieldApi = api.injectEndpoints({
  endpoints: (build) => ({
    listCustomFields: build.query<CustomFieldDefinition[], number>({
      query: (projectId) => ({ url: '/custom-fields/', params: { project: projectId } }),
      transformResponse: (r: { results?: CustomFieldDefinition[] } | CustomFieldDefinition[]) =>
        Array.isArray(r) ? r : (r.results ?? []),
      providesTags: (_result, _error, projectId) => [
        { type: 'CustomField' as const, id: `project-${projectId}` },
      ],
    }),

    createCustomField: build.mutation<CustomFieldDefinition, Omit<CustomFieldDefinition, 'id'>>({
      query: (body) => ({ url: '/custom-fields/', method: 'POST', body }),
      invalidatesTags: (_result, _error, { project }) => [
        { type: 'CustomField', id: `project-${project}` },
      ],
    }),

    updateCustomField: build.mutation<CustomFieldDefinition, { id: number; data: Partial<CustomFieldDefinition> }>({
      query: ({ id, data }) => ({ url: `/custom-fields/${id}/`, method: 'PATCH', body: data }),
      invalidatesTags: (result) => result ? [{ type: 'CustomField', id: `project-${result.project}` }] : [],
    }),

    deleteCustomField: build.mutation<void, { id: number; projectId: number }>({
      query: ({ id }) => ({ url: `/custom-fields/${id}/`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: 'CustomField', id: `project-${projectId}` },
        'CustomFieldValue',
      ],
    }),

    getTaskCustomFieldValues: build.query<CustomFieldValue[], number>({
      query: (taskId) => ({ url: `/tasks/${taskId}/custom_field_values/` }),
      providesTags: (_result, _error, taskId) => [
        { type: 'CustomFieldValue' as const, id: `task-${taskId}` },
      ],
    }),

    setCustomFieldValue: build.mutation<CustomFieldValue, { taskId: number; field: number; value: unknown }>({
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

export const {
  useListCustomFieldsQuery,
  useCreateCustomFieldMutation,
  useUpdateCustomFieldMutation,
  useDeleteCustomFieldMutation,
  useGetTaskCustomFieldValuesQuery,
  useSetCustomFieldValueMutation,
} = customFieldApi;
