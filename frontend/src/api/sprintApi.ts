import { api } from '../utils/api';
import { ActivityLog } from './projectApi';

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface Sprint {
  id: number;
  name: string;
  description?: string;
  milestone: number;
  milestone_name?: string;
  project_id?: number;
  project_name?: string;
  status: 'planning' | 'active' | 'completed' | 'cancelled';
  start_date?: string;
  end_date?: string;
  goal?: string;
  tasks_count?: number;
  completed_tasks_count?: number;
  progress?: number;
  created_at?: string;
  updated_at?: string;
}

export interface SprintDetail extends Sprint {
  tasks: {
    id: number;
    title: string;
    status: string;
    priority: string;
    assignee_name?: string;
    due_date?: string;
  }[];
}

export interface CreateSprintData {
  name: string;
  description?: string;
  milestone: number;
  status?: string;
  start_date?: string;
  end_date?: string;
  goal?: string;
}

export const sprintApi = api.injectEndpoints({
  endpoints: (build) => ({
    // List sprints with filters
    listSprints: build.query<Sprint[], { milestone?: number; status?: string } | void>({
      query: (params) => ({ url: '/sprints/', params: params || {} }),
      transformResponse: (response: PaginatedResponse<Sprint> | Sprint[]) => {
        if (Array.isArray(response)) {
          return response;
        }
        return response.results || [];
      },
      providesTags: (result) =>
        result
          ? [...result.map(({ id }) => ({ type: 'Sprint' as const, id })), 'Sprint']
          : ['Sprint'],
    }),

    // Get single sprint detail
    getSprint: build.query<SprintDetail, number>({
      query: (id) => ({ url: `/sprints/${id}/` }),
      providesTags: (_result, _error, id) => [{ type: 'Sprint', id }],
    }),

    // Create sprint
    createSprint: build.mutation<Sprint, CreateSprintData>({
      query: (body) => ({ url: '/sprints/', method: 'POST', body }),
      invalidatesTags: (_result, _error, { milestone }) => [
        'Sprint',
        'Milestone',
        { type: 'Milestone', id: milestone },
        'Gantt',
      ],
    }),

    // Update sprint
    updateSprint: build.mutation<Sprint, { id: number; data: Partial<CreateSprintData> }>({
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
    deleteSprint: build.mutation<void, number>({
      query: (id) => ({ url: `/sprints/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['Sprint', 'Milestone', 'Task', 'Gantt', 'Kanban'],
    }),

    // Get sprint activity logs
    getSprintActivityLogs: build.query<
      { sprint_id: number; sprint_name: string; total_logs: number; activity_logs: ActivityLog[] },
      { sprintId: number; limit?: number; action?: string }
    >({
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

export const {
  useListSprintsQuery,
  useGetSprintQuery,
  useCreateSprintMutation,
  useUpdateSprintMutation,
  useDeleteSprintMutation,
  useGetSprintActivityLogsQuery,
} = sprintApi;
