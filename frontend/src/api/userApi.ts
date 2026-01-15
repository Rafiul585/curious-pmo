import { api } from '../utils/api';

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  is_active: boolean;
  date_joined?: string;
  last_login?: string;
}

export interface UserDetail extends User {
  workspaces_count?: number;
  projects_count?: number;
  tasks_assigned_count?: number;
  tasks_reported_count?: number;
}

export interface UpdateUserData {
  first_name?: string;
  last_name?: string;
  email?: string;
}

export interface ChangePasswordData {
  old_password: string;
  new_password: string;
}

export interface PasswordResetData {
  email: string;
}

export interface PasswordResetConfirmData {
  uid: string;
  token: string;
  new_password: string;
}

export const userApi = api.injectEndpoints({
  endpoints: (build) => ({
    // List all users (admin only typically)
    listUsers: build.query<User[], { search?: string; is_active?: boolean } | void>({
      query: (params) => ({ url: '/users/', params: params || {} }),
      transformResponse: (response: PaginatedResponse<User> | User[]) => {
        if (Array.isArray(response)) {
          return response;
        }
        return response.results || [];
      },
      providesTags: (result) =>
        result
          ? [...result.map(({ id }) => ({ type: 'User' as const, id })), 'User']
          : ['User'],
    }),

    // Get single user
    getUser: build.query<UserDetail, number>({
      query: (id) => ({ url: `/users/${id}/` }),
      providesTags: (_result, _error, id) => [{ type: 'User', id }],
    }),

    // Get current user profile
    getCurrentUser: build.query<UserDetail, void>({
      query: () => ({ url: '/users/me/' }),
      providesTags: ['Me'],
    }),

    // Update user profile
    updateUser: build.mutation<User, { id: number; data: UpdateUserData }>({
      query: ({ id, data }) => ({
        url: `/users/${id}/`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'User', id }, 'Me'],
    }),

    // Suspend user (admin only)
    suspendUser: build.mutation<{ status: string }, number>({
      query: (id) => ({
        url: `/users/${id}/suspend/`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, id) => [{ type: 'User', id }],
    }),

    // Activate user (admin only)
    activateUser: build.mutation<{ status: string }, number>({
      query: (id) => ({
        url: `/users/${id}/activate/`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, id) => [{ type: 'User', id }],
    }),

    // Change password
    changePassword: build.mutation<{ message: string }, ChangePasswordData>({
      query: (body) => ({
        url: '/auth/change-password/',
        method: 'POST',
        body,
      }),
    }),

    // Request password reset
    requestPasswordReset: build.mutation<{ message: string }, PasswordResetData>({
      query: (body) => ({
        url: '/auth/password-reset/',
        method: 'POST',
        body,
      }),
    }),

    // Confirm password reset
    confirmPasswordReset: build.mutation<{ message: string }, PasswordResetConfirmData>({
      query: (body) => ({
        url: '/auth/password-reset/confirm/',
        method: 'POST',
        body,
      }),
    }),

    // Logout
    logout: build.mutation<void, void>({
      query: () => ({
        url: '/auth/logout/',
        method: 'POST',
      }),
      invalidatesTags: ['Me', 'Notification'],
    }),
  }),
});

export const {
  useListUsersQuery,
  useGetUserQuery,
  useGetCurrentUserQuery,
  useUpdateUserMutation,
  useSuspendUserMutation,
  useActivateUserMutation,
  useChangePasswordMutation,
  useRequestPasswordResetMutation,
  useConfirmPasswordResetMutation,
  useLogoutMutation,
} = userApi;
