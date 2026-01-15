import { api } from '../utils/api';
import { ActivityLog } from './projectApi';

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface MilestoneSprint {
  id: number;
  name: string;
  description?: string;
  milestone: number;
  status: string;
  start_date?: string;
  end_date?: string;
  completion_percentage?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Milestone {
  id: number;
  name: string;
  description?: string;
  project: number;
  project_name?: string;
  status: 'planning' | 'active' | 'completed' | 'cancelled';
  start_date?: string;
  end_date?: string;
  sprints?: MilestoneSprint[];
  completion_percentage?: number;
  sprints_count?: number;
  tasks_count?: number;
  progress?: number;
  created_at?: string;
  updated_at?: string;
}

export interface MilestoneDetail extends Milestone {
  sprints: {
    id: number;
    name: string;
    status: string;
    start_date?: string;
    end_date?: string;
    tasks_count?: number;
  }[];
}

export interface CreateMilestoneData {
  name: string;
  description?: string;
  project: number;
  status?: string;
  start_date?: string;
  end_date?: string;
}

export const milestoneApi = api.injectEndpoints({
  endpoints: (build) => ({
    // List milestones with filters
    listMilestones: build.query<Milestone[], { project?: number; status?: string } | void>({
      query: (params) => ({ url: '/milestones/', params: params || {} }),
      transformResponse: (response: PaginatedResponse<Milestone> | Milestone[]) => {
        if (Array.isArray(response)) {
          return response;
        }
        return response.results || [];
      },
      providesTags: (result) =>
        result
          ? [...result.map(({ id }) => ({ type: 'Milestone' as const, id })), 'Milestone']
          : ['Milestone'],
    }),

    // Get single milestone detail
    getMilestone: build.query<MilestoneDetail, number>({
      query: (id) => ({ url: `/milestones/${id}/` }),
      providesTags: (_result, _error, id) => [{ type: 'Milestone', id }],
    }),

    // Create milestone
    createMilestone: build.mutation<Milestone, CreateMilestoneData>({
      query: (body) => ({ url: '/milestones/', method: 'POST', body }),
      invalidatesTags: (_result, _error, { project }) => [
        'Milestone',
        { type: 'Project', id: project },
        'Project',
        'Gantt',
      ],
    }),

    // Update milestone
    updateMilestone: build.mutation<Milestone, { id: number; data: Partial<CreateMilestoneData> }>({
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
    deleteMilestone: build.mutation<void, number>({
      query: (id) => ({ url: `/milestones/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['Milestone', 'Project', 'Sprint', 'Task', 'Gantt'],
    }),

    // Get milestone activity logs
    getMilestoneActivityLogs: build.query<
      { milestone_id: number; milestone_name: string; total_logs: number; activity_logs: ActivityLog[] },
      { milestoneId: number; limit?: number; action?: string }
    >({
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

export const {
  useListMilestonesQuery,
  useGetMilestoneQuery,
  useCreateMilestoneMutation,
  useUpdateMilestoneMutation,
  useDeleteMilestoneMutation,
  useGetMilestoneActivityLogsQuery,
} = milestoneApi;
