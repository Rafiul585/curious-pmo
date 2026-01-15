import { api } from '../utils/api';

export interface ProjectMember {
  id: number;
  user: {
    id: number;
    username: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
  role?: {
    id: number;
    name: string;
  };
  joined_at: string;
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  visibility: 'public' | 'private';
  start_date?: string;
  end_date?: string;
  budget?: number;
  archived: boolean;
  workspace?: number;
  workspace_name?: string;
  owner?: {
    id: number;
    username: string;
  };
  members_count?: number;
  tasks_count?: number;
  milestones_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ProjectDetail extends Project {
  members: ProjectMember[];
  milestones: {
    id: number;
    name: string;
    status: string;
    start_date?: string;
    end_date?: string;
  }[];
}

export interface ActivityLog {
  id: number;
  user: number;
  user_name?: string;
  user_email?: string;
  action: string;
  content_type: string;
  object_id: number;
  timestamp: string;
  reason?: string;
  old_value?: Record<string, unknown>;
  new_value?: Record<string, unknown>;
  extra_info?: Record<string, unknown>;
  changed_fields?: string[];
  description?: string;
  entity_display?: string;
}

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const projectApi = api.injectEndpoints({
  endpoints: (build) => ({
    // List all projects
    listProjects: build.query<Project[], { workspace?: number; status?: string } | void>({
      query: (params) => ({ url: '/projects/', params: params || {} }),
      transformResponse: (response: PaginatedResponse<Project> | Project[]) => {
        if (Array.isArray(response)) {
          return response;
        }
        return response.results || [];
      },
      providesTags: (result) =>
        result
          ? [...result.map(({ id }) => ({ type: 'Project' as const, id })), 'Project']
          : ['Project'],
    }),

    // Get single project detail
    getProject: build.query<ProjectDetail, number>({
      query: (id) => ({ url: `/projects/${id}/` }),
      providesTags: (_result, _error, id) => [{ type: 'Project', id }],
    }),

    // Create project
    createProject: build.mutation<Project, Partial<Project>>({
      query: (body) => ({ url: '/projects/', method: 'POST', body }),
      invalidatesTags: ['Project', 'Workspace'],
    }),

    // Update project
    updateProject: build.mutation<Project, { id: number; data: Partial<Project> }>({
      query: ({ id, data }) => ({
        url: `/projects/${id}/`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Project', id }, 'Project'],
    }),

    // Delete project
    deleteProject: build.mutation<void, number>({
      query: (id) => ({ url: `/projects/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['Project', 'Workspace'],
    }),

    // Get my projects
    getMyProjects: build.query<Project[], void>({
      query: () => ({ url: '/projects/my_projects/' }),
      providesTags: ['Project'],
    }),

    // Add member to project
    addProjectMember: build.mutation<{ status: string }, { projectId: number; userId: number; roleId?: number }>({
      query: ({ projectId, userId, roleId }) => ({
        url: `/projects/${projectId}/add_member/`,
        method: 'POST',
        body: { user_id: userId, role_id: roleId },
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: 'Project', id: projectId },
        'Project',
      ],
    }),

    // Remove member from project
    removeProjectMember: build.mutation<{ status: string }, { projectId: number; userId: number }>({
      query: ({ projectId, userId }) => ({
        url: `/projects/${projectId}/remove_member/`,
        method: 'POST',
        body: { user_id: userId },
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: 'Project', id: projectId },
        'Project',
      ],
    }),

    // Get project activity logs
    getProjectActivityLogs: build.query<
      { project_id: number; project_name: string; total_logs: number; activity_logs: ActivityLog[] },
      { projectId: number; limit?: number; action?: string }
    >({
      query: ({ projectId, limit, action }) => ({
        url: `/projects/${projectId}/activity_logs/`,
        params: { limit, action },
      }),
      providesTags: (_result, _error, { projectId }) => [
        { type: 'Activity', id: `project-${projectId}` },
      ],
    }),

    // Get available workspace members (not yet in project)
    getAvailableMembers: build.query<
      { id: number; username: string; email: string; first_name?: string; last_name?: string }[],
      number
    >({
      query: (projectId) => ({
        url: `/projects/${projectId}/available_members/`,
      }),
      providesTags: (_result, _error, projectId) => [{ type: 'Project', id: projectId }],
    }),
  }),
});

export const {
  useListProjectsQuery,
  useGetProjectQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
  useGetMyProjectsQuery,
  useAddProjectMemberMutation,
  useRemoveProjectMemberMutation,
  useGetProjectActivityLogsQuery,
  useGetAvailableMembersQuery,
} = projectApi;
