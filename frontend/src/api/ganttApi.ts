import { api } from '../utils/api';

export interface TimelineAssignee {
  id: number;
  username: string;
  initials: string;
}

export interface TimelineItem {
  id: string;
  type: 'project' | 'milestone' | 'sprint' | 'task';
  name: string;
  start_date: string | null;
  end_date: string | null;
  progress: number;
  status: string;
  priority?: string;
  assignee?: TimelineAssignee | null;
  parent_id: string | null;
  level: number;
  dependencies?: string[];
  editable: boolean;
}

export interface TimelineData {
  project: {
    id: number;
    name: string;
    start_date: string | null;
    end_date: string | null;
  };
  items: TimelineItem[];
  total_items: number;
}

export interface UpdateTimelineItemRequest {
  item_type: 'project' | 'milestone' | 'sprint' | 'task';
  item_id: number;
  start_date?: string;
  end_date?: string;
}

export interface UpdateTimelineItemResponse {
  status: string;
  updated: {
    id: number;
    type: string;
    start_date: string;
    end_date: string;
  };
}

export const ganttApi = api.injectEndpoints({
  endpoints: (build) => ({
    // Get timeline data for a project
    getProjectTimeline: build.query<TimelineData, number>({
      query: (projectId) => ({
        url: `/projects/${projectId}/timeline/`,
      }),
      providesTags: (_result, _error, projectId) => [
        { type: 'Gantt', id: projectId },
        'Gantt',
      ],
    }),

    // Update timeline item dates (for drag & drop)
    updateTimelineItem: build.mutation<UpdateTimelineItemResponse, { projectId: number; data: UpdateTimelineItemRequest }>({
      query: ({ projectId, data }) => ({
        url: `/projects/${projectId}/update_timeline_item/`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: 'Gantt', id: projectId },
        'Task',
        'Sprint',
        'Milestone',
        'Project',
      ],
    }),
  }),
});

export const {
  useGetProjectTimelineQuery,
  useUpdateTimelineItemMutation,
} = ganttApi;
