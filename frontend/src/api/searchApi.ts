import { api } from '../utils/api';

export interface SearchTaskItem {
  id: number;
  type: 'task';
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assignee: string | null;
  project: {
    id: number;
    name: string;
  } | null;
  sprint: {
    id: number;
    name: string;
  } | null;
}

export interface SearchProjectItem {
  id: number;
  type: 'project';
  name: string;
  description: string | null;
  status: string;
  workspace: {
    id: number;
    name: string;
  } | null;
  start_date: string | null;
  end_date: string | null;
}

export interface SearchMilestoneItem {
  id: number;
  type: 'milestone';
  name: string;
  description: string | null;
  status: string;
  project: {
    id: number;
    name: string;
  };
  start_date: string | null;
  end_date: string | null;
}

export interface SearchSprintItem {
  id: number;
  type: 'sprint';
  name: string;
  description: string | null;
  status: string;
  milestone: {
    id: number;
    name: string;
  };
  project: {
    id: number;
    name: string;
  };
  start_date: string | null;
  end_date: string | null;
}

export interface SearchUserItem {
  id: number;
  type: 'user';
  username: string;
  full_name: string;
  email: string;
}

export interface SearchResultCategory<T> {
  count: number;
  items: T[];
}

export interface SearchAllResults {
  query: string;
  total_count: number;
  results: {
    tasks: SearchResultCategory<SearchTaskItem>;
    projects: SearchResultCategory<SearchProjectItem>;
    milestones: SearchResultCategory<SearchMilestoneItem>;
    sprints: SearchResultCategory<SearchSprintItem>;
    users: SearchResultCategory<SearchUserItem>;
  };
}

export interface QuickSearchItem {
  id: number;
  type: string;
  category: string;
  title?: string;
  name?: string;
  username?: string;
  full_name?: string;
  email?: string;
  status?: string;
  priority?: string;
}

export interface QuickSearchResults {
  query: string;
  results: QuickSearchItem[];
}

export const searchApi = api.injectEndpoints({
  endpoints: (build) => ({
    searchAll: build.query<SearchAllResults, { q: string; limit?: number }>({
      query: ({ q, limit = 20 }) => ({
        url: '/search/all/',
        params: { q, limit },
      }),
      providesTags: ['Search'],
    }),
    quickSearch: build.query<QuickSearchResults, { q: string; limit?: number }>({
      query: ({ q, limit = 5 }) => ({
        url: '/search/quick/',
        params: { q, limit },
      }),
      providesTags: ['Search'],
    }),
    searchTasks: build.query<SearchResultCategory<SearchTaskItem> & { query: string }, { q: string; limit?: number }>({
      query: ({ q, limit = 20 }) => ({
        url: '/search/tasks/',
        params: { q, limit },
      }),
      providesTags: ['Search'],
    }),
    searchProjects: build.query<SearchResultCategory<SearchProjectItem> & { query: string }, { q: string; limit?: number }>({
      query: ({ q, limit = 20 }) => ({
        url: '/search/projects/',
        params: { q, limit },
      }),
      providesTags: ['Search'],
    }),
  }),
});

export const {
  useSearchAllQuery,
  useQuickSearchQuery,
  useSearchTasksQuery,
  useSearchProjectsQuery,
  useLazyQuickSearchQuery,
  useLazySearchAllQuery,
} = searchApi;
