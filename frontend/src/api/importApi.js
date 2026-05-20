import { api } from '../utils/api';
export const importApi = api.injectEndpoints({
    endpoints: (build) => ({
        csvImport: build.mutation({
            query: ({ file, projectId, sprintId, mapping }) => {
                const body = new FormData();
                body.append('file', file);
                body.append('project_id', String(projectId));
                body.append('sprint_id', String(sprintId));
                body.append('mapping', JSON.stringify(mapping));
                return { url: '/import/csv/', method: 'POST', body };
            },
            invalidatesTags: ['Task'],
        }),
    }),
});
export const { useCsvImportMutation } = importApi;
export const TASK_FIELDS = [
    { value: 'skip', label: '— skip —' },
    { value: 'title', label: 'Title' },
    { value: 'description', label: 'Description' },
    { value: 'status', label: 'Status' },
    { value: 'priority', label: 'Priority' },
    { value: 'assignee_email', label: 'Assignee (email)' },
    { value: 'due_date', label: 'Due Date' },
    { value: 'tags', label: 'Tags (comma-separated)' },
];
