import { api } from '../utils/api';
export const notificationApi = api.injectEndpoints({
    endpoints: (build) => ({
        // List all notifications
        listNotifications: build.query({
            query: (params) => ({ url: '/notifications/', params: params || {} }),
            transformResponse: (response) => {
                if (Array.isArray(response)) {
                    return response;
                }
                return response.results || [];
            },
            providesTags: (result) => result
                ? [...result.map(({ id }) => ({ type: 'Notification', id })), 'Notification']
                : ['Notification'],
        }),
        // Get single notification
        getNotification: build.query({
            query: (id) => ({ url: `/notifications/${id}/` }),
            providesTags: (_result, _error, id) => [{ type: 'Notification', id }],
        }),
        // Get unread notifications
        getUnreadNotifications: build.query({
            query: () => ({ url: '/notifications/unread/' }),
            transformResponse: (response) => {
                if (Array.isArray(response)) {
                    return response;
                }
                return response.results || [];
            },
            providesTags: ['Notification'],
        }),
        // Get unread count
        getUnreadCount: build.query({
            query: () => ({ url: '/notifications/count_unread/' }),
            providesTags: ['Notification'],
        }),
        // Mark single notification as read
        markNotificationRead: build.mutation({
            query: (id) => ({
                url: `/notifications/${id}/mark_read/`,
                method: 'POST',
            }),
            invalidatesTags: (_result, _error, id) => [{ type: 'Notification', id }, 'Notification'],
        }),
        // Mark all notifications as read
        markAllNotificationsRead: build.mutation({
            query: () => ({
                url: '/notifications/mark_all_read/',
                method: 'POST',
            }),
            invalidatesTags: ['Notification'],
        }),
        // Delete notification
        deleteNotification: build.mutation({
            query: (id) => ({ url: `/notifications/${id}/`, method: 'DELETE' }),
            invalidatesTags: ['Notification'],
        }),
    }),
});
export const { useListNotificationsQuery, useGetNotificationQuery, useGetUnreadNotificationsQuery, useGetUnreadCountQuery, useMarkNotificationReadMutation, useMarkAllNotificationsReadMutation, useDeleteNotificationMutation, } = notificationApi;
