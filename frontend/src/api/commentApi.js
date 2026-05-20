import { api } from '../utils/api';
export const commentApi = api.injectEndpoints({
    endpoints: (build) => ({
        // List comments with filters
        listComments: build.query({
            query: (params) => ({ url: '/comments/', params: params || {} }),
            providesTags: (result) => result
                ? [...result.map(({ id }) => ({ type: 'Comment', id })), 'Comment']
                : ['Comment'],
        }),
        // Get single comment
        getComment: build.query({
            query: (id) => ({ url: `/comments/${id}/` }),
            providesTags: (_result, _error, id) => [{ type: 'Comment', id }],
        }),
        // Create comment
        createComment: build.mutation({
            query: (body) => ({ url: '/comments/', method: 'POST', body }),
            invalidatesTags: ['Comment', 'Task', 'Sprint', 'Project'],
        }),
        // Update comment
        updateComment: build.mutation({
            query: ({ id, content }) => ({
                url: `/comments/${id}/`,
                method: 'PATCH',
                body: { content },
            }),
            invalidatesTags: (_result, _error, { id }) => [{ type: 'Comment', id }, 'Comment'],
        }),
        // Delete comment
        deleteComment: build.mutation({
            query: (id) => ({ url: `/comments/${id}/`, method: 'DELETE' }),
            invalidatesTags: ['Comment'],
        }),
        // Get my comments
        getMyComments: build.query({
            query: () => ({ url: '/comments/my_comments/' }),
            providesTags: ['Comment'],
        }),
        // Get task comments
        getTaskComments: build.query({
            query: (taskId) => ({ url: '/comments/task_comments/', params: { task_id: taskId } }),
            providesTags: (_result, _error, taskId) => [{ type: 'Comment', id: `task-${taskId}` }],
        }),
        // Get sprint comments
        getSprintComments: build.query({
            query: (sprintId) => ({ url: '/comments/sprint_comments/', params: { sprint_id: sprintId } }),
            providesTags: (_result, _error, sprintId) => [{ type: 'Comment', id: `sprint-${sprintId}` }],
        }),
        // Get project comments
        getProjectComments: build.query({
            query: (projectId) => ({ url: '/comments/project_comments/', params: { project_id: projectId } }),
            providesTags: (_result, _error, projectId) => [{ type: 'Comment', id: `project-${projectId}` }],
        }),
    }),
});
export const { useListCommentsQuery, useGetCommentQuery, useCreateCommentMutation, useUpdateCommentMutation, useDeleteCommentMutation, useGetMyCommentsQuery, useGetTaskCommentsQuery, useGetSprintCommentsQuery, useGetProjectCommentsQuery, } = commentApi;
