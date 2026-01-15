import { api } from '../utils/api';

export interface CommentAuthor {
  id: number;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
}

export interface Comment {
  id: number;
  content: string;
  author: CommentAuthor;
  task?: number;
  sprint?: number;
  project?: number;
  parent?: number;
  replies_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CommentDetail extends Comment {
  replies?: Comment[];
  task_title?: string;
  sprint_name?: string;
  project_name?: string;
}

export interface CreateCommentData {
  content: string;
  task?: number;
  sprint?: number;
  project?: number;
  parent?: number;
}

export const commentApi = api.injectEndpoints({
  endpoints: (build) => ({
    // List comments with filters
    listComments: build.query<Comment[], { task?: number; sprint?: number; project?: number } | void>({
      query: (params) => ({ url: '/comments/', params: params || {} }),
      providesTags: (result) =>
        result
          ? [...result.map(({ id }) => ({ type: 'Comment' as const, id })), 'Comment']
          : ['Comment'],
    }),

    // Get single comment
    getComment: build.query<CommentDetail, number>({
      query: (id) => ({ url: `/comments/${id}/` }),
      providesTags: (_result, _error, id) => [{ type: 'Comment', id }],
    }),

    // Create comment
    createComment: build.mutation<Comment, CreateCommentData>({
      query: (body) => ({ url: '/comments/', method: 'POST', body }),
      invalidatesTags: ['Comment', 'Task', 'Sprint', 'Project'],
    }),

    // Update comment
    updateComment: build.mutation<Comment, { id: number; content: string }>({
      query: ({ id, content }) => ({
        url: `/comments/${id}/`,
        method: 'PATCH',
        body: { content },
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Comment', id }, 'Comment'],
    }),

    // Delete comment
    deleteComment: build.mutation<void, number>({
      query: (id) => ({ url: `/comments/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['Comment'],
    }),

    // Get my comments
    getMyComments: build.query<Comment[], void>({
      query: () => ({ url: '/comments/my_comments/' }),
      providesTags: ['Comment'],
    }),

    // Get task comments
    getTaskComments: build.query<Comment[], number>({
      query: (taskId) => ({ url: '/comments/task_comments/', params: { task_id: taskId } }),
      providesTags: (_result, _error, taskId) => [{ type: 'Comment', id: `task-${taskId}` }],
    }),

    // Get sprint comments
    getSprintComments: build.query<Comment[], number>({
      query: (sprintId) => ({ url: '/comments/sprint_comments/', params: { sprint_id: sprintId } }),
      providesTags: (_result, _error, sprintId) => [{ type: 'Comment', id: `sprint-${sprintId}` }],
    }),

    // Get project comments
    getProjectComments: build.query<Comment[], number>({
      query: (projectId) => ({ url: '/comments/project_comments/', params: { project_id: projectId } }),
      providesTags: (_result, _error, projectId) => [{ type: 'Comment', id: `project-${projectId}` }],
    }),
  }),
});

export const {
  useListCommentsQuery,
  useGetCommentQuery,
  useCreateCommentMutation,
  useUpdateCommentMutation,
  useDeleteCommentMutation,
  useGetMyCommentsQuery,
  useGetTaskCommentsQuery,
  useGetSprintCommentsQuery,
  useGetProjectCommentsQuery,
} = commentApi;
