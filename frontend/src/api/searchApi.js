import { api } from '../utils/api';
export const searchApi = api.injectEndpoints({
    endpoints: (build) => ({
        searchAll: build.query({
            query: ({ q, limit = 20 }) => ({
                url: '/search/all/',
                params: { q, limit },
            }),
            providesTags: ['Search'],
        }),
        quickSearch: build.query({
            query: ({ q, limit = 5 }) => ({
                url: '/search/quick/',
                params: { q, limit },
            }),
            providesTags: ['Search'],
        }),
        searchTasks: build.query({
            query: ({ q, limit = 20 }) => ({
                url: '/search/tasks/',
                params: { q, limit },
            }),
            providesTags: ['Search'],
        }),
        searchProjects: build.query({
            query: ({ q, limit = 20 }) => ({
                url: '/search/projects/',
                params: { q, limit },
            }),
            providesTags: ['Search'],
        }),
    }),
});
export const { useSearchAllQuery, useQuickSearchQuery, useSearchTasksQuery, useSearchProjectsQuery, useLazyQuickSearchQuery, useLazySearchAllQuery, } = searchApi;
