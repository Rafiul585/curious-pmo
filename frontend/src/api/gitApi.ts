import { api } from '../utils/api';

export interface GitIntegration {
  id: number;
  workspace: number;
  provider: 'github' | 'gitlab';
  repo_url: string;
  webhook_url: string;
  created_at: string;
}

export interface CreateGitIntegrationData {
  workspace: number;
  provider: 'github' | 'gitlab';
  repo_url: string;
  webhook_secret?: string;
}

export interface TaskGitLink {
  id: number;
  task: number;
  integration: number | null;
  pr_url: string;
  pr_number: number | null;
  pr_title: string;
  commit_sha: string;
  status: 'open' | 'merged' | 'closed';
  created_at: string;
  updated_at: string;
}

export const gitApi = api.injectEndpoints({
  endpoints: (build) => ({
    listGitIntegrations: build.query<GitIntegration[], number>({
      query: (workspaceId) => ({ url: '/git-integrations/', params: { workspace: workspaceId } }),
      providesTags: (_r, _e, workspaceId) => [{ type: 'GitIntegration' as const, id: `ws-${workspaceId}` }],
    }),

    createGitIntegration: build.mutation<GitIntegration, CreateGitIntegrationData>({
      query: (body) => ({ url: '/git-integrations/', method: 'POST', body }),
      invalidatesTags: (_r, _e, { workspace }) => [{ type: 'GitIntegration', id: `ws-${workspace}` }],
    }),

    deleteGitIntegration: build.mutation<void, { id: number; workspaceId: number }>({
      query: ({ id }) => ({ url: `/git-integrations/${id}/`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, { workspaceId }) => [{ type: 'GitIntegration', id: `ws-${workspaceId}` }],
    }),

    listTaskGitLinks: build.query<TaskGitLink[], number>({
      query: (taskId) => ({ url: '/task-git-links/', params: { task: taskId } }),
      providesTags: (_r, _e, taskId) => [{ type: 'TaskGitLink' as const, id: `task-${taskId}` }],
    }),

    createTaskGitLink: build.mutation<TaskGitLink, Partial<TaskGitLink>>({
      query: (body) => ({ url: '/task-git-links/', method: 'POST', body }),
      invalidatesTags: (_r, _e, { task }) => [{ type: 'TaskGitLink', id: `task-${task}` }],
    }),

    deleteTaskGitLink: build.mutation<void, { id: number; taskId: number }>({
      query: ({ id }) => ({ url: `/task-git-links/${id}/`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, { taskId }) => [{ type: 'TaskGitLink', id: `task-${taskId}` }],
    }),
  }),
});

export const {
  useListGitIntegrationsQuery,
  useCreateGitIntegrationMutation,
  useDeleteGitIntegrationMutation,
  useListTaskGitLinksQuery,
  useCreateTaskGitLinkMutation,
  useDeleteTaskGitLinkMutation,
} = gitApi;
