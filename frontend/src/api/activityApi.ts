import { api } from '../utils/api';

export interface ActivityLog {
  id: number;
  user: number;
  user_name: string;
  user_email?: string;
  action: string;
  content_type: string;
  object_id: number;
  object_repr?: string;
  timestamp: string;
  reason?: string;
  old_value?: Record<string, unknown>;
  new_value?: Record<string, unknown>;
  extra_info?: Record<string, unknown>;
  changed_fields?: string[];
  description?: string;
  entity_display?: string;
}

export interface ActivitySummary {
  total_events: number;
  events_by_action: Record<string, number>;
  events_by_entity: Record<string, number>;
  recent_users: { username: string; count: number }[];
}

export const activityApi = api.injectEndpoints({
  endpoints: (build) => ({
    // List all activity logs
    listActivityLogs: build.query<ActivityLog[], { limit?: number; offset?: number } | void>({
      query: (params) => ({ url: '/activity/', params: params || {} }),
      providesTags: ['Activity'],
    }),

    // Get my activity
    getMyActivity: build.query<ActivityLog[], { limit?: number } | void>({
      query: (params) => ({ url: '/activity/my_activity/', params: params || {} }),
      providesTags: ['Activity'],
    }),

    // Get recent activity
    getRecentActivity: build.query<ActivityLog[], { limit?: number } | void>({
      query: (params) => ({ url: '/activity/recent/', params: params || {} }),
      providesTags: ['Activity'],
    }),

    // Get activity by entity type
    getActivityByEntity: build.query<ActivityLog[], { entity_type: string; limit?: number }>({
      query: (params) => ({ url: '/activity/by_entity/', params }),
      providesTags: ['Activity'],
    }),

    // Get activity by workspace
    getActivityByWorkspace: build.query<ActivityLog[], { workspace_id: number; limit?: number }>({
      query: (params) => ({ url: '/activity/by_workspace/', params }),
      providesTags: ['Activity'],
    }),

    // Get activity by project
    getActivityByProject: build.query<ActivityLog[], { project_id: number; limit?: number }>({
      query: (params) => ({ url: '/activity/by_project/', params }),
      providesTags: ['Activity'],
    }),

    // Get activity by user
    getActivityByUser: build.query<ActivityLog[], { user_id: number; limit?: number }>({
      query: (params) => ({ url: '/activity/by_user/', params }),
      providesTags: ['Activity'],
    }),

    // Get activity by action type
    getActivityByAction: build.query<ActivityLog[], { action: string; limit?: number }>({
      query: (params) => ({ url: '/activity/by_action/', params }),
      providesTags: ['Activity'],
    }),

    // Get activity by date range
    getActivityByDateRange: build.query<
      ActivityLog[],
      { start_date: string; end_date: string; limit?: number }
    >({
      query: (params) => ({ url: '/activity/by_date_range/', params }),
      providesTags: ['Activity'],
    }),

    // Get available action types
    getActionTypes: build.query<string[], void>({
      query: () => ({ url: '/activity/action_types/' }),
    }),

    // Get available entity types
    getEntityTypes: build.query<string[], void>({
      query: () => ({ url: '/activity/entity_types/' }),
    }),

    // Get activity summary
    getActivitySummary: build.query<ActivitySummary, { days?: number } | void>({
      query: (params) => ({ url: '/activity/summary/', params: params || {} }),
      providesTags: ['Activity'],
    }),
  }),
});

export const {
  useListActivityLogsQuery,
  useGetMyActivityQuery,
  useGetRecentActivityQuery,
  useGetActivityByEntityQuery,
  useGetActivityByWorkspaceQuery,
  useGetActivityByProjectQuery,
  useGetActivityByUserQuery,
  useGetActivityByActionQuery,
  useGetActivityByDateRangeQuery,
  useGetActionTypesQuery,
  useGetEntityTypesQuery,
  useGetActivitySummaryQuery,
} = activityApi;
