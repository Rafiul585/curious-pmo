import { api } from '../utils/api';

export interface TaskTemplate {
  id: number;
  workspace: number;
  name: string;
  description: string;
  default_priority: 'Low' | 'Medium' | 'High' | 'Critical';
  default_tags: number[];
  default_tags_details: { id: number; name: string; color: string }[];
  checklist_items: { text: string; is_checked: boolean }[];
  custom_field_defaults: Record<string, unknown>;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
}

export type CreateTaskTemplate = Pick<
  TaskTemplate,
  'workspace' | 'name' | 'description' | 'default_priority' | 'default_tags' | 'checklist_items' | 'custom_field_defaults'
>;

export const templateApi = api.injectEndpoints({
  endpoints: (build) => ({
    listTemplates: build.query<TaskTemplate[], number>({
      query: (workspaceId) => ({ url: '/task-templates/', params: { workspace: workspaceId } }),
      transformResponse: (r: { results?: TaskTemplate[] } | TaskTemplate[]) =>
        Array.isArray(r) ? r : (r.results ?? []),
      providesTags: (_result, _error, workspaceId) => [
        { type: 'Template' as const, id: `workspace-${workspaceId}` },
      ],
    }),

    createTemplate: build.mutation<TaskTemplate, CreateTaskTemplate>({
      query: (body) => ({ url: '/task-templates/', method: 'POST', body }),
      invalidatesTags: (_result, _error, { workspace }) => [
        { type: 'Template', id: `workspace-${workspace}` },
      ],
    }),

    updateTemplate: build.mutation<TaskTemplate, { id: number; data: Partial<CreateTaskTemplate> }>({
      query: ({ id, data }) => ({ url: `/task-templates/${id}/`, method: 'PATCH', body: data }),
      invalidatesTags: (result) =>
        result ? [{ type: 'Template', id: `workspace-${result.workspace}` }] : [],
    }),

    deleteTemplate: build.mutation<void, { id: number; workspaceId: number }>({
      query: ({ id }) => ({ url: `/task-templates/${id}/`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, { workspaceId }) => [
        { type: 'Template', id: `workspace-${workspaceId}` },
      ],
    }),

    createTaskFromTemplate: build.mutation<
      { id: number; title: string },
      { template_id: number; title: string; sprint: number }
    >({
      query: (body) => ({ url: '/tasks/from_template/', method: 'POST', body }),
      invalidatesTags: ['Task'],
    }),
  }),
});

export const {
  useListTemplatesQuery,
  useCreateTemplateMutation,
  useUpdateTemplateMutation,
  useDeleteTemplateMutation,
  useCreateTaskFromTemplateMutation,
} = templateApi;
