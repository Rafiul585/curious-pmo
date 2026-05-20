import { api } from '../utils/api';
export const attachmentApi = api.injectEndpoints({
    endpoints: (build) => ({
        // Get attachments for a task
        getTaskAttachments: build.query({
            query: (taskId) => ({ url: '/attachments/task_attachments/', params: { task_id: taskId } }),
            providesTags: (_result, _error, taskId) => [{ type: 'Attachment', id: `task-${taskId}` }],
        }),
        // Upload attachment
        uploadAttachment: build.mutation({
            query: ({ file, task, comment }) => {
                const formData = new FormData();
                formData.append('file', file);
                if (task)
                    formData.append('task', task.toString());
                if (comment)
                    formData.append('comment', comment.toString());
                return {
                    url: '/attachments/',
                    method: 'POST',
                    body: formData,
                };
            },
            invalidatesTags: (_result, _error, { task }) => [
                { type: 'Attachment', id: task ? `task-${task}` : 'LIST' },
                'Task',
            ],
        }),
        // Delete attachment
        deleteAttachment: build.mutation({
            query: ({ id }) => ({ url: `/attachments/${id}/`, method: 'DELETE' }),
            invalidatesTags: (_result, _error, { taskId }) => [
                { type: 'Attachment', id: taskId ? `task-${taskId}` : 'LIST' },
            ],
        }),
    }),
});
export const { useGetTaskAttachmentsQuery, useUploadAttachmentMutation, useDeleteAttachmentMutation, } = attachmentApi;
