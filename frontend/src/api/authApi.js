import { api } from '../utils/api';
import { setTokens, setUser } from '../store/slices/authSlice';
export const authApi = api.injectEndpoints({
    endpoints: (build) => ({
        login: build.mutation({
            query: (body) => ({ url: '/auth/login/', method: 'POST', body }),
            async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
                const { data } = await queryFulfilled;
                dispatch(setTokens({ access: data.access, refresh: data.refresh }));
            },
        }),
        register: build.mutation({
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
                dispatch(setUser({
                    id: data.id,
                    username: data.username,
                    email: data.email,
                    role: data.role || 'member',
                }));
            },
        }),
    }),
});
export const { useLoginMutation, useRegisterMutation, useMeQuery } = authApi;
