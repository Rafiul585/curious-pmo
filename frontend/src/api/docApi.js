import { api } from '../utils/api';
export const docApi = api.injectEndpoints({
    endpoints: (build) => ({
        listDocs: build.query({
            query: (projectId) => ({ url: '/docs/', params: { project: projectId } }),
            providesTags: (_r, _e, projectId) => [{ type: 'Doc', id: `project-${projectId}` }],
        }),
        getDoc: build.query({
            query: (id) => ({ url: `/docs/${id}/` }),
            providesTags: (_r, _e, id) => [{ type: 'Doc', id }],
        }),
        createDoc: build.mutation({
            query: (body) => ({ url: '/docs/', method: 'POST', body }),
            invalidatesTags: (_r, _e, { project }) => [{ type: 'Doc', id: `project-${project}` }],
        }),
        updateDoc: build.mutation({
            query: ({ id, data }) => ({ url: `/docs/${id}/`, method: 'PATCH', body: data }),
            invalidatesTags: (_r, _e, { id, projectId }) => [
                { type: 'Doc', id },
                { type: 'Doc', id: `project-${projectId}` },
            ],
        }),
        deleteDoc: build.mutation({
            query: ({ id }) => ({ url: `/docs/${id}/`, method: 'DELETE' }),
            invalidatesTags: (_r, _e, { projectId }) => [{ type: 'Doc', id: `project-${projectId}` }],
        }),
    }),
});
export const { useListDocsQuery, useGetDocQuery, useCreateDocMutation, useUpdateDocMutation, useDeleteDocMutation, } = docApi;
