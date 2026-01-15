from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Prefetch, Count, Q
from datetime import date, timedelta

from pm.models.workspace_models import Workspace, WorkspaceMember
from pm.models.project_models import Project, Milestone, Sprint
from pm.models.task_models import Task
from pm.models.activity_models import ActivityLog
from pm.models.user_models import User
from pm.utils.permission_helpers import get_accessible_projects


def is_admin_or_superuser(user):
    """Check if user is a superuser, staff member, or workspace admin."""
    return user.is_superuser or user.is_staff


class DashboardViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    # =========================================================
    #  USER DASHBOARD ENDPOINTS (For regular users)
    # =========================================================

    # ---------------------------------------------------------
    #  DASHBOARD OVERVIEW (User-level)
    # ---------------------------------------------------------
    @action(detail=False, methods=['GET'])
    def overview(self, request):
        """
        Get dashboard overview for the current user.
        Returns aggregated statistics for dashboard display.
        """
        user = request.user
        today = date.today()

        # Get accessible projects for the user
        accessible_projects = get_accessible_projects(user)

        # Get all tasks in accessible projects
        all_tasks = Task.objects.filter(sprint__milestone__project__in=accessible_projects)

        # Calculate task statistics
        total_tasks = all_tasks.count()
        completed_tasks = all_tasks.filter(status='Done').count()
        pending_tasks = all_tasks.exclude(status='Done').count()
        overdue_tasks = all_tasks.filter(due_date__lt=today).exclude(status='Done').count()

        # Tasks by status
        tasks_by_status = {}
        for status_name in ['To-do', 'In Progress', 'Review', 'Done']:
            count = all_tasks.filter(status=status_name).count()
            if count > 0:
                # Convert to lowercase with underscore for frontend
                key = status_name.lower().replace(' ', '_').replace('-', '')
                tasks_by_status[key] = count

        # Tasks by priority
        tasks_by_priority = {}
        for priority in ['Low', 'Medium', 'High', 'Critical']:
            count = all_tasks.filter(priority=priority).count()
            if count > 0:
                tasks_by_priority[priority.lower()] = count

        # Recent activity
        recent_activity = list(ActivityLog.objects.filter(
            user=user
        ).order_by('-timestamp')[:10].values(
            'id', 'action', 'object_id', 'timestamp'
        ))

        # Add object_repr for each activity
        for activity in recent_activity:
            activity['object_repr'] = f"Item #{activity['object_id']}"

        return Response({
            'total_projects': accessible_projects.count(),
            'total_tasks': total_tasks,
            'completed_tasks': completed_tasks,
            'pending_tasks': pending_tasks,
            'overdue_tasks': overdue_tasks,
            'tasks_by_status': tasks_by_status,
            'tasks_by_priority': tasks_by_priority,
            'recent_activity': recent_activity,
        })

    # ---------------------------------------------------------
    #  MY TASKS — Summary for Dashboard (User-level)
    # ---------------------------------------------------------
    @action(detail=False, methods=['GET'])
    def my_tasks(self, request):
        """
        Get tasks assigned to the current user with summary statistics.
        Returns task list and aggregated counts for dashboard display.
        """
        user = request.user
        today = date.today()
        tasks = Task.objects.filter(assignee=user).select_related(
            'sprint__milestone__project'
        )

        # Calculate summary statistics
        total = tasks.count()

        # Tasks by status
        by_status = {}
        for status_name in ['To-do', 'In Progress', 'Review', 'Done']:
            count = tasks.filter(status=status_name).count()
            if count > 0:
                key = status_name.lower().replace(' ', '_').replace('-', '')
                by_status[key] = count

        # Tasks by priority
        by_priority = {}
        for priority in ['Low', 'Medium', 'High', 'Critical']:
            count = tasks.filter(priority=priority).count()
            if count > 0:
                by_priority[priority.lower()] = count

        # Overdue tasks (not done and past due date)
        overdue = tasks.filter(due_date__lt=today).exclude(status='Done').count()

        # Due this week
        week_end = today + timedelta(days=7)
        due_this_week = tasks.filter(
            due_date__gte=today,
            due_date__lte=week_end
        ).exclude(status='Done').count()

        # Get task list with project names (exclude done tasks, limit to recent/important)
        task_list = []
        active_tasks = tasks.exclude(status='Done').order_by('due_date', '-priority')[:10]

        for task in active_tasks:
            project_name = None
            if task.sprint and task.sprint.milestone and task.sprint.milestone.project:
                project_name = task.sprint.milestone.project.name

            task_list.append({
                'id': task.id,
                'title': task.title,
                'status': task.status.lower().replace(' ', '_').replace('-', ''),
                'priority': task.priority.lower() if task.priority else 'medium',
                'due_date': task.due_date.isoformat() if task.due_date else None,
                'project_name': project_name,
            })

        return Response({
            'total': total,
            'by_status': by_status,
            'by_priority': by_priority,
            'overdue': overdue,
            'due_this_week': due_this_week,
            'tasks': task_list,
        })

    # ---------------------------------------------------------
    #  UPCOMING DEADLINES (User-level)
    # ---------------------------------------------------------
    @action(detail=False, methods=['GET'])
    def upcoming_deadlines(self, request):
        """
        Get tasks with upcoming deadlines (next 7 days).
        Returns tasks sorted by due date.
        """
        user = request.user
        today = date.today()
        week_end = today + timedelta(days=7)

        # Get accessible projects for the user
        accessible_projects = get_accessible_projects(user)

        # Get tasks due in the next 7 days
        upcoming_tasks = Task.objects.filter(
            sprint__milestone__project__in=accessible_projects,
            due_date__gte=today,
            due_date__lte=week_end
        ).exclude(status='Done').select_related(
            'sprint__milestone__project', 'assignee'
        ).order_by('due_date', '-priority')

        task_list = []
        for task in upcoming_tasks[:20]:
            project_name = None
            if task.sprint and task.sprint.milestone and task.sprint.milestone.project:
                project_name = task.sprint.milestone.project.name

            days_until_due = (task.due_date - today).days if task.due_date else None

            task_list.append({
                'id': task.id,
                'title': task.title,
                'status': task.status.lower().replace(' ', '_').replace('-', ''),
                'priority': task.priority.lower() if task.priority else 'medium',
                'due_date': task.due_date.isoformat() if task.due_date else None,
                'days_until_due': days_until_due,
                'project_name': project_name,
                'assignee': {
                    'id': task.assignee.id,
                    'username': task.assignee.username,
                    'initials': ''.join([n[0].upper() for n in task.assignee.username.split()[:2]]) if task.assignee else None
                } if task.assignee else None,
            })

        # Group by days
        due_today = [t for t in task_list if t['days_until_due'] == 0]
        due_tomorrow = [t for t in task_list if t['days_until_due'] == 1]
        due_this_week = [t for t in task_list if t['days_until_due'] and t['days_until_due'] > 1]

        return Response({
            'total': len(task_list),
            'due_today': due_today,
            'due_tomorrow': due_tomorrow,
            'due_this_week': due_this_week,
            'tasks': task_list,
        })

    # ---------------------------------------------------------
    #  TEAM WORKLOAD (User-level)
    # ---------------------------------------------------------
    @action(detail=False, methods=['GET'])
    def team_workload(self, request):
        """
        Get task distribution by team member.
        Returns workload statistics for each assignee.
        """
        user = request.user
        today = date.today()

        # Get accessible projects for the user
        accessible_projects = get_accessible_projects(user)

        # Get all tasks in accessible projects
        all_tasks = Task.objects.filter(
            sprint__milestone__project__in=accessible_projects
        )

        # Get workload by assignee
        workload_data = all_tasks.exclude(assignee__isnull=True).values(
            'assignee__id', 'assignee__username', 'assignee__email'
        ).annotate(
            total_tasks=Count('id'),
            completed_tasks=Count('id', filter=Q(status='Done')),
            in_progress_tasks=Count('id', filter=Q(status='In Progress')),
            todo_tasks=Count('id', filter=Q(status='To-do')),
            overdue_tasks=Count('id', filter=Q(due_date__lt=today) & ~Q(status='Done'))
        ).order_by('-total_tasks')

        team_members = []
        for member in workload_data:
            total = member['total_tasks']
            completed = member['completed_tasks']
            completion_rate = round((completed / total * 100) if total > 0 else 0, 1)

            username = member['assignee__username']
            initials = ''.join([n[0].upper() for n in username.split()[:2]]) if username else '?'

            team_members.append({
                'id': member['assignee__id'],
                'username': username,
                'email': member['assignee__email'],
                'initials': initials,
                'total_tasks': total,
                'completed_tasks': completed,
                'in_progress_tasks': member['in_progress_tasks'],
                'todo_tasks': member['todo_tasks'],
                'overdue_tasks': member['overdue_tasks'],
                'completion_rate': completion_rate,
            })

        # Summary stats
        total_assigned = sum(m['total_tasks'] for m in team_members)
        total_unassigned = all_tasks.filter(assignee__isnull=True).count()

        return Response({
            'team_members': team_members,
            'total_members': len(team_members),
            'total_assigned_tasks': total_assigned,
            'total_unassigned_tasks': total_unassigned,
        })

    # ---------------------------------------------------------
    #  PROJECTS PROGRESS (User-level)
    # ---------------------------------------------------------
    @action(detail=False, methods=['GET'])
    def projects_progress(self, request):
        """
        Get progress overview for all accessible projects.
        Returns completion percentage and task stats for each project.
        """
        user = request.user
        today = date.today()

        # Get accessible projects for the user
        accessible_projects = get_accessible_projects(user).filter(archived=False)

        projects_data = []
        for project in accessible_projects.prefetch_related('milestones', 'milestones__sprints'):
            all_tasks = Task.objects.filter(sprint__milestone__project=project)
            total_tasks = all_tasks.count()
            completed_tasks = all_tasks.filter(status='Done').count()
            in_progress_tasks = all_tasks.filter(status='In Progress').count()
            overdue_tasks = all_tasks.filter(due_date__lt=today).exclude(status='Done').count()

            completion_percentage = round((completed_tasks / total_tasks * 100) if total_tasks > 0 else 0, 1)

            projects_data.append({
                'id': project.id,
                'name': project.name,
                'status': project.status,
                'start_date': project.start_date.isoformat() if project.start_date else None,
                'end_date': project.end_date.isoformat() if project.end_date else None,
                'total_tasks': total_tasks,
                'completed_tasks': completed_tasks,
                'in_progress_tasks': in_progress_tasks,
                'overdue_tasks': overdue_tasks,
                'completion_percentage': completion_percentage,
            })

        # Sort by completion percentage (ascending - show least complete first)
        projects_data.sort(key=lambda x: x['completion_percentage'])

        return Response({
            'projects': projects_data,
            'total_projects': len(projects_data),
        })

    # ---------------------------------------------------------
    #  ACTIVE SPRINTS PROGRESS (User-level)
    # ---------------------------------------------------------
    @action(detail=False, methods=['GET'])
    def active_sprints(self, request):
        """
        Get active sprints with progress and burndown data.
        Returns sprint details with task completion stats.
        """
        user = request.user
        today = date.today()

        # Get accessible projects for the user
        accessible_projects = get_accessible_projects(user)

        # Get active sprints
        active_sprints = Sprint.objects.filter(
            milestone__project__in=accessible_projects,
            status__in=['active', 'in_progress', 'Active', 'In Progress']
        ).select_related('milestone__project')

        sprints_data = []
        for sprint in active_sprints[:5]:
            all_tasks = sprint.tasks.all()
            total_tasks = all_tasks.count()
            completed_tasks = all_tasks.filter(status='Done').count()
            in_progress_tasks = all_tasks.filter(status='In Progress').count()
            todo_tasks = all_tasks.filter(status='To-do').count()

            completion_percentage = round((completed_tasks / total_tasks * 100) if total_tasks > 0 else 0, 1)

            # Calculate days remaining
            days_remaining = None
            if sprint.end_date:
                days_remaining = (sprint.end_date - today).days

            sprints_data.append({
                'id': sprint.id,
                'name': sprint.name,
                'project_name': sprint.milestone.project.name if sprint.milestone and sprint.milestone.project else None,
                'milestone_name': sprint.milestone.name if sprint.milestone else None,
                'start_date': sprint.start_date.isoformat() if sprint.start_date else None,
                'end_date': sprint.end_date.isoformat() if sprint.end_date else None,
                'days_remaining': days_remaining,
                'total_tasks': total_tasks,
                'completed_tasks': completed_tasks,
                'in_progress_tasks': in_progress_tasks,
                'todo_tasks': todo_tasks,
                'completion_percentage': completion_percentage,
            })

        return Response({
            'sprints': sprints_data,
            'total_active': len(sprints_data),
        })

    # ---------------------------------------------------------
    #  TASK COMPLETION TREND (User-level)
    # ---------------------------------------------------------
    @action(detail=False, methods=['GET'])
    def task_completion_trend(self, request):
        """
        Get task completion trend over the last 4 weeks.
        Returns weekly task completion data for charting.
        """
        user = request.user
        today = date.today()

        # Get accessible projects for the user
        accessible_projects = get_accessible_projects(user)

        # Get tasks from the last 4 weeks
        four_weeks_ago = today - timedelta(days=28)

        all_tasks = Task.objects.filter(
            sprint__milestone__project__in=accessible_projects
        )

        # Calculate weekly data
        weeks_data = []
        for week_num in range(4):
            week_start = today - timedelta(days=(3 - week_num) * 7 + 6)
            week_end = today - timedelta(days=(3 - week_num) * 7)

            # Tasks completed this week (based on updated_at for Done status)
            completed_this_week = all_tasks.filter(
                status='Done',
                updated_at__date__gte=week_start,
                updated_at__date__lte=week_end
            ).count()

            # Tasks created this week
            created_this_week = all_tasks.filter(
                created_at__date__gte=week_start,
                created_at__date__lte=week_end
            ).count()

            weeks_data.append({
                'week': f'Week {week_num + 1}',
                'week_start': week_start.isoformat(),
                'week_end': week_end.isoformat(),
                'completed': completed_this_week,
                'created': created_this_week,
            })

        # Calculate totals
        total_completed = sum(w['completed'] for w in weeks_data)
        total_created = sum(w['created'] for w in weeks_data)

        return Response({
            'weeks': weeks_data,
            'total_completed': total_completed,
            'total_created': total_created,
            'trend': 'up' if weeks_data[-1]['completed'] >= weeks_data[0]['completed'] else 'down',
        })

    # ---------------------------------------------------------
    #  NOTIFICATIONS (User-level)
    # ---------------------------------------------------------
    @action(detail=False, methods=['GET'])
    def notifications(self, request):
        """
        Get recent notifications/alerts for the user.
        Returns task assignments, mentions, and deadline alerts.
        """
        user = request.user
        today = date.today()

        notifications = []

        # Get tasks assigned to user recently (last 7 days)
        recent_assignments = Task.objects.filter(
            assignee=user,
            created_at__date__gte=today - timedelta(days=7)
        ).select_related('sprint__milestone__project').order_by('-created_at')[:5]

        for task in recent_assignments:
            project_name = task.sprint.milestone.project.name if task.sprint and task.sprint.milestone and task.sprint.milestone.project else None
            notifications.append({
                'id': f'assign_{task.id}',
                'type': 'assignment',
                'title': 'New Task Assigned',
                'message': f'You were assigned to "{task.title}"',
                'project_name': project_name,
                'task_id': task.id,
                'timestamp': task.created_at.isoformat(),
                'read': False,
            })

        # Get overdue tasks
        overdue_tasks = Task.objects.filter(
            assignee=user,
            due_date__lt=today,
        ).exclude(status='Done').select_related('sprint__milestone__project')[:5]

        for task in overdue_tasks:
            days_overdue = (today - task.due_date).days
            project_name = task.sprint.milestone.project.name if task.sprint and task.sprint.milestone and task.sprint.milestone.project else None
            notifications.append({
                'id': f'overdue_{task.id}',
                'type': 'overdue',
                'title': 'Task Overdue',
                'message': f'"{task.title}" is {days_overdue} day(s) overdue',
                'project_name': project_name,
                'task_id': task.id,
                'timestamp': task.due_date.isoformat(),
                'read': False,
            })

        # Get tasks due today
        due_today_tasks = Task.objects.filter(
            assignee=user,
            due_date=today,
        ).exclude(status='Done').select_related('sprint__milestone__project')[:5]

        for task in due_today_tasks:
            project_name = task.sprint.milestone.project.name if task.sprint and task.sprint.milestone and task.sprint.milestone.project else None
            notifications.append({
                'id': f'due_{task.id}',
                'type': 'due_today',
                'title': 'Task Due Today',
                'message': f'"{task.title}" is due today',
                'project_name': project_name,
                'task_id': task.id,
                'timestamp': today.isoformat(),
                'read': False,
            })

        # Sort by timestamp (most recent first)
        notifications.sort(key=lambda x: x['timestamp'], reverse=True)

        return Response({
            'notifications': notifications[:10],
            'total': len(notifications),
            'unread_count': len([n for n in notifications if not n['read']]),
        })

    # ---------------------------------------------------------
    #  RECENTLY VIEWED (User-level)
    # ---------------------------------------------------------
    @action(detail=False, methods=['GET'])
    def recently_viewed(self, request):
        """
        Get recently viewed/accessed items based on activity log.
        Returns recent projects, tasks accessed by the user.
        """
        user = request.user

        # Get recent activity for this user
        recent_activities = ActivityLog.objects.filter(
            user=user
        ).order_by('-timestamp')[:20]

        # Track unique items
        seen_items = set()
        recent_items = []

        for activity in recent_activities:
            # content_type is stored as a string field
            content_type_str = str(activity.content_type) if activity.content_type else ''
            item_key = f"{content_type_str}_{activity.object_id}"
            if item_key in seen_items:
                continue
            seen_items.add(item_key)

            # Try to get the actual object
            item_data = {
                'id': activity.object_id,
                'type': content_type_str.lower() if content_type_str else 'unknown',
                'action': activity.action,
                'timestamp': activity.timestamp.isoformat(),
                'name': f'Item #{activity.object_id}',
            }

            # Try to resolve the object name based on content_type string
            model_name = content_type_str.lower()
            if model_name == 'task':
                try:
                    task = Task.objects.get(id=activity.object_id)
                    item_data['name'] = task.title
                    item_data['type'] = 'task'
                    item_data['status'] = task.status
                except Task.DoesNotExist:
                    item_data['name'] = f'Task #{activity.object_id}'
            elif model_name == 'project':
                try:
                    project = Project.objects.get(id=activity.object_id)
                    item_data['name'] = project.name
                    item_data['type'] = 'project'
                    item_data['status'] = project.status
                except Project.DoesNotExist:
                    item_data['name'] = f'Project #{activity.object_id}'
            elif model_name == 'sprint':
                try:
                    sprint = Sprint.objects.get(id=activity.object_id)
                    item_data['name'] = sprint.name
                    item_data['type'] = 'sprint'
                except Sprint.DoesNotExist:
                    item_data['name'] = f'Sprint #{activity.object_id}'
            elif model_name == 'milestone':
                try:
                    milestone = Milestone.objects.get(id=activity.object_id)
                    item_data['name'] = milestone.name
                    item_data['type'] = 'milestone'
                except Milestone.DoesNotExist:
                    item_data['name'] = f'Milestone #{activity.object_id}'
            elif model_name:
                item_data['name'] = f'{model_name.title()} #{activity.object_id}'

            recent_items.append(item_data)

            if len(recent_items) >= 10:
                break

        return Response({
            'items': recent_items,
            'total': len(recent_items),
        })

    # ---------------------------------------------------------
    #  TIME TRACKING SUMMARY (User-level)
    # ---------------------------------------------------------
    @action(detail=False, methods=['GET'])
    def time_tracking_summary(self, request):
        """
        Get task productivity summary for the user.
        Returns task completion stats by project (time tracking placeholder).
        """
        user = request.user
        today = date.today()

        # Get accessible projects
        accessible_projects = get_accessible_projects(user)

        # Get tasks assigned to user
        user_tasks = Task.objects.filter(
            assignee=user,
            sprint__milestone__project__in=accessible_projects
        ).select_related('sprint__milestone__project')

        # Calculate stats by project
        project_stats = {}
        total_tasks = 0
        total_completed = 0

        for task in user_tasks:
            project_name = task.sprint.milestone.project.name if task.sprint and task.sprint.milestone and task.sprint.milestone.project else 'Unassigned'

            if project_name not in project_stats:
                project_stats[project_name] = {
                    'total': 0,
                    'completed': 0,
                    'in_progress': 0,
                }

            project_stats[project_name]['total'] += 1
            total_tasks += 1

            if task.status == 'Done':
                project_stats[project_name]['completed'] += 1
                total_completed += 1
            elif task.status == 'In Progress':
                project_stats[project_name]['in_progress'] += 1

        # Convert to list
        projects_list = [
            {
                'project_name': name,
                'estimated_hours': data['total'],  # Using task count as placeholder
                'logged_hours': data['completed'],  # Using completed count as placeholder
                'tasks_count': data['total'],
                'utilization': round((data['completed'] / data['total'] * 100) if data['total'] > 0 else 0, 1),
            }
            for name, data in project_stats.items()
        ]
        projects_list.sort(key=lambda x: x['tasks_count'], reverse=True)

        utilization = round((total_completed / total_tasks * 100) if total_tasks > 0 else 0, 1)

        return Response({
            'total_estimated_hours': total_tasks,  # Total tasks as placeholder
            'total_logged_hours': total_completed,  # Completed tasks as placeholder
            'utilization_percentage': utilization,
            'projects': projects_list[:5],
            'total_projects': len(projects_list),
        })

    # ---------------------------------------------------------
    #  USER WORKSPACES (User-level)
    # ---------------------------------------------------------
    @action(detail=False, methods=['GET'])
    def user_workspaces(self, request):
        """
        Get workspaces accessible to the user for workspace switcher.
        Returns list of workspaces with basic stats.
        """
        user = request.user

        # Get user's workspaces
        user_workspaces = Workspace.objects.filter(
            Q(owner=user) | Q(members=user)
        ).distinct()

        workspaces_data = []
        for workspace in user_workspaces:
            projects_count = workspace.projects.filter(archived=False).count()

            workspaces_data.append({
                'id': workspace.id,
                'name': workspace.name,
                'description': workspace.description,
                'is_owner': workspace.owner == user,
                'projects_count': projects_count,
                'created_at': workspace.created_at.isoformat(),
            })

        return Response({
            'workspaces': workspaces_data,
            'total': len(workspaces_data),
        })

    # ---------------------------------------------------------
    #  MILESTONE PROGRESS (User-level)
    # ---------------------------------------------------------
    @action(detail=False, methods=['GET'])
    def milestone_progress(self, request):
        """
        Get milestone progress overview.
        Returns milestones with completion stats.
        """
        user = request.user
        today = date.today()

        # Get filter parameters
        workspace_id = request.query_params.get('workspace_id')
        project_id = request.query_params.get('project_id')

        # Get accessible projects
        accessible_projects = get_accessible_projects(user).filter(archived=False)

        if workspace_id:
            accessible_projects = accessible_projects.filter(workspace_id=workspace_id)
        if project_id:
            accessible_projects = accessible_projects.filter(id=project_id)

        # Get milestones
        milestones = Milestone.objects.filter(
            project__in=accessible_projects
        ).select_related('project').prefetch_related('sprints', 'sprints__tasks')

        milestones_data = []
        for milestone in milestones[:10]:
            all_tasks = Task.objects.filter(sprint__milestone=milestone)
            total_tasks = all_tasks.count()
            completed_tasks = all_tasks.filter(status='Done').count()
            in_progress_tasks = all_tasks.filter(status='In Progress').count()
            overdue_tasks = all_tasks.filter(due_date__lt=today).exclude(status='Done').count()

            completion_percentage = round((completed_tasks / total_tasks * 100) if total_tasks > 0 else 0, 1)

            # Check if milestone is overdue
            is_overdue = milestone.end_date and milestone.end_date < today and completion_percentage < 100

            # Days remaining
            days_remaining = None
            if milestone.end_date:
                days_remaining = (milestone.end_date - today).days

            milestones_data.append({
                'id': milestone.id,
                'name': milestone.name,
                'project_name': milestone.project.name,
                'project_id': milestone.project.id,
                'status': milestone.status,
                'start_date': milestone.start_date.isoformat() if milestone.start_date else None,
                'end_date': milestone.end_date.isoformat() if milestone.end_date else None,
                'days_remaining': days_remaining,
                'is_overdue': is_overdue,
                'total_tasks': total_tasks,
                'completed_tasks': completed_tasks,
                'in_progress_tasks': in_progress_tasks,
                'overdue_tasks': overdue_tasks,
                'completion_percentage': completion_percentage,
            })

        # Sort by completion percentage (ascending - show least complete first)
        milestones_data.sort(key=lambda x: (x['is_overdue'], -x['completion_percentage']), reverse=True)

        return Response({
            'milestones': milestones_data,
            'total': len(milestones_data),
        })

    # ---------------------------------------------------------
    #  FILTER OPTIONS (User-level)
    # ---------------------------------------------------------
    @action(detail=False, methods=['GET'])
    def filter_options(self, request):
        """
        Get available filter options for the dashboard.
        Returns lists of workspaces, projects, assignees, etc.
        """
        user = request.user

        # Get user's workspaces
        user_workspaces = Workspace.objects.filter(
            Q(owner=user) | Q(members=user)
        ).distinct().values('id', 'name')

        # Get accessible projects
        accessible_projects = get_accessible_projects(user).filter(archived=False).values('id', 'name', 'workspace_id')

        # Get all assignees from accessible projects
        assignees = User.objects.filter(
            tasks_assigned__sprint__milestone__project__in=get_accessible_projects(user)
        ).distinct().values('id', 'username', 'email')

        # Status options
        status_options = [
            {'value': 'To-do', 'label': 'To-do'},
            {'value': 'In Progress', 'label': 'In Progress'},
            {'value': 'Review', 'label': 'Review'},
            {'value': 'Done', 'label': 'Done'},
        ]

        # Priority options
        priority_options = [
            {'value': 'Low', 'label': 'Low'},
            {'value': 'Medium', 'label': 'Medium'},
            {'value': 'High', 'label': 'High'},
            {'value': 'Critical', 'label': 'Critical'},
        ]

        # Date range options
        date_range_options = [
            {'value': 'today', 'label': 'Today'},
            {'value': 'this_week', 'label': 'This Week'},
            {'value': 'this_month', 'label': 'This Month'},
            {'value': 'last_30_days', 'label': 'Last 30 Days'},
            {'value': 'last_90_days', 'label': 'Last 90 Days'},
            {'value': 'all_time', 'label': 'All Time'},
        ]

        return Response({
            'workspaces': list(user_workspaces),
            'projects': list(accessible_projects),
            'assignees': list(assignees),
            'statuses': status_options,
            'priorities': priority_options,
            'date_ranges': date_range_options,
        })

    # ---------------------------------------------------------
    #  FILTERED DASHBOARD DATA (User-level)
    # ---------------------------------------------------------
    @action(detail=False, methods=['GET'])
    def filtered_overview(self, request):
        """
        Get dashboard overview with filters applied.
        Supports filtering by workspace, project, assignee, status, priority, date range.
        """
        user = request.user
        today = date.today()

        # Get filter parameters
        workspace_id = request.query_params.get('workspace_id')
        project_id = request.query_params.get('project_id')
        assignee_id = request.query_params.get('assignee_id')
        status_filter = request.query_params.get('status')
        priority_filter = request.query_params.get('priority')
        date_range = request.query_params.get('date_range', 'all_time')

        # Get accessible projects for the user
        accessible_projects = get_accessible_projects(user)

        # Apply workspace filter
        if workspace_id:
            accessible_projects = accessible_projects.filter(workspace_id=workspace_id)

        # Apply project filter
        if project_id:
            accessible_projects = accessible_projects.filter(id=project_id)

        # Get all tasks in accessible projects
        all_tasks = Task.objects.filter(sprint__milestone__project__in=accessible_projects)

        # Apply assignee filter
        if assignee_id:
            all_tasks = all_tasks.filter(assignee_id=assignee_id)

        # Apply status filter
        if status_filter:
            all_tasks = all_tasks.filter(status=status_filter)

        # Apply priority filter
        if priority_filter:
            all_tasks = all_tasks.filter(priority=priority_filter)

        # Apply date range filter
        if date_range == 'today':
            all_tasks = all_tasks.filter(due_date=today)
        elif date_range == 'this_week':
            week_start = today - timedelta(days=today.weekday())
            week_end = week_start + timedelta(days=6)
            all_tasks = all_tasks.filter(due_date__gte=week_start, due_date__lte=week_end)
        elif date_range == 'this_month':
            month_start = today.replace(day=1)
            all_tasks = all_tasks.filter(due_date__gte=month_start)
        elif date_range == 'last_30_days':
            all_tasks = all_tasks.filter(due_date__gte=today - timedelta(days=30))
        elif date_range == 'last_90_days':
            all_tasks = all_tasks.filter(due_date__gte=today - timedelta(days=90))

        # Calculate task statistics
        total_tasks = all_tasks.count()
        completed_tasks = all_tasks.filter(status='Done').count()
        pending_tasks = all_tasks.exclude(status='Done').count()
        overdue_tasks = all_tasks.filter(due_date__lt=today).exclude(status='Done').count()

        # Tasks by status
        tasks_by_status = {}
        for status_name in ['To-do', 'In Progress', 'Review', 'Done']:
            count = all_tasks.filter(status=status_name).count()
            if count > 0:
                key = status_name.lower().replace(' ', '_').replace('-', '')
                tasks_by_status[key] = count

        # Tasks by priority
        tasks_by_priority = {}
        for priority in ['Low', 'Medium', 'High', 'Critical']:
            count = all_tasks.filter(priority=priority).count()
            if count > 0:
                tasks_by_priority[priority.lower()] = count

        # Tasks by assignee
        tasks_by_assignee = all_tasks.exclude(assignee__isnull=True).values(
            'assignee__id', 'assignee__username'
        ).annotate(
            total=Count('id'),
            completed=Count('id', filter=Q(status='Done'))
        ).order_by('-total')[:10]

        return Response({
            'filters_applied': {
                'workspace_id': workspace_id,
                'project_id': project_id,
                'assignee_id': assignee_id,
                'status': status_filter,
                'priority': priority_filter,
                'date_range': date_range,
            },
            'total_projects': accessible_projects.count(),
            'total_tasks': total_tasks,
            'completed_tasks': completed_tasks,
            'pending_tasks': pending_tasks,
            'overdue_tasks': overdue_tasks,
            'tasks_by_status': tasks_by_status,
            'tasks_by_priority': tasks_by_priority,
            'tasks_by_assignee': list(tasks_by_assignee),
        })

    # =========================================================
    #  ADMIN/CEO DASHBOARD ENDPOINTS (For superadmin/staff only)
    # =========================================================

    # ---------------------------------------------------------
    #  ADMIN OVERVIEW - Comprehensive system-wide metrics
    # ---------------------------------------------------------
    @action(detail=False, methods=['GET'])
    def admin_overview(self, request):
        """
        CEO/Admin Dashboard Overview - Comprehensive system-wide metrics.
        
        **Requires: superuser or staff status**
        
        GET /api/dashboard/admin_overview/
        
        Returns:
            - Workspaces: total, user's owned
            - Projects: total, active, archived
            - Tasks: status distribution, overdue, due today/this week
            - Recent activity
        """
        user = request.user
        
        # Permission check: only superuser/staff can access
        if not is_admin_or_superuser(user):
            return Response(
                {'error': 'Permission denied. Admin or superuser access required.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        today = date.today()

        # Get user's workspaces
        user_workspaces = Workspace.objects.filter(
            Q(owner=user) | Q(members=user)
        ).distinct()

        # Get accessible projects
        accessible_projects = get_accessible_projects(user)
        
        # Get all tasks in accessible projects
        all_tasks = Task.objects.filter(sprint__milestone__project__in=accessible_projects)

        # Workspace stats
        workspace_stats = {
            'total': user_workspaces.count(),
            'as_owner': Workspace.objects.filter(owner=user).count(),
            'as_member': user_workspaces.count() - Workspace.objects.filter(owner=user).count()
        }

        # Project stats
        project_stats = {
            'total': accessible_projects.count(),
            'active': accessible_projects.filter(archived=False).count(),
            'archived': accessible_projects.filter(archived=True).count(),
            'by_status': list(accessible_projects.values('status').annotate(count=Count('id')))
        }

        # Task stats
        task_stats = {
            'total': all_tasks.count(),
            'status_distribution': {
                'todo': all_tasks.filter(status='To-do').count(),
                'in_progress': all_tasks.filter(status='In Progress').count(),
                'review': all_tasks.filter(status='Review').count(),
                'done': all_tasks.filter(status='Done').count()
            },
            'overdue': all_tasks.filter(due_date__lt=today).exclude(status='Done').count(),
            'due_today': all_tasks.filter(due_date=today).exclude(status='Done').count(),
            'due_this_week': all_tasks.filter(
                due_date__gte=today,
                due_date__lte=today + timedelta(days=7)
            ).exclude(status='Done').count(),
            'unassigned': all_tasks.filter(assignee__isnull=True).count()
        }

        # Recent activity (last 20 actions)
        recent_activity = ActivityLog.objects.filter(
            extra_info__has_key='workspace_id'
        ).order_by('-timestamp')[:20].values(
            'id', 'user__username', 'action', 'content_type', 'object_id', 'timestamp'
        )

        return Response({
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email
            },
            'workspaces': workspace_stats,
            'projects': project_stats,
            'tasks': task_stats,
            'recent_activity': list(recent_activity)
        })

    # ---------------------------------------------------------
    #  WORKSPACE OVERVIEW - Admin view
    # ---------------------------------------------------------
    @action(detail=False, methods=['GET'])
    def workspace_overview(self, request):
        """
        Admin Workspace Overview - Detailed metrics for workspaces.
        
        **Requires: superuser or staff status**
        
        GET /api/dashboard/workspace_overview/
        GET /api/dashboard/workspace_overview/?workspace_id=123
        
        Returns for each workspace:
            - Total projects / Active projects
            - Last activity
            - Member count
            - Project breakdown by status
        """
        user = request.user
        
        # Permission check: only superuser/staff can access
        if not is_admin_or_superuser(user):
            return Response(
                {'error': 'Permission denied. Admin or superuser access required.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        workspace_id = request.query_params.get('workspace_id')

        workspaces = Workspace.objects.filter(
            Q(owner=user) | Q(members=user)
        ).distinct()

        if workspace_id:
            workspaces = workspaces.filter(id=workspace_id)

        workspace_data = []
        for workspace in workspaces:
            projects = workspace.projects.all()
            
            # Last activity
            last_activity = ActivityLog.objects.filter(
                extra_info__workspace_id=workspace.id
            ).order_by('-timestamp').first()
            
            # Member count
            member_count = WorkspaceMember.objects.filter(workspace=workspace).count()
            
            # Project status breakdown
            project_status_counts = projects.values('status').annotate(count=Count('id'))

            workspace_data.append({
                'id': workspace.id,
                'name': workspace.name,
                'description': workspace.description,
                'is_owner': workspace.owner == user,
                'created_at': workspace.created_at,
                'updated_at': workspace.updated_at,
                'stats': {
                    'total_projects': projects.count(),
                    'active_projects': projects.filter(archived=False).count(),
                    'archived_projects': projects.filter(archived=True).count(),
                    'member_count': member_count,
                    'project_by_status': list(project_status_counts)
                },
                'last_activity': {
                    'action': last_activity.action if last_activity else None,
                    'timestamp': last_activity.timestamp if last_activity else None,
                    'user': last_activity.user.username if last_activity and last_activity.user else None
                } if last_activity else None
            })

        return Response({
            'workspaces': workspace_data,
            'total_workspaces': len(workspace_data)
        })

    # ---------------------------------------------------------
    #  PROJECT OVERVIEW - Admin view
    # ---------------------------------------------------------
    @action(detail=False, methods=['GET'])
    def project_overview(self, request):
        """
        Admin Project Overview - Detailed metrics for projects.
        
        **Requires: superuser or staff status**
        
        GET /api/dashboard/project_overview/
        GET /api/dashboard/project_overview/?project_id=123
        GET /api/dashboard/project_overview/?workspace_id=123
        
        Returns for each project:
            - % of milestones completed
            - % of tasks completed
            - Overdue tasks
            - Task status distribution
            - Assigned users
        """
        user = request.user
        
        # Permission check: only superuser/staff can access
        if not is_admin_or_superuser(user):
            return Response(
                {'error': 'Permission denied. Admin or superuser access required.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        project_id = request.query_params.get('project_id')
        workspace_id = request.query_params.get('workspace_id')
        today = date.today()

        projects = get_accessible_projects(user)

        if project_id:
            projects = projects.filter(id=project_id)
        if workspace_id:
            projects = projects.filter(workspace_id=workspace_id)

        project_data = []
        for project in projects.prefetch_related('milestones', 'milestones__sprints', 'milestones__sprints__tasks'):
            project_completion = project.calculate_completion_percentage()
            milestones = project.milestones.all()
            completed_milestones = sum(1 for m in milestones if m.calculate_completion_percentage() == 100)
            
            all_tasks = Task.objects.filter(sprint__milestone__project=project)
            total_tasks = all_tasks.count()
            completed_tasks = all_tasks.filter(status='Done').count()
            overdue_tasks = all_tasks.filter(due_date__lt=today).exclude(status='Done').count()
            
            task_status_dist = all_tasks.values('status').annotate(count=Count('id'))
            assigned_users = all_tasks.exclude(assignee__isnull=True).values(
                'assignee__id', 'assignee__username'
            ).annotate(task_count=Count('id')).order_by('-task_count')

            project_data.append({
                'id': project.id,
                'name': project.name,
                'workspace': {
                    'id': project.workspace.id,
                    'name': project.workspace.name
                },
                'status': project.status,
                'visibility': project.visibility,
                'archived': project.archived,
                'start_date': project.start_date,
                'end_date': project.end_date,
                'completion': {
                    'percentage': round(project_completion, 2),
                    'milestones_completed': completed_milestones,
                    'milestones_total': milestones.count(),
                    'milestones_completion_pct': round(
                        (completed_milestones / milestones.count() * 100) if milestones.count() > 0 else 0, 2
                    ),
                    'tasks_completed': completed_tasks,
                    'tasks_total': total_tasks,
                    'tasks_completion_pct': round(
                        (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0, 2
                    )
                },
                'tasks': {
                    'total': total_tasks,
                    'overdue': overdue_tasks,
                    'status_distribution': list(task_status_dist)
                },
                'assigned_users': list(assigned_users)[:10]
            })

        return Response({
            'projects': project_data,
            'total_projects': len(project_data)
        })

    # ---------------------------------------------------------
    #  MILESTONE OVERVIEW - Admin view
    # ---------------------------------------------------------
    @action(detail=False, methods=['GET'])
    def milestone_overview(self, request):
        """
        Admin Milestone Overview - Detailed metrics for milestones.
        
        **Requires: superuser or staff status**
        
        GET /api/dashboard/milestone_overview/
        GET /api/dashboard/milestone_overview/?milestone_id=123
        GET /api/dashboard/milestone_overview/?project_id=123
        
        Returns for each milestone:
            - % of tasks completed
            - Overdue tasks
            - Sprint breakdown
            - Task status distribution
        """
        user = request.user
        
        # Permission check: only superuser/staff can access
        if not is_admin_or_superuser(user):
            return Response(
                {'error': 'Permission denied. Admin or superuser access required.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        milestone_id = request.query_params.get('milestone_id')
        project_id = request.query_params.get('project_id')
        today = date.today()

        accessible_projects = get_accessible_projects(user)
        milestones = Milestone.objects.filter(project__in=accessible_projects)

        if milestone_id:
            milestones = milestones.filter(id=milestone_id)
        if project_id:
            milestones = milestones.filter(project_id=project_id)

        milestone_data = []
        for milestone in milestones.prefetch_related('sprints', 'sprints__tasks'):
            milestone_completion = milestone.calculate_completion_percentage()
            sprints = milestone.sprints.all()
            completed_sprints = sum(1 for s in sprints if s.calculate_completion_percentage() == 100)
            
            all_tasks = Task.objects.filter(sprint__milestone=milestone)
            total_tasks = all_tasks.count()
            completed_tasks = all_tasks.filter(status='Done').count()
            overdue_tasks = all_tasks.filter(due_date__lt=today).exclude(status='Done').count()
            task_status_dist = all_tasks.values('status').annotate(count=Count('id'))

            milestone_data.append({
                'id': milestone.id,
                'name': milestone.name,
                'project': {
                    'id': milestone.project.id,
                    'name': milestone.project.name
                },
                'status': milestone.status,
                'start_date': milestone.start_date,
                'end_date': milestone.end_date,
                'is_overdue': milestone.end_date < today and milestone_completion < 100,
                'completion': {
                    'percentage': round(milestone_completion, 2),
                    'sprints_completed': completed_sprints,
                    'sprints_total': sprints.count(),
                    'tasks_completed': completed_tasks,
                    'tasks_total': total_tasks,
                    'tasks_completion_pct': round(
                        (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0, 2
                    )
                },
                'tasks': {
                    'total': total_tasks,
                    'overdue': overdue_tasks,
                    'status_distribution': list(task_status_dist)
                }
            })

        return Response({
            'milestones': milestone_data,
            'total_milestones': len(milestone_data)
        })

    # ---------------------------------------------------------
    #  SPRINT OVERVIEW - Admin view
    # ---------------------------------------------------------
    @action(detail=False, methods=['GET'])
    def sprint_overview(self, request):
        """
        Admin Sprint Overview - Detailed metrics for sprints.
        
        **Requires: superuser or staff status**
        
        GET /api/dashboard/sprint_overview/
        GET /api/dashboard/sprint_overview/?sprint_id=123
        GET /api/dashboard/sprint_overview/?milestone_id=123
        GET /api/dashboard/sprint_overview/?project_id=123
        
        Returns for each sprint:
            - % of tasks completed
            - Overdue tasks
            - Task status distribution
            - Assigned users with task counts
        """
        user = request.user
        
        # Permission check: only superuser/staff can access
        if not is_admin_or_superuser(user):
            return Response(
                {'error': 'Permission denied. Admin or superuser access required.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        sprint_id = request.query_params.get('sprint_id')
        milestone_id = request.query_params.get('milestone_id')
        project_id = request.query_params.get('project_id')
        today = date.today()

        accessible_projects = get_accessible_projects(user)
        sprints = Sprint.objects.filter(milestone__project__in=accessible_projects)

        if sprint_id:
            sprints = sprints.filter(id=sprint_id)
        if milestone_id:
            sprints = sprints.filter(milestone_id=milestone_id)
        if project_id:
            sprints = sprints.filter(milestone__project_id=project_id)

        sprint_data = []
        for sprint in sprints.prefetch_related('tasks'):
            sprint_completion = sprint.calculate_completion_percentage()
            all_tasks = sprint.tasks.all()
            total_tasks = all_tasks.count()
            completed_tasks = all_tasks.filter(status='Done').count()
            overdue_tasks = all_tasks.filter(due_date__lt=today).exclude(status='Done').count()
            
            task_status_dist = all_tasks.values('status').annotate(count=Count('id'))
            task_priority_dist = all_tasks.values('priority').annotate(count=Count('id'))
            assigned_users = all_tasks.exclude(assignee__isnull=True).values(
                'assignee__id', 'assignee__username'
            ).annotate(task_count=Count('id')).order_by('-task_count')

            sprint_data.append({
                'id': sprint.id,
                'name': sprint.name,
                'milestone': {
                    'id': sprint.milestone.id,
                    'name': sprint.milestone.name
                },
                'project': {
                    'id': sprint.milestone.project.id,
                    'name': sprint.milestone.project.name
                },
                'status': sprint.status,
                'start_date': sprint.start_date,
                'end_date': sprint.end_date,
                'is_overdue': sprint.end_date < today and sprint_completion < 100,
                'completion': {
                    'percentage': round(sprint_completion, 2),
                    'tasks_completed': completed_tasks,
                    'tasks_total': total_tasks,
                    'tasks_completion_pct': round(
                        (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0, 2
                    )
                },
                'tasks': {
                    'total': total_tasks,
                    'overdue': overdue_tasks,
                    'status_distribution': list(task_status_dist),
                    'priority_distribution': list(task_priority_dist)
                },
                'assigned_users': list(assigned_users)
            })

        return Response({
            'sprints': sprint_data,
            'total_sprints': len(sprint_data)
        })

    # ---------------------------------------------------------
    #  TASK OVERVIEW - Admin view
    # ---------------------------------------------------------
    @action(detail=False, methods=['GET'])
    def task_overview(self, request):
        """
        Admin Task Overview - Comprehensive task metrics.
        
        **Requires: superuser or staff status**
        
        GET /api/dashboard/task_overview/
        GET /api/dashboard/task_overview/?sprint_id=123
        GET /api/dashboard/task_overview/?project_id=123
        GET /api/dashboard/task_overview/?workspace_id=123
        
        Returns:
            - Status distribution (To-do / In Progress / Review / Done)
            - Priority distribution
            - Assigned users with task counts
            - Overdue tasks list
            - Due today tasks list
        """
        user = request.user
        
        # Permission check: only superuser/staff can access
        if not is_admin_or_superuser(user):
            return Response(
                {'error': 'Permission denied. Admin or superuser access required.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        sprint_id = request.query_params.get('sprint_id')
        milestone_id = request.query_params.get('milestone_id')
        project_id = request.query_params.get('project_id')
        workspace_id = request.query_params.get('workspace_id')
        today = date.today()

        accessible_projects = get_accessible_projects(user)
        tasks = Task.objects.filter(sprint__milestone__project__in=accessible_projects)

        if sprint_id:
            tasks = tasks.filter(sprint_id=sprint_id)
        if milestone_id:
            tasks = tasks.filter(sprint__milestone_id=milestone_id)
        if project_id:
            tasks = tasks.filter(sprint__milestone__project_id=project_id)
        if workspace_id:
            tasks = tasks.filter(sprint__milestone__project__workspace_id=workspace_id)

        # Status distribution
        status_distribution = tasks.values('status').annotate(count=Count('id'))
        
        # Priority distribution
        priority_distribution = tasks.values('priority').annotate(count=Count('id'))
        
        # Assigned users with stats
        assigned_users = tasks.exclude(assignee__isnull=True).values(
            'assignee__id', 'assignee__username', 'assignee__email'
        ).annotate(
            total_tasks=Count('id'),
            completed_tasks=Count('id', filter=Q(status='Done')),
            overdue_tasks=Count('id', filter=Q(due_date__lt=today) & ~Q(status='Done'))
        ).order_by('-total_tasks')
        
        # Overdue tasks
        overdue_tasks = tasks.filter(due_date__lt=today).exclude(status='Done')
        
        # Due today
        due_today = tasks.filter(due_date=today).exclude(status='Done')
        
        # Due this week
        due_this_week = tasks.filter(
            due_date__gte=today,
            due_date__lte=today + timedelta(days=7)
        ).exclude(status='Done')

        return Response({
            'summary': {
                'total_tasks': tasks.count(),
                'completed': tasks.filter(status='Done').count(),
                'in_progress': tasks.filter(status='In Progress').count(),
                'to_do': tasks.filter(status='To-do').count(),
                'in_review': tasks.filter(status='Review').count(),
                'overdue': overdue_tasks.count(),
                'due_today': due_today.count(),
                'due_this_week': due_this_week.count(),
                'unassigned': tasks.filter(assignee__isnull=True).count()
            },
            'status_distribution': list(status_distribution),
            'priority_distribution': list(priority_distribution),
            'assigned_users': list(assigned_users),
            'overdue_tasks': list(overdue_tasks.values(
                'id', 'title', 'status', 'priority', 'due_date',
                'assignee__username', 'sprint__name'
            )[:20]),
            'due_today_tasks': list(due_today.values(
                'id', 'title', 'status', 'priority', 'due_date',
                'assignee__username', 'sprint__name'
            ))
        })

