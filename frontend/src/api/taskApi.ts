import { api } from '../utils/api';
import { ActivityLog } from './projectApi';
import type { Tag } from './tagApi';

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface TaskUser {
  id: number;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  sprint?: number;
  sprint_name?: string;
  assignee?: number;
  assignee_details?: TaskUser;
  assignees?: number[];
  assignees_details?: TaskUser[];
  reporter?: number;
  reporter_details?: TaskUser;
  due_date?: string;
  start_date?: string;
  estimated_hours?: number | null;
  actual_hours?: number;
  is_blocked?: boolean;
  parent?: number | null;
  subtask_count?: number;
  subtasks_done?: number;
  tags?: number[];
  tags_details?: Tag[];
  watcher_count?: number;
  watchers_details?: TaskUser[];
  recurrence?: 'daily' | 'weekly' | 'biweekly' | 'monthly' | null;
  recurrence_end?: string | null;
  recurrence_parent?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface Subtask {
  id: number;
  title: string;
  status: string;
  priority: string;
  assignee?: number;
}

export interface TimeLog {
  id: number;
  task: number;
  user: number;
  user_username: string;
  hours: number;
  date: string;
  note: string;
  created_at: string;
}

export interface TaskDetail extends Task {
  sprint_details?: {
    id: number;
    name: string;
    milestone?: {
      id: number;
      name: string;
      project?: {
        id: number;
        name: string;
      };
    };
  };
  dependencies?: TaskDependency[];
  subtasks?: Subtask[];
}

export interface TaskDependency {
  id: number;
  task: number;
  task_title?: string;
  depends_on: number;
  depends_on_title?: string;
  type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';
}

export interface CreateTaskData {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  sprint?: number;
  parent?: number | null;
  assignee?: number;
  assignees?: number[];
  reporter?: number;
  due_date?: string;
  start_date?: string;
  estimated_hours?: number | null;
  actual_hours?: number;
  recurrence?: string | null;
  recurrence_end?: string | null;
  recurrence_parent?: number | null;
}

export const taskApi = api.injectEndpoints({
  endpoints: (build) => ({
    // List tasks with filters
    listTasks: build.query<Task[], {
      project?: number;
      sprint?: number;
      status?: string;
      priority?: string;
      assignee?: number;
    } | void>({
      query: (params) => ({ url: '/tasks/', params: params || {} }),
      transformResponse: (response: PaginatedResponse<Task> | Task[]) => {
        if (Array.isArray(response)) {
          return response;
        }
        return response.results || [];
      },
      providesTags: (result) =>
        result
          ? [...result.map(({ id }) => ({ type: 'Task' as const, id })), 'Task']
          : ['Task'],
    }),

    // Get single task detail
    getTask: build.query<TaskDetail, number>({
      query: (id) => ({ url: `/tasks/${id}/` }),
      providesTags: (_result, _error, id) => [{ type: 'Task', id }],
    }),

    // Create task
    createTask: build.mutation<Task, CreateTaskData>({
      query: (body) => ({ url: '/tasks/', method: 'POST', body }),
      invalidatesTags: ['Task', 'Project', 'Sprint', 'Kanban', 'Gantt'],
    }),

    // Update task
    updateTask: build.mutation<Task, { id: number; data: Partial<CreateTaskData> }>({
      query: ({ id, data }) => ({
        url: `/tasks/${id}/`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Task', id },
        'Task',
        'Kanban',
        'Gantt',
      ],
    }),

    // Delete task
    deleteTask: build.mutation<void, number>({
      query: (id) => ({ url: `/tasks/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['Task', 'Project', 'Sprint', 'Kanban', 'Gantt'],
    }),

    // Assign task to current user
    assignTaskToMe: build.mutation<{ status: string }, number>({
      query: (id) => ({
        url: `/tasks/${id}/assign_to_me/`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, id) => [{ type: 'Task', id }, 'Task', 'Kanban'],
    }),

    // Change task status
    changeTaskStatus: build.mutation<{ status: string }, { id: number; status: string }>({
      query: ({ id, status }) => ({
        url: `/tasks/${id}/change_status/`,
        method: 'POST',
        body: { status },
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Task', id }, 'Task', 'Kanban'],
    }),

    // Get my tasks
    getMyTasks: build.query<Task[], void>({
      query: () => ({ url: '/tasks/my_tasks/' }),
      transformResponse: (response: PaginatedResponse<Task> | Task[]) => {
        if (Array.isArray(response)) {
          return response;
        }
        return response.results || [];
      },
      providesTags: ['Task'],
    }),

    // Get tasks reported by me
    getReportedByMe: build.query<Task[], void>({
      query: () => ({ url: '/tasks/reported_by_me/' }),
      transformResponse: (response: PaginatedResponse<Task> | Task[]) => {
        if (Array.isArray(response)) {
          return response;
        }
        return response.results || [];
      },
      providesTags: ['Task'],
    }),

    // Get task activity logs
    getTaskActivityLogs: build.query<
      { task_id: number; task_title: string; total_logs: number; activity_logs: ActivityLog[] },
      { taskId: number; limit?: number; action?: string }
    >({
      query: ({ taskId, limit, action }) => ({
        url: `/tasks/${taskId}/activity_logs/`,
        params: { limit, action },
      }),
      providesTags: (_result, _error, { taskId }) => [
        { type: 'Activity', id: `task-${taskId}` },
      ],
    }),

    // Task Dependencies
    listTaskDependencies: build.query<TaskDependency[], { task?: number } | void>({
      query: (params) => ({ url: '/task-dependencies/', params: params || {} }),
      transformResponse: (response: PaginatedResponse<TaskDependency> | TaskDependency[]) => {
        if (Array.isArray(response)) {
          return response;
        }
        return response.results || [];
      },
      providesTags: ['TaskDependency'],
    }),

    createTaskDependency: build.mutation<TaskDependency, Omit<TaskDependency, 'id' | 'task_title' | 'depends_on_title'>>({
      query: (body) => ({ url: '/task-dependencies/', method: 'POST', body }),
      invalidatesTags: ['TaskDependency', 'Task', 'Gantt'],
    }),

    deleteTaskDependency: build.mutation<void, number>({
      query: (id) => ({ url: `/task-dependencies/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['TaskDependency', 'Task', 'Gantt'],
    }),

    getTaskTimeLogs: build.query<TimeLog[], number>({
      query: (taskId) => ({ url: `/tasks/${taskId}/time_logs/` }),
      providesTags: (_result, _error, taskId) => [{ type: 'TimeLog' as const, id: taskId }],
    }),

    logTime: build.mutation<TimeLog, { task: number; hours: number; date: string; note?: string }>({
      query: (body) => ({ url: '/time-logs/', method: 'POST', body }),
      invalidatesTags: (_result, _error, { task }) => [
        { type: 'TimeLog', id: task },
        { type: 'Task', id: task },
        'Task',
      ],
    }),

    bulkUpdateTasks: build.mutation<{ updated: number[]; count: number }, { task_ids: number[]; status: string }>({
      query: (body) => ({ url: '/tasks/bulk_update/', method: 'POST', body }),
      invalidatesTags: ['Task', 'Kanban', 'Project', 'Sprint', 'Milestone'],
    }),

    reorderTasks: build.mutation<{ reordered: number }, { task_ids: number[] }>({
      query: (body) => ({ url: '/tasks/reorder/', method: 'POST', body }),
      invalidatesTags: ['Kanban'],
    }),

    listSubtasks: build.query<Subtask[], number>({
      query: (parentId) => ({ url: '/tasks/', params: { parent: parentId } }),
      transformResponse: (response: PaginatedResponse<Subtask> | Subtask[]) => {
        if (Array.isArray(response)) return response;
        return response.results || [];
      },
      providesTags: (_result, _error, parentId) => [{ type: 'Task' as const, id: `subtasks-${parentId}` }, 'Task'],
    }),

    watchTask: build.mutation<{ status: string; watcher_count: number }, number>({
      query: (id) => ({ url: `/tasks/${id}/watch/`, method: 'POST' }),
      invalidatesTags: (_result, _error, id) => [{ type: 'Task', id }],
    }),

    unwatchTask: build.mutation<{ status: string; watcher_count: number }, number>({
      query: (id) => ({ url: `/tasks/${id}/unwatch/`, method: 'POST' }),
      invalidatesTags: (_result, _error, id) => [{ type: 'Task', id }],
    }),
  }),
});

export const {
  useListTasksQuery,
  useGetTaskQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useAssignTaskToMeMutation,
  useChangeTaskStatusMutation,
  useGetMyTasksQuery,
  useGetReportedByMeQuery,
  useGetTaskActivityLogsQuery,
  useListTaskDependenciesQuery,
  useCreateTaskDependencyMutation,
  useDeleteTaskDependencyMutation,
  useBulkUpdateTasksMutation,
  useReorderTasksMutation,
  useGetTaskTimeLogsQuery,
  useLogTimeMutation,
  useListSubtasksQuery,
  useWatchTaskMutation,
  useUnwatchTaskMutation,
} = taskApi;
