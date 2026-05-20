import { api } from '../utils/api';
export const checklistApi = api.injectEndpoints({
    endpoints: (build) => ({
        listChecklists: build.query({
            query: (taskId) => ({ url: '/checklists/', params: { task: taskId } }),
            transformResponse: (res) => Array.isArray(res) ? res : (res.results ?? []),
            providesTags: (_r, _e, taskId) => [{ type: 'Checklist', id: taskId }, 'Checklist'],
        }),
        createChecklist: build.mutation({
            query: (body) => ({ url: '/checklists/', method: 'POST', body }),
            invalidatesTags: (_r, _e, { task }) => [{ type: 'Checklist', id: task }, 'Checklist'],
        }),
        deleteChecklist: build.mutation({
            query: ({ id }) => ({ url: `/checklists/${id}/`, method: 'DELETE' }),
            invalidatesTags: (_r, _e, { taskId }) => [{ type: 'Checklist', id: taskId }, 'Checklist'],
        }),
        createChecklistItem: build.mutation({
            query: ({ checklist, text }) => ({ url: '/checklist-items/', method: 'POST', body: { checklist, text } }),
            invalidatesTags: (_r, _e, { taskId }) => [{ type: 'Checklist', id: taskId }, 'Checklist'],
        }),
        updateChecklistItem: build.mutation({
            query: ({ id, is_checked, text }) => ({
                url: `/checklist-items/${id}/`,
                method: 'PATCH',
                body: { ...(is_checked !== undefined && { is_checked }), ...(text !== undefined && { text }) },
            }),
            invalidatesTags: (_r, _e, { taskId }) => [{ type: 'Checklist', id: taskId }, 'Checklist'],
        }),
        deleteChecklistItem: build.mutation({
            query: ({ id }) => ({ url: `/checklist-items/${id}/`, method: 'DELETE' }),
            invalidatesTags: (_r, _e, { taskId }) => [{ type: 'Checklist', id: taskId }, 'Checklist'],
        }),
    }),
});
export const { useListChecklistsQuery, useCreateChecklistMutation, useDeleteChecklistMutation, useCreateChecklistItemMutation, useUpdateChecklistItemMutation, useDeleteChecklistItemMutation, } = checklistApi;
