import { api } from '../utils/api';

export interface Attachment {
  id: number;
  file: string;
  file_url: string;
  filename: string;
  file_size: number;
  uploaded_at: string;
  uploaded_by: number;
  uploaded_by_name: string;
  comment?: number;
  task?: number;
}

export const attachmentApi = api.injectEndpoints({
  endpoints: (build) => ({
    // Get attachments for a task
    getTaskAttachments: build.query<Attachment[], number>({
      query: (taskId) => ({ url: '/attachments/task_attachments/', params: { task_id: taskId } }),
      providesTags: (_result, _error, taskId) => [{ type: 'Attachment', id: `task-${taskId}` }],
    }),

    // Upload attachment
    uploadAttachment: build.mutation<Attachment, { file: File; task?: number; comment?: number }>({
      query: ({ file, task, comment }) => {
        const formData = new FormData();
        formData.append('file', file);
        if (task) formData.append('task', task.toString());
        if (comment) formData.append('comment', comment.toString());
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
    deleteAttachment: build.mutation<void, { id: number; taskId?: number }>({
      query: ({ id }) => ({ url: `/attachments/${id}/`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, { taskId }) => [
        { type: 'Attachment', id: taskId ? `task-${taskId}` : 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetTaskAttachmentsQuery,
  useUploadAttachmentMutation,
  useDeleteAttachmentMutation,
} = attachmentApi;
