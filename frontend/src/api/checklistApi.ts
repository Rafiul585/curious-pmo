import { api } from '../utils/api';

export interface ChecklistItem {
  id: number;
  checklist: number;
  text: string;
  is_checked: boolean;
  order: number;
}

export interface Checklist {
  id: number;
  task: number;
  title: string;
  order: number;
  items: ChecklistItem[];
  total_items: number;
  checked_items: number;
  created_at: string;
}

export const checklistApi = api.injectEndpoints({
  endpoints: (build) => ({
    listChecklists: build.query<Checklist[], number>({
      query: (taskId) => ({ url: '/checklists/', params: { task: taskId } }),
      transformResponse: (res: { results?: Checklist[] } | Checklist[]) =>
        Array.isArray(res) ? res : (res.results ?? []),
      providesTags: (_r, _e, taskId) => [{ type: 'Checklist' as const, id: taskId }, 'Checklist'],
    }),

    createChecklist: build.mutation<Checklist, { task: number; title: string; order?: number }>({
      query: (body) => ({ url: '/checklists/', method: 'POST', body }),
      invalidatesTags: (_r, _e, { task }) => [{ type: 'Checklist', id: task }, 'Checklist'],
    }),

    deleteChecklist: build.mutation<void, { id: number; taskId: number }>({
      query: ({ id }) => ({ url: `/checklists/${id}/`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, { taskId }) => [{ type: 'Checklist', id: taskId }, 'Checklist'],
    }),

    createChecklistItem: build.mutation<ChecklistItem, { checklist: number; text: string; taskId: number }>({
      query: ({ checklist, text }) => ({ url: '/checklist-items/', method: 'POST', body: { checklist, text } }),
      invalidatesTags: (_r, _e, { taskId }) => [{ type: 'Checklist', id: taskId }, 'Checklist'],
    }),

    updateChecklistItem: build.mutation<ChecklistItem, { id: number; taskId: number; is_checked?: boolean; text?: string }>({
      query: ({ id, is_checked, text }) => ({
        url: `/checklist-items/${id}/`,
        method: 'PATCH',
        body: { ...(is_checked !== undefined && { is_checked }), ...(text !== undefined && { text }) },
      }),
      invalidatesTags: (_r, _e, { taskId }) => [{ type: 'Checklist', id: taskId }, 'Checklist'],
    }),

    deleteChecklistItem: build.mutation<void, { id: number; taskId: number }>({
      query: ({ id }) => ({ url: `/checklist-items/${id}/`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, { taskId }) => [{ type: 'Checklist', id: taskId }, 'Checklist'],
    }),
  }),
});

export const {
  useListChecklistsQuery,
  useCreateChecklistMutation,
  useDeleteChecklistMutation,
  useCreateChecklistItemMutation,
  useUpdateChecklistItemMutation,
  useDeleteChecklistItemMutation,
} = checklistApi;
