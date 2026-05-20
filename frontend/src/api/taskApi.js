import { api } from '../utils/api';
export const taskApi = api.injectEndpoints({
    endpoints: (build) => ({
        // List tasks with filters
        listTasks: build.query({
            query: (params) => ({ url: '/tasks/', params: params || {} }),
            transformResponse: (response) => {
                if (Array.isArray(response)) {
                    return response;
                }
                return response.results || [];
            },
            providesTags: (result) => result
                ? [...result.map(({ id }) => ({ type: 'Task', id })), 'Task']
                : ['Task'],
        }),
        // Get single task detail
        getTask: build.query({
            query: (id) => ({ url: `/tasks/${id}/` }),
            providesTags: (_result, _error, id) => [{ type: 'Task', id }],
        }),
        // Create task
        createTask: build.mutation({
            query: (body) => ({ url: '/tasks/', method: 'POST', body }),
            invalidatesTags: ['Task', 'Project', 'Sprint', 'Kanban', 'Gantt'],
        }),
        // Update task
        updateTask: build.mutation({
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
        deleteTask: build.mutation({
            query: (id) => ({ url: `/tasks/${id}/`, method: 'DELETE' }),
            invalidatesTags: ['Task', 'Project', 'Sprint', 'Kanban', 'Gantt'],
        }),
        // Assign task to current user
        assignTaskToMe: build.mutation({
            query: (id) => ({
                url: `/tasks/${id}/assign_to_me/`,
                method: 'POST',
            }),
            invalidatesTags: (_result, _error, id) => [{ type: 'Task', id }, 'Task', 'Kanban'],
        }),
        // Change task status
        changeTaskStatus: build.mutation({
            query: ({ id, status }) => ({
                url: `/tasks/${id}/change_status/`,
                method: 'POST',
                body: { status },
            }),
            invalidatesTags: (_result, _error, { id }) => [{ type: 'Task', id }, 'Task', 'Kanban'],
        }),
        // Get my tasks
        getMyTasks: build.query({
            query: () => ({ url: '/tasks/my_tasks/' }),
            transformResponse: (response) => {
                if (Array.isArray(response)) {
                    return response;
                }
                return response.results || [];
            },
            providesTags: ['Task'],
        }),
        // Get tasks reported by me
        getReportedByMe: build.query({
            query: () => ({ url: '/tasks/reported_by_me/' }),
            transformResponse: (response) => {
                if (Array.isArray(response)) {
                    return response;
                }
                return response.results || [];
            },
            providesTags: ['Task'],
        }),
        // Get task activity logs
        getTaskActivityLogs: build.query({
            query: ({ taskId, limit, action }) => ({
                url: `/tasks/${taskId}/activity_logs/`,
                params: { limit, action },
            }),
            providesTags: (_result, _error, { taskId }) => [
                { type: 'Activity', id: `task-${taskId}` },
            ],
        }),
        // Task Dependencies
        listTaskDependencies: build.query({
            query: (params) => ({ url: '/task-dependencies/', params: params || {} }),
            transformResponse: (response) => {
                if (Array.isArray(response)) {
                    return response;
                }
                return response.results || [];
            },
            providesTags: ['TaskDependency'],
        }),
        createTaskDependency: build.mutation({
            query: (body) => ({ url: '/task-dependencies/', method: 'POST', body }),
            invalidatesTags: ['TaskDependency', 'Task', 'Gantt'],
        }),
        deleteTaskDependency: build.mutation({
            query: (id) => ({ url: `/task-dependencies/${id}/`, method: 'DELETE' }),
            invalidatesTags: ['TaskDependency', 'Task', 'Gantt'],
        }),
        getTaskTimeLogs: build.query({
            query: (taskId) => ({ url: `/tasks/${taskId}/time_logs/` }),
            providesTags: (_result, _error, taskId) => [{ type: 'TimeLog', id: taskId }],
        }),
        logTime: build.mutation({
            query: (body) => ({ url: '/time-logs/', method: 'POST', body }),
            invalidatesTags: (_result, _error, { task }) => [
                { type: 'TimeLog', id: task },
                { type: 'Task', id: task },
                'Task',
            ],
        }),
        bulkUpdateTasks: build.mutation({
            query: (body) => ({ url: '/tasks/bulk_update/', method: 'POST', body }),
            invalidatesTags: ['Task', 'Kanban', 'Project', 'Sprint', 'Milestone'],
        }),
        reorderTasks: build.mutation({
            query: (body) => ({ url: '/tasks/reorder/', method: 'POST', body }),
            invalidatesTags: ['Kanban'],
        }),
        listSubtasks: build.query({
            query: (parentId) => ({ url: '/tasks/', params: { parent: parentId } }),
            transformResponse: (response) => {
                if (Array.isArray(response))
                    return response;
                return response.results || [];
            },
            providesTags: (_result, _error, parentId) => [{ type: 'Task', id: `subtasks-${parentId}` }, 'Task'],
        }),
        watchTask: build.mutation({
            query: (id) => ({ url: `/tasks/${id}/watch/`, method: 'POST' }),
            invalidatesTags: (_result, _error, id) => [{ type: 'Task', id }],
        }),
        unwatchTask: build.mutation({
            query: (id) => ({ url: `/tasks/${id}/unwatch/`, method: 'POST' }),
            invalidatesTags: (_result, _error, id) => [{ type: 'Task', id }],
        }),
    }),
});
export const { useListTasksQuery, useGetTaskQuery, useCreateTaskMutation, useUpdateTaskMutation, useDeleteTaskMutation, useAssignTaskToMeMutation, useChangeTaskStatusMutation, useGetMyTasksQuery, useGetReportedByMeQuery, useGetTaskActivityLogsQuery, useListTaskDependenciesQuery, useCreateTaskDependencyMutation, useDeleteTaskDependencyMutation, useBulkUpdateTasksMutation, useReorderTasksMutation, useGetTaskTimeLogsQuery, useLogTimeMutation, useListSubtasksQuery, useWatchTaskMutation, useUnwatchTaskMutation, } = taskApi;
