import { api } from '../utils/api';

export interface Doc {
  id: number;
  project: number;
  title: string;
  created_by: number | null;
  created_by_username: string;
  created_at: string;
  updated_at: string;
}

export interface DocDetail extends Doc {
  content: string;
}

export interface CreateDocData {
  project: number;
  title: string;
  content?: string;
}

export interface UpdateDocData {
  title?: string;
  content?: string;
}

export const docApi = api.injectEndpoints({
  endpoints: (build) => ({
    listDocs: build.query<Doc[], number>({
      query: (projectId) => ({ url: '/docs/', params: { project: projectId } }),
      providesTags: (_r, _e, projectId) => [{ type: 'Doc' as const, id: `project-${projectId}` }],
    }),

    getDoc: build.query<DocDetail, number>({
      query: (id) => ({ url: `/docs/${id}/` }),
      providesTags: (_r, _e, id) => [{ type: 'Doc' as const, id }],
    }),

    createDoc: build.mutation<DocDetail, CreateDocData>({
      query: (body) => ({ url: '/docs/', method: 'POST', body }),
      invalidatesTags: (_r, _e, { project }) => [{ type: 'Doc', id: `project-${project}` }],
    }),

    updateDoc: build.mutation<DocDetail, { id: number; projectId: number; data: UpdateDocData }>({
      query: ({ id, data }) => ({ url: `/docs/${id}/`, method: 'PATCH', body: data }),
      invalidatesTags: (_r, _e, { id, projectId }) => [
        { type: 'Doc', id },
        { type: 'Doc', id: `project-${projectId}` },
      ],
    }),

    deleteDoc: build.mutation<void, { id: number; projectId: number }>({
      query: ({ id }) => ({ url: `/docs/${id}/`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, { projectId }) => [{ type: 'Doc', id: `project-${projectId}` }],
    }),
  }),
});

export const {
  useListDocsQuery,
  useGetDocQuery,
  useCreateDocMutation,
  useUpdateDocMutation,
  useDeleteDocMutation,
} = docApi;
