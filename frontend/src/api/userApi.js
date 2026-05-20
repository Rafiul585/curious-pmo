import { api } from '../utils/api';
export const userApi = api.injectEndpoints({
    endpoints: (build) => ({
        // List all users (admin only typically)
        listUsers: build.query({
            query: (params) => ({ url: '/users/', params: params || {} }),
            transformResponse: (response) => {
                if (Array.isArray(response)) {
                    return response;
                }
                return response.results || [];
            },
            providesTags: (result) => result
                ? [...result.map(({ id }) => ({ type: 'User', id })), 'User']
                : ['User'],
        }),
        // Get single user
        getUser: build.query({
            query: (id) => ({ url: `/users/${id}/` }),
            providesTags: (_result, _error, id) => [{ type: 'User', id }],
        }),
        // Get current user profile
        getCurrentUser: build.query({
            query: () => ({ url: '/users/me/' }),
            providesTags: ['Me'],
        }),
        // Update user profile
        updateUser: build.mutation({
            query: ({ id, data }) => ({
                url: `/users/${id}/`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: (_result, _error, { id }) => [{ type: 'User', id }, 'Me'],
        }),
        // Suspend user (admin only)
        suspendUser: build.mutation({
            query: (id) => ({
                url: `/users/${id}/suspend/`,
                method: 'POST',
            }),
            invalidatesTags: (_result, _error, id) => [{ type: 'User', id }],
        }),
        // Activate user (admin only)
        activateUser: build.mutation({
            query: (id) => ({
                url: `/users/${id}/activate/`,
                method: 'POST',
            }),
            invalidatesTags: (_result, _error, id) => [{ type: 'User', id }],
        }),
        // Change password
        changePassword: build.mutation({
            query: (body) => ({
                url: '/auth/change-password/',
                method: 'POST',
                body,
            }),
        }),
        // Request password reset
        requestPasswordReset: build.mutation({
            query: (body) => ({
                url: '/auth/password-reset/',
                method: 'POST',
                body,
            }),
        }),
        // Confirm password reset
        confirmPasswordReset: build.mutation({
            query: (body) => ({
                url: '/auth/password-reset/confirm/',
                method: 'POST',
                body,
            }),
        }),
        // Logout
        logout: build.mutation({
            query: () => ({
                url: '/auth/logout/',
                method: 'POST',
            }),
            invalidatesTags: ['Me', 'Notification'],
        }),
        // Get iCal token + feed URL
        getCalendarToken: build.query({
            query: () => ({ url: '/users/calendar-token/' }),
            providesTags: [{ type: 'Me', id: 'calendar-token' }],
        }),
        // Generate / regenerate iCal token
        generateCalendarToken: build.mutation({
            query: () => ({ url: '/users/calendar-token/', method: 'POST' }),
            invalidatesTags: [{ type: 'Me', id: 'calendar-token' }],
        }),
    }),
});
export const { useListUsersQuery, useGetUserQuery, useGetCurrentUserQuery, useUpdateUserMutation, useSuspendUserMutation, useActivateUserMutation, useChangePasswordMutation, useRequestPasswordResetMutation, useConfirmPasswordResetMutation, useLogoutMutation, useGetCalendarTokenQuery, useGenerateCalendarTokenMutation, } = userApi;
