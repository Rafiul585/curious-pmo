import { api } from '../utils/api';

export interface KanbanTask {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  start_date: string | null;
  due_date: string | null;
  assignee: {
    id: number;
    username: string;
  } | null;
  reporter: {
    id: number;
    username: string;
  } | null;
  sprint: {
    id: number;
    name: string;
  };
  created_at: string;
  updated_at: string;
}

export interface KanbanColumn {
  id: string;
  name: string;
  status: string;
  tasks: KanbanTask[];
  count: number;
}

export interface SprintKanbanData {
  sprint: {
    id: number;
    name: string;
    milestone: {
      id: number;
      name: string;
    };
    project: {
      id: number;
      name: string;
    };
  };
  columns: KanbanColumn[];
  total_tasks: number;
}

export interface ProjectKanbanData {
  project: {
    id: number;
    name: string;
  };
  columns: KanbanColumn[];
  total_tasks: number;
}

export interface UserKanbanData {
  user: {
    id: number;
    username: string;
  };
  project_filter: number | null;
  columns: KanbanColumn[];
  total_tasks: number;
}

export const kanbanApi = api.injectEndpoints({
  endpoints: (build) => ({
    getSprintKanban: build.query<SprintKanbanData, number>({
      query: (sprintId) => `/sprints/${sprintId}/kanban/`,
      providesTags: (_result, _error, sprintId) => [
        { type: 'Kanban', id: `sprint-${sprintId}` },
        'Task',
      ],
    }),
    getProjectKanban: build.query<ProjectKanbanData, number>({
      query: (projectId) => `/projects/${projectId}/kanban/`,
      providesTags: (_result, _error, projectId) => [
        { type: 'Kanban', id: `project-${projectId}` },
        'Task',
      ],
    }),
    getMyKanban: build.query<UserKanbanData, number | undefined>({
      query: (projectId) => ({
        url: '/tasks/my_kanban/',
        params: projectId ? { project: projectId } : undefined,
      }),
      providesTags: ['Kanban', 'Task'],
    }),
    changeTaskStatus: build.mutation<{ status: string }, { taskId: number; status: string }>({
      query: ({ taskId, status }) => ({
        url: `/tasks/${taskId}/change_status/`,
        method: 'POST',
        body: { status },
      }),
      invalidatesTags: ['Kanban', 'Task'],
    }),
  }),
});

export const {
  useGetSprintKanbanQuery,
  useGetProjectKanbanQuery,
  useGetMyKanbanQuery,
  useChangeTaskStatusMutation,
} = kanbanApi;
