import { api } from '../utils/api';
export const ganttApi = api.injectEndpoints({
    endpoints: (build) => ({
        // Get timeline data for a project
        getProjectTimeline: build.query({
            query: (projectId) => ({
                url: `/projects/${projectId}/timeline/`,
            }),
            providesTags: (_result, _error, projectId) => [
                { type: 'Gantt', id: projectId },
                'Gantt',
            ],
        }),
        // Update timeline item dates (for drag & drop)
        updateTimelineItem: build.mutation({
            query: ({ projectId, data }) => ({
                url: `/projects/${projectId}/update_timeline_item/`,
                method: 'POST',
                body: data,
            }),
            invalidatesTags: (_result, _error, { projectId }) => [
                { type: 'Gantt', id: projectId },
                'Task',
                'Sprint',
                'Milestone',
                'Project',
            ],
        }),
    }),
});
export const { useGetProjectTimelineQuery, useUpdateTimelineItemMutation, } = ganttApi;
