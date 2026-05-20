import { api } from '../utils/api';

export interface GoalTarget {
  id: number;
  goal: number;
  name: string;
  target_type: 'task_completion' | 'number' | 'currency';
  target_type_display: string;
  current: number;
  target: number;
  linked_project: number | null;
  linked_project_name: string | null;
  progress_pct: number;
}

export interface Goal {
  id: number;
  workspace: number;
  name: string;
  description: string;
  owner: number | null;
  owner_name: string | null;
  due_date: string | null;
  progress: number;
  progress_pct: number;
  targets: GoalTarget[];
  created_at: string;
  updated_at: string;
}

export type CreateGoal = Pick<Goal, 'workspace' | 'name' | 'description' | 'owner' | 'due_date'>;
export type CreateGoalTarget = Omit<GoalTarget, 'id' | 'target_type_display' | 'linked_project_name' | 'progress_pct'>;

export const goalsApi = api.injectEndpoints({
  endpoints: (build) => ({
    listGoals: build.query<Goal[], number>({
      query: (workspaceId) => ({ url: '/goals/', params: { workspace: workspaceId } }),
      transformResponse: (r: { results?: Goal[] } | Goal[]) =>
        Array.isArray(r) ? r : (r.results ?? []),
      providesTags: (_result, _error, workspaceId) => [
        { type: 'Goal' as const, id: `workspace-${workspaceId}` },
      ],
    }),

    createGoal: build.mutation<Goal, CreateGoal>({
      query: (body) => ({ url: '/goals/', method: 'POST', body }),
      invalidatesTags: (_result, _error, { workspace }) => [
        { type: 'Goal', id: `workspace-${workspace}` },
      ],
    }),

    updateGoal: build.mutation<Goal, { id: number; data: Partial<CreateGoal> }>({
      query: ({ id, data }) => ({ url: `/goals/${id}/`, method: 'PATCH', body: data }),
      invalidatesTags: (result) =>
        result ? [{ type: 'Goal', id: `workspace-${result.workspace}` }] : [],
    }),

    deleteGoal: build.mutation<void, { id: number; workspaceId: number }>({
      query: ({ id }) => ({ url: `/goals/${id}/`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, { workspaceId }) => [
        { type: 'Goal', id: `workspace-${workspaceId}` },
      ],
    }),

    syncGoal: build.mutation<Goal, number>({
      query: (id) => ({ url: `/goals/${id}/sync/`, method: 'POST' }),
      invalidatesTags: (result) =>
        result ? [{ type: 'Goal', id: `workspace-${result.workspace}` }] : [],
    }),

    createGoalTarget: build.mutation<GoalTarget, CreateGoalTarget>({
      query: (body) => ({ url: '/goal-targets/', method: 'POST', body }),
      invalidatesTags: ['Goal'],
    }),

    updateGoalTarget: build.mutation<GoalTarget, { id: number; data: Partial<CreateGoalTarget> }>({
      query: ({ id, data }) => ({ url: `/goal-targets/${id}/`, method: 'PATCH', body: data }),
      invalidatesTags: ['Goal'],
    }),

    deleteGoalTarget: build.mutation<void, number>({
      query: (id) => ({ url: `/goal-targets/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['Goal'],
    }),
  }),
});

export const {
  useListGoalsQuery,
  useCreateGoalMutation,
  useUpdateGoalMutation,
  useDeleteGoalMutation,
  useSyncGoalMutation,
  useCreateGoalTargetMutation,
  useUpdateGoalTargetMutation,
  useDeleteGoalTargetMutation,
} = goalsApi;
