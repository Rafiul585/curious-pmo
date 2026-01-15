import { api } from '../utils/api';

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface Notification {
  id: number;
  recipient: number;
  actor?: {
    id: number;
    username: string;
  };
  verb: string;
  notification_type: 'mention' | 'assignment' | 'comment' | 'status_change' | 'deadline' | 'member_added' | 'general';
  target_content_type?: string;
  target_object_id?: number;
  target_url?: string;
  read: boolean;
  timestamp: string;
}

export const notificationApi = api.injectEndpoints({
  endpoints: (build) => ({
    // List all notifications
    listNotifications: build.query<Notification[], { read?: boolean; notification_type?: string } | void>({
      query: (params) => ({ url: '/notifications/', params: params || {} }),
      transformResponse: (response: PaginatedResponse<Notification> | Notification[]) => {
        if (Array.isArray(response)) {
          return response;
        }
        return response.results || [];
      },
      providesTags: (result) =>
        result
          ? [...result.map(({ id }) => ({ type: 'Notification' as const, id })), 'Notification']
          : ['Notification'],
    }),

    // Get single notification
    getNotification: build.query<Notification, number>({
      query: (id) => ({ url: `/notifications/${id}/` }),
      providesTags: (_result, _error, id) => [{ type: 'Notification', id }],
    }),

    // Get unread notifications
    getUnreadNotifications: build.query<Notification[], void>({
      query: () => ({ url: '/notifications/unread/' }),
      transformResponse: (response: PaginatedResponse<Notification> | Notification[]) => {
        if (Array.isArray(response)) {
          return response;
        }
        return response.results || [];
      },
      providesTags: ['Notification'],
    }),

    // Get unread count
    getUnreadCount: build.query<{ unread_count: number }, void>({
      query: () => ({ url: '/notifications/count_unread/' }),
      providesTags: ['Notification'],
    }),

    // Mark single notification as read
    markNotificationRead: build.mutation<{ message: string }, number>({
      query: (id) => ({
        url: `/notifications/${id}/mark_read/`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, id) => [{ type: 'Notification', id }, 'Notification'],
    }),

    // Mark all notifications as read
    markAllNotificationsRead: build.mutation<{ message: string }, void>({
      query: () => ({
        url: '/notifications/mark_all_read/',
        method: 'POST',
      }),
      invalidatesTags: ['Notification'],
    }),

    // Delete notification
    deleteNotification: build.mutation<void, number>({
      query: (id) => ({ url: `/notifications/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['Notification'],
    }),
  }),
});

export const {
  useListNotificationsQuery,
  useGetNotificationQuery,
  useGetUnreadNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useDeleteNotificationMutation,
} = notificationApi;
