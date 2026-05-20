import { api } from '../utils/api';
export const sprintApi = api.injectEndpoints({
    endpoints: (build) => ({
        // List sprints with filters
        listSprints: build.query({
            query: (params) => ({ url: '/sprints/', params: params || {} }),
            transformResponse: (response) => {
                if (Array.isArray(response)) {
                    return response;
                }
                return response.results || [];
            },
            providesTags: (result) => result
                ? [...result.map(({ id }) => ({ type: 'Sprint', id })), 'Sprint']
                : ['Sprint'],
        }),
        // Get single sprint detail
        getSprint: build.query({
            query: (id) => ({ url: `/sprints/${id}/` }),
            providesTags: (_result, _error, id) => [{ type: 'Sprint', id }],
        }),
        // Create sprint
        createSprint: build.mutation({
            query: (body) => ({ url: '/sprints/', method: 'POST', body }),
            invalidatesTags: (_result, _error, { milestone }) => [
                'Sprint',
                'Milestone',
                { type: 'Milestone', id: milestone },
                'Gantt',
            ],
        }),
        // Update sprint
        updateSprint: build.mutation({
            query: ({ id, data }) => ({
                url: `/sprints/${id}/`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'Sprint', id },
                'Sprint',
                'Milestone',
                'Gantt',
                'Kanban',
            ],
        }),
        // Delete sprint
        deleteSprint: build.mutation({
            query: (id) => ({ url: `/sprints/${id}/`, method: 'DELETE' }),
            invalidatesTags: ['Sprint', 'Milestone', 'Task', 'Gantt', 'Kanban'],
        }),
        // Get sprint burndown data
        getSprintBurndown: build.query({
            query: (id) => ({ url: `/sprints/${id}/burndown/` }),
            providesTags: (_result, _error, id) => [{ type: 'Sprint', id }],
        }),
        // Get sprint activity logs
        getSprintActivityLogs: build.query({
            query: ({ sprintId, limit, action }) => ({
                url: `/sprints/${sprintId}/activity_logs/`,
                params: { limit, action },
            }),
            providesTags: (_result, _error, { sprintId }) => [
                { type: 'Activity', id: `sprint-${sprintId}` },
            ],
        }),
    }),
});
export const { useListSprintsQuery, useGetSprintQuery, useCreateSprintMutation, useUpdateSprintMutation, useDeleteSprintMutation, useGetSprintBurndownQuery, useGetSprintActivityLogsQuery, } = sprintApi;
