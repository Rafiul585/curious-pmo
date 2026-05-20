import { api } from '../utils/api';
export const kanbanApi = api.injectEndpoints({
    endpoints: (build) => ({
        getSprintKanban: build.query({
            query: (sprintId) => `/sprints/${sprintId}/kanban/`,
            providesTags: (_result, _error, sprintId) => [
                { type: 'Kanban', id: `sprint-${sprintId}` },
                'Task',
            ],
        }),
        getProjectKanban: build.query({
            query: (projectId) => `/projects/${projectId}/kanban/`,
            providesTags: (_result, _error, projectId) => [
                { type: 'Kanban', id: `project-${projectId}` },
                'Task',
            ],
        }),
        getMyKanban: build.query({
            query: (projectId) => ({
                url: '/tasks/my_kanban/',
                params: projectId ? { project: projectId } : undefined,
            }),
            providesTags: ['Kanban', 'Task'],
        }),
        changeTaskStatus: build.mutation({
            query: ({ taskId, status }) => ({
                url: `/tasks/${taskId}/change_status/`,
                method: 'POST',
                body: { status },
            }),
            invalidatesTags: ['Kanban', 'Task'],
        }),
    }),
});
export const { useGetSprintKanbanQuery, useGetProjectKanbanQuery, useGetMyKanbanQuery, useChangeTaskStatusMutation, } = kanbanApi;
