import { api } from '../utils/api';
export const goalsApi = api.injectEndpoints({
    endpoints: (build) => ({
        listGoals: build.query({
            query: (workspaceId) => ({ url: '/goals/', params: { workspace: workspaceId } }),
            transformResponse: (r) => Array.isArray(r) ? r : (r.results ?? []),
            providesTags: (_result, _error, workspaceId) => [
                { type: 'Goal', id: `workspace-${workspaceId}` },
            ],
        }),
        createGoal: build.mutation({
            query: (body) => ({ url: '/goals/', method: 'POST', body }),
            invalidatesTags: (_result, _error, { workspace }) => [
                { type: 'Goal', id: `workspace-${workspace}` },
            ],
        }),
        updateGoal: build.mutation({
            query: ({ id, data }) => ({ url: `/goals/${id}/`, method: 'PATCH', body: data }),
            invalidatesTags: (result) => result ? [{ type: 'Goal', id: `workspace-${result.workspace}` }] : [],
        }),
        deleteGoal: build.mutation({
            query: ({ id }) => ({ url: `/goals/${id}/`, method: 'DELETE' }),
            invalidatesTags: (_result, _error, { workspaceId }) => [
                { type: 'Goal', id: `workspace-${workspaceId}` },
            ],
        }),
        syncGoal: build.mutation({
            query: (id) => ({ url: `/goals/${id}/sync/`, method: 'POST' }),
            invalidatesTags: (result) => result ? [{ type: 'Goal', id: `workspace-${result.workspace}` }] : [],
        }),
        createGoalTarget: build.mutation({
            query: (body) => ({ url: '/goal-targets/', method: 'POST', body }),
            invalidatesTags: ['Goal'],
        }),
        updateGoalTarget: build.mutation({
            query: ({ id, data }) => ({ url: `/goal-targets/${id}/`, method: 'PATCH', body: data }),
            invalidatesTags: ['Goal'],
        }),
        deleteGoalTarget: build.mutation({
            query: (id) => ({ url: `/goal-targets/${id}/`, method: 'DELETE' }),
            invalidatesTags: ['Goal'],
        }),
    }),
});
export const { useListGoalsQuery, useCreateGoalMutation, useUpdateGoalMutation, useDeleteGoalMutation, useSyncGoalMutation, useCreateGoalTargetMutation, useUpdateGoalTargetMutation, useDeleteGoalTargetMutation, } = goalsApi;
