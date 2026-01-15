import { api } from '../utils/api';
import { ActivityLog } from './projectApi';

export interface WorkspaceOwner {
  id: number;
  username: string;
  email?: string;
}

export interface WorkspaceMember {
  id: number;
  user: {
    id: number;
    username: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
  is_admin: boolean;
  joined_at: string;
}

export interface Workspace {
  id: number;
  name: string;
  description?: string;
  owner: WorkspaceOwner;
  members_count?: number;
  projects_count?: number;
  member_count?: number;
  project_count?: number;
  created_at: string;
  updated_at: string;
}

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface WorkspaceDetail extends Workspace {
  members: WorkspaceMember[];
}

export interface WorkspaceProjectAccess {
  id: number;
  workspace_member: {
    id: number;
    user: {
      id: number;
      username: string;
    };
  };
  project: {
    id: number;
    name: string;
  };
  can_view: boolean;
  can_edit: boolean;
  granted_by?: {
    id: number;
    username: string;
  };
  granted_at: string;
}

export interface CreateWorkspaceData {
  name: string;
  description?: string;
}

export const workspaceApi = api.injectEndpoints({
  endpoints: (build) => ({
    // List workspaces
    listWorkspaces: build.query<Workspace[], void>({
      query: () => ({ url: '/workspaces/' }),
      transformResponse: (response: PaginatedResponse<Workspace> | Workspace[]) => {
        // Handle both paginated and direct array responses
        if (Array.isArray(response)) {
          return response;
        }
        return response.results || [];
      },
      providesTags: (result) =>
        result
          ? [...result.map(({ id }) => ({ type: 'Workspace' as const, id })), 'Workspace']
          : ['Workspace'],
    }),

    // Get single workspace detail
    getWorkspace: build.query<WorkspaceDetail, number>({
      query: (id) => ({ url: `/workspaces/${id}/` }),
      providesTags: (_result, _error, id) => [{ type: 'Workspace', id }],
    }),

    // Create workspace
    createWorkspace: build.mutation<Workspace, CreateWorkspaceData>({
      query: (body) => ({ url: '/workspaces/', method: 'POST', body }),
      invalidatesTags: ['Workspace'],
    }),

    // Update workspace
    updateWorkspace: build.mutation<Workspace, { id: number; data: Partial<CreateWorkspaceData> }>({
      query: ({ id, data }) => ({
        url: `/workspaces/${id}/`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Workspace', id }, 'Workspace'],
    }),

    // Delete workspace
    deleteWorkspace: build.mutation<void, number>({
      query: (id) => ({ url: `/workspaces/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['Workspace', 'Project'],
    }),

    // Get my workspaces
    getMyWorkspaces: build.query<Workspace[], void>({
      query: () => ({ url: '/workspaces/my_workspaces/' }),
      providesTags: ['Workspace'],
    }),

    // Get workspace members
    getWorkspaceMembers: build.query<WorkspaceMember[], number>({
      query: (id) => ({ url: `/workspaces/${id}/members/` }),
      providesTags: (_result, _error, id) => [{ type: 'Workspace', id }],
    }),

    // Add member to workspace
    addWorkspaceMember: build.mutation<
      { status: string; created: boolean },
      { workspaceId: number; userId: number; isAdmin?: boolean }
    >({
      query: ({ workspaceId, userId, isAdmin }) => ({
        url: `/workspaces/${workspaceId}/add_member/`,
        method: 'POST',
        body: { user_id: userId, is_admin: isAdmin || false },
      }),
      invalidatesTags: (_result, _error, { workspaceId }) => [{ type: 'Workspace', id: workspaceId }],
    }),

    // Remove member from workspace
    removeWorkspaceMember: build.mutation<{ status: string }, { workspaceId: number; userId: number }>({
      query: ({ workspaceId, userId }) => ({
        url: `/workspaces/${workspaceId}/remove_member/`,
        method: 'POST',
        body: { user_id: userId },
      }),
      invalidatesTags: (_result, _error, { workspaceId }) => [{ type: 'Workspace', id: workspaceId }],
    }),

    // Get workspace projects
    getWorkspaceProjects: build.query<{ id: number; name: string; status: string }[], number>({
      query: (id) => ({ url: `/workspaces/${id}/workspace_projects/` }),
      providesTags: (_result, _error, id) => [{ type: 'Workspace', id }, 'Project'],
    }),

    // Grant project access
    grantProjectAccess: build.mutation<
      { status: string; can_view: boolean; can_edit: boolean },
      { workspaceId: number; userId: number; projectId: number; canView: boolean; canEdit: boolean }
    >({
      query: ({ workspaceId, userId, projectId, canView, canEdit }) => ({
        url: `/workspaces/${workspaceId}/grant_project_access/`,
        method: 'POST',
        body: { user_id: userId, project_id: projectId, can_view: canView, can_edit: canEdit },
      }),
      invalidatesTags: (_result, _error, { workspaceId }) => [{ type: 'Workspace', id: workspaceId }],
    }),

    // Revoke project access
    revokeProjectAccess: build.mutation<
      { status: string },
      { workspaceId: number; userId: number; projectId: number }
    >({
      query: ({ workspaceId, userId, projectId }) => ({
        url: `/workspaces/${workspaceId}/revoke_project_access/`,
        method: 'POST',
        body: { user_id: userId, project_id: projectId },
      }),
      invalidatesTags: (_result, _error, { workspaceId }) => [{ type: 'Workspace', id: workspaceId }],
    }),

    // Get member project access list
    getMemberProjectAccess: build.query<WorkspaceProjectAccess[], number>({
      query: (id) => ({ url: `/workspaces/${id}/member_project_access/` }),
      providesTags: (_result, _error, id) => [{ type: 'Workspace', id }],
    }),

    // Get workspace activity logs
    getWorkspaceActivityLogs: build.query<
      { workspace_id: number; workspace_name: string; total_logs: number; activity_logs: ActivityLog[] },
      { workspaceId: number; limit?: number; action?: string }
    >({
      query: ({ workspaceId, limit, action }) => ({
        url: `/workspaces/${workspaceId}/activity_logs/`,
        params: { limit, action },
      }),
      providesTags: (_result, _error, { workspaceId }) => [
        { type: 'Activity', id: `workspace-${workspaceId}` },
      ],
    }),
  }),
});

export const {
  useListWorkspacesQuery,
  useGetWorkspaceQuery,
  useCreateWorkspaceMutation,
  useUpdateWorkspaceMutation,
  useDeleteWorkspaceMutation,
  useGetMyWorkspacesQuery,
  useGetWorkspaceMembersQuery,
  useAddWorkspaceMemberMutation,
  useRemoveWorkspaceMemberMutation,
  useGetWorkspaceProjectsQuery,
  useGrantProjectAccessMutation,
  useRevokeProjectAccessMutation,
  useGetMemberProjectAccessQuery,
  useGetWorkspaceActivityLogsQuery,
} = workspaceApi;
