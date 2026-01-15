from pm.models import Task, Sprint, Project
from django.db.models import Q


# Kanban column definitions matching Task.STATUS_CHOICES
KANBAN_COLUMNS = [
    {'id': 'todo', 'name': 'To-do', 'status': 'To-do'},
    {'id': 'in_progress', 'name': 'In Progress', 'status': 'In Progress'},
    {'id': 'review', 'name': 'Review', 'status': 'Review'},
    {'id': 'done', 'name': 'Done', 'status': 'Done'},
]


def _serialize_task(task):
    """Serialize task for Kanban board"""
    return {
        'id': task.id,
        'title': task.title,
        'description': task.description,
        'status': task.status,
        'priority': task.priority,
        'start_date': task.start_date.isoformat() if task.start_date else None,
        'due_date': task.due_date.isoformat() if task.due_date else None,
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
        sprint = Sprint.objects.get(id=sprint_id)
    except Sprint.DoesNotExist:
        return None

    tasks = Task.objects.filter(sprint=sprint).select_related('assignee', 'reporter', 'sprint')

    columns = []
    for col in KANBAN_COLUMNS:
        column_tasks = tasks.filter(status=col['status']).order_by('due_date', '-priority', 'created_at')
        columns.append({
            'id': col['id'],
            'name': col['name'],
            'status': col['status'],
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
    ).select_related('assignee', 'reporter', 'sprint', 'sprint__milestone')

    columns = []
    for col in KANBAN_COLUMNS:
        column_tasks = tasks.filter(status=col['status']).order_by('due_date', '-priority', 'created_at')
        columns.append({
            'id': col['id'],
            'name': col['name'],
            'status': col['status'],
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
    )

    if project_id:
        tasks = tasks.filter(sprint__milestone__project_id=project_id)

    columns = []
    for col in KANBAN_COLUMNS:
        column_tasks = tasks.filter(status=col['status']).order_by('due_date', '-priority', 'created_at')
        columns.append({
            'id': col['id'],
            'name': col['name'],
            'status': col['status'],
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
    valid_statuses = [col['status'] for col in KANBAN_COLUMNS]
    if new_status not in valid_statuses:
        return {'error': f'Invalid status. Must be one of: {valid_statuses}'}

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
