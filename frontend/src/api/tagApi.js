import { api } from '../utils/api';
export const tagApi = api.injectEndpoints({
    endpoints: (build) => ({
        listTags: build.query({
            query: (params) => ({ url: '/tags/', params: params || {} }),
            providesTags: (result) => result
                ? [...result.map(({ id }) => ({ type: 'Tag', id })), 'Tag']
                : ['Tag'],
        }),
        createTag: build.mutation({
            query: (body) => ({ url: '/tags/', method: 'POST', body }),
            invalidatesTags: ['Tag'],
        }),
        deleteTag: build.mutation({
            query: (id) => ({ url: `/tags/${id}/`, method: 'DELETE' }),
            invalidatesTags: ['Tag'],
        }),
        addTagToTask: build.mutation({
            query: ({ taskId, tagId }) => ({
                url: `/tasks/${taskId}/add_tag/`,
                method: 'POST',
                body: { tag_id: tagId },
            }),
            invalidatesTags: (_result, _error, { taskId }) => [
                { type: 'Task', id: taskId },
                'Task',
            ],
        }),
        removeTagFromTask: build.mutation({
            query: ({ taskId, tagId }) => ({
                url: `/tasks/${taskId}/remove_tag/`,
                method: 'POST',
                body: { tag_id: tagId },
            }),
            invalidatesTags: (_result, _error, { taskId }) => [
                { type: 'Task', id: taskId },
                'Task',
            ],
        }),
    }),
});
export const { useListTagsQuery, useCreateTagMutation, useDeleteTagMutation, useAddTagToTaskMutation, useRemoveTagFromTaskMutation, } = tagApi;
