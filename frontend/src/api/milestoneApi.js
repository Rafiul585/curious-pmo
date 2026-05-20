import { api } from '../utils/api';
export const milestoneApi = api.injectEndpoints({
    endpoints: (build) => ({
        // List milestones with filters
        listMilestones: build.query({
            query: (params) => ({ url: '/milestones/', params: params || {} }),
            transformResponse: (response) => {
                if (Array.isArray(response)) {
                    return response;
                }
                return response.results || [];
            },
            providesTags: (result) => result
                ? [...result.map(({ id }) => ({ type: 'Milestone', id })), 'Milestone']
                : ['Milestone'],
        }),
        // Get single milestone detail
        getMilestone: build.query({
            query: (id) => ({ url: `/milestones/${id}/` }),
            providesTags: (_result, _error, id) => [{ type: 'Milestone', id }],
        }),
        // Create milestone
        createMilestone: build.mutation({
            query: (body) => ({ url: '/milestones/', method: 'POST', body }),
            invalidatesTags: (_result, _error, { project }) => [
                'Milestone',
                { type: 'Project', id: project },
                'Project',
                'Gantt',
            ],
        }),
        // Update milestone
        updateMilestone: build.mutation({
            query: ({ id, data }) => ({
                url: `/milestones/${id}/`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'Milestone', id },
                'Milestone',
                'Project',
                'Gantt',
            ],
        }),
        // Delete milestone
        deleteMilestone: build.mutation({
            query: (id) => ({ url: `/milestones/${id}/`, method: 'DELETE' }),
            invalidatesTags: ['Milestone', 'Project', 'Sprint', 'Task', 'Gantt'],
        }),
        // Get milestone activity logs
        getMilestoneActivityLogs: build.query({
            query: ({ milestoneId, limit, action }) => ({
                url: `/milestones/${milestoneId}/activity_logs/`,
                params: { limit, action },
            }),
            providesTags: (_result, _error, { milestoneId }) => [
                { type: 'Activity', id: `milestone-${milestoneId}` },
            ],
        }),
    }),
});
export const { useListMilestonesQuery, useGetMilestoneQuery, useCreateMilestoneMutation, useUpdateMilestoneMutation, useDeleteMilestoneMutation, useGetMilestoneActivityLogsQuery, } = milestoneApi;
