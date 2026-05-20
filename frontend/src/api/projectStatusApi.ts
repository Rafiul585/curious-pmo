import { api } from '../utils/api';

export interface ProjectStatus {
  id: number;
  project: number;
  name: string;
  color: string;
  order: number;
  is_done_state: boolean;
}

export interface CreateProjectStatusData {
  name: string;
  color?: string;
  order?: number;
  is_done_state?: boolean;
}

export const projectStatusApi = api.injectEndpoints({
  endpoints: (build) => ({
    listProjectStatuses: build.query<ProjectStatus[], number>({
      query: (projectId) => `/projects/${projectId}/statuses/`,
      providesTags: (_result, _error, projectId) => [
        { type: 'ProjectStatus', id: `project-${projectId}` },
      ],
    }),
    createProjectStatus: build.mutation<ProjectStatus, { projectId: number; data: CreateProjectStatusData }>({
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
    updateProjectStatus: build.mutation<ProjectStatus, { id: number; projectId: number; data: Partial<CreateProjectStatusData> }>({
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
    deleteProjectStatus: build.mutation<void, { id: number; projectId: number }>({
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

export const {
  useListProjectStatusesQuery,
  useCreateProjectStatusMutation,
  useUpdateProjectStatusMutation,
  useDeleteProjectStatusMutation,
} = projectStatusApi;
