import { api } from '../utils/api';
export const projectStatusApi = api.injectEndpoints({
    endpoints: (build) => ({
        listProjectStatuses: build.query({
            query: (projectId) => `/projects/${projectId}/statuses/`,
            providesTags: (_result, _error, projectId) => [
                { type: 'ProjectStatus', id: `project-${projectId}` },
            ],
        }),
        createProjectStatus: build.mutation({
            query: ({ projectId, data }) => ({
                url: `/projects/${projectId}/statuses/`,
                method: 'POST',
                body: data,
            }),
            invalidatesTags: (_result, _error, { projectId }) => [
                { type: 'ProjectStatus', id: `project-${projectId}` },
                { type: 'Kanban', id: `project-${projectId}` },
            ],
        }),
        updateProjectStatus: build.mutation({
            query: ({ id, data }) => ({
                url: `/project-statuses/${id}/`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: (_result, _error, { projectId }) => [
                { type: 'ProjectStatus', id: `project-${projectId}` },
                { type: 'Kanban', id: `project-${projectId}` },
            ],
        }),
        deleteProjectStatus: build.mutation({
            query: ({ id }) => ({
                url: `/project-statuses/${id}/`,
                method: 'DELETE',
            }),
            invalidatesTags: (_result, _error, { projectId }) => [
                { type: 'ProjectStatus', id: `project-${projectId}` },
                { type: 'Kanban', id: `project-${projectId}` },
            ],
        }),
    }),
});
export const { useListProjectStatusesQuery, useCreateProjectStatusMutation, useUpdateProjectStatusMutation, useDeleteProjectStatusMutation, } = projectStatusApi;
