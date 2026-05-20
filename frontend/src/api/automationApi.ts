import { api } from '../utils/api';

export interface AutomationRule {
  id: number;
  project: number;
  name: string;
  trigger: 'status_change' | 'due_date_passed' | 'task_created' | 'assignee_changed';
  trigger_display: string;
  conditions: Record<string, string>;
  action: 'send_notification' | 'change_status' | 'change_priority' | 'assign_to';
  action_display: string;
  action_params: Record<string, string | number>;
  is_active: boolean;
  created_at: string;
}

export type CreateAutomationRule = Omit<AutomationRule, 'id' | 'trigger_display' | 'action_display' | 'created_at'>;

export const automationApi = api.injectEndpoints({
  endpoints: (build) => ({
    listAutomations: build.query<AutomationRule[], number>({
      query: (projectId) => ({ url: '/automations/', params: { project: projectId } }),
      transformResponse: (r: { results?: AutomationRule[] } | AutomationRule[]) =>
        Array.isArray(r) ? r : (r.results ?? []),
      providesTags: (_result, _error, projectId) => [
        { type: 'Automation' as const, id: `project-${projectId}` },
      ],
    }),

    createAutomation: build.mutation<AutomationRule, CreateAutomationRule>({
      query: (body) => ({ url: '/automations/', method: 'POST', body }),
      invalidatesTags: (_result, _error, { project }) => [
        { type: 'Automation', id: `project-${project}` },
      ],
    }),

    updateAutomation: build.mutation<AutomationRule, { id: number; data: Partial<CreateAutomationRule> }>({
      query: ({ id, data }) => ({ url: `/automations/${id}/`, method: 'PATCH', body: data }),
      invalidatesTags: (result) =>
        result ? [{ type: 'Automation', id: `project-${result.project}` }] : [],
    }),

    deleteAutomation: build.mutation<void, { id: number; projectId: number }>({
      query: ({ id }) => ({ url: `/automations/${id}/`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: 'Automation', id: `project-${projectId}` },
      ],
    }),
  }),
});

export const {
  useListAutomationsQuery,
  useCreateAutomationMutation,
  useUpdateAutomationMutation,
  useDeleteAutomationMutation,
} = automationApi;
