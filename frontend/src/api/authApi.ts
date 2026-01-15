import { api } from '../utils/api';
import { setTokens, setUser } from '../store/slices/authSlice';

interface LoginRequest {
  username: string;
  password: string;
}

interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
}

interface AuthResponse {
  access: string;
  refresh?: string;
}

export const authApi = api.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation<AuthResponse, LoginRequest>({
      query: (body) => ({ url: '/auth/login/', method: 'POST', body }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        dispatch(setTokens({ access: data.access, refresh: data.refresh }));
      },
    }),
    register: build.mutation<AuthResponse, RegisterRequest>({
      query: (body) => ({ url: '/auth/register/', method: 'POST', body }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        dispatch(setTokens({ access: data.access, refresh: data.refresh }));
      },
    }),
    me: build.query({
      query: () => ({ url: '/users/me/' }),
      providesTags: ['Me'],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        dispatch(
          setUser({
            id: data.id,
            username: data.username,
            email: data.email,
            role: data.role || 'member',
          }),
        );
      },
    }),
  }),
});

export const { useLoginMutation, useRegisterMutation, useMeQuery } = authApi;
