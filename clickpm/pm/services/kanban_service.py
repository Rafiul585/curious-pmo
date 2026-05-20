from pm.models import Task, Sprint, Project
from django.db.models import Q


# Default kanban column definitions (used when project has no custom statuses)
KANBAN_COLUMNS = [
    {'id': 'todo', 'name': 'To-do', 'status': 'To-do', 'color': '#9e9e9e', 'is_done_state': False},
    {'id': 'in_progress', 'name': 'In Progress', 'status': 'In Progress', 'color': '#2196f3', 'is_done_state': False},
    {'id': 'review', 'name': 'Review', 'status': 'Review', 'color': '#ff9800', 'is_done_state': False},
    {'id': 'done', 'name': 'Done', 'status': 'Done', 'color': '#4caf50', 'is_done_state': True},
]


def _get_columns_for_project(project):
    """Return kanban column definitions for a project, using custom statuses if defined."""
    from pm.models.project_models import ProjectStatus
    custom = list(ProjectStatus.objects.filter(project=project).order_by('order', 'id'))
    if custom:
        return [
            {
                'id': f'status_{ps.id}',
                'name': ps.name,
                'status': ps.name,
                'color': ps.color,
                'is_done_state': ps.is_done_state,
            }
            for ps in custom
        ]
    return KANBAN_COLUMNS


def _serialize_task(task):
    """Serialize task for Kanban board"""
    # Use prefetched dependent_on when available to avoid N+1
    is_blocked = any(
        dep.type == 'Blocked By' and dep.depends_on.status in ('To-do', 'In Progress', 'Review')
        for dep in task.dependent_on.all()
    )
    return {
        'id': task.id,
        'title': task.title,
        'description': task.description,
        'status': task.status,
        'priority': task.priority,
        'start_date': task.start_date.isoformat() if task.start_date else None,
        'due_date': task.due_date.isoformat() if task.due_date else None,
        'is_blocked': is_blocked,
        'assignee': {
            'id': task.assignee.id,
            'username': task.assignee.username,
        } if task.assignee else None,
        'reporter': {
            'id': task.reporter.id,
            'username': task.reporter.username,
        } if task.reporter else None,
        'sprint': {
            'id': task.sprint.id,
            'name': task.sprint.name,
        },
        'created_at': task.created_at.isoformat(),
        'updated_at': task.updated_at.isoformat(),
    }


def get_kanban_for_sprint(sprint_id):
    """
    Get Kanban board data for a specific sprint.
    Returns tasks grouped by status columns.
    """
    try:
        sprint = Sprint.objects.select_related('milestone__project').get(id=sprint_id)
    except Sprint.DoesNotExist:
        return None

    tasks = Task.objects.filter(sprint=sprint).select_related(
        'assignee', 'reporter', 'sprint'
    ).prefetch_related('dependent_on__depends_on')

    columns_def = _get_columns_for_project(sprint.milestone.project)
    columns = []
    for col in columns_def:
        column_tasks = tasks.filter(status=col['status']).order_by('position', 'due_date', '-priority', 'created_at')
        columns.append({
            'id': col['id'],
            'name': col['name'],
            'status': col['status'],
            'color': col['color'],
            'tasks': [_serialize_task(t) for t in column_tasks],
            'count': column_tasks.count(),
        })

    return {
        'sprint': {
            'id': sprint.id,
            'name': sprint.name,
            'milestone': {
                'id': sprint.milestone.id,
                'name': sprint.milestone.name,
            },
            'project': {
                'id': sprint.milestone.project.id,
                'name': sprint.milestone.project.name,
            },
        },
        'columns': columns,
        'total_tasks': tasks.count(),
    }


def get_kanban_for_project(project_id):
    """
    Get Kanban board data for an entire project.
    Returns all tasks across all sprints grouped by status columns.
    """
    try:
        project = Project.objects.get(id=project_id)
    except Project.DoesNotExist:
        return None

    tasks = Task.objects.filter(
        sprint__milestone__project=project
    ).select_related(
        'assignee', 'reporter', 'sprint', 'sprint__milestone'
    ).prefetch_related('dependent_on__depends_on')

    columns_def = _get_columns_for_project(project)
    columns = []
    for col in columns_def:
        column_tasks = tasks.filter(status=col['status']).order_by('position', 'due_date', '-priority', 'created_at')
        columns.append({
            'id': col['id'],
            'name': col['name'],
            'status': col['status'],
            'color': col['color'],
            'tasks': [_serialize_task(t) for t in column_tasks],
            'count': column_tasks.count(),
        })

    return {
        'project': {
            'id': project.id,
            'name': project.name,
        },
        'columns': columns,
        'total_tasks': tasks.count(),
    }


def get_kanban_for_user(user, project_id=None):
    """
    Get Kanban board data for a user's assigned tasks.
    Optionally filtered by project.
    """
    tasks = Task.objects.filter(assignee=user).select_related(
        'assignee', 'reporter', 'sprint', 'sprint__milestone', 'sprint__milestone__project'
    ).prefetch_related('dependent_on__depends_on')

    if project_id:
        tasks = tasks.filter(sprint__milestone__project_id=project_id)

    columns = []
    for col in KANBAN_COLUMNS:
        column_tasks = tasks.filter(status=col['status']).order_by('position', 'due_date', '-priority', 'created_at')
        columns.append({
            'id': col['id'],
            'name': col['name'],
            'status': col['status'],
            'color': col['color'],
            'tasks': [_serialize_task(t) for t in column_tasks],
            'count': column_tasks.count(),
        })

    return {
        'user': {
            'id': user.id,
            'username': user.username,
        },
        'project_filter': project_id,
        'columns': columns,
        'total_tasks': tasks.count(),
    }


def move_task_to_column(task_id, new_status, user=None):
    """
    Move a task to a different Kanban column (change status).
    Returns the updated task or None if not found.
    """
    if not new_status or not isinstance(new_status, str):
        return {'error': 'Invalid status'}

    try:
        task = Task.objects.get(id=task_id)
    except Task.DoesNotExist:
        return None

    old_status = task.status
    task.status = new_status
    task.save()

    return {
        'id': task.id,
        'title': task.title,
        'old_status': old_status,
        'new_status': new_status,
        'success': True,
    }
