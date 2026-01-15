from pm.models import Project, Milestone, Sprint, Task, TaskDependency


def get_timeline_data(project_id):
    """
    Get timeline/Gantt chart data for a specific project.
    Returns hierarchical data with milestones, sprints, and tasks.
    """
    try:
        project = Project.objects.get(id=project_id)
    except Project.DoesNotExist:
        return None

    items = []

    # Project bar
    items.append({
        'id': f'project-{project.id}',
        'type': 'project',
        'name': project.name,
        'start_date': project.start_date.isoformat() if project.start_date else None,
        'end_date': project.end_date.isoformat() if project.end_date else None,
        'progress': round(project.calculate_completion_percentage(), 1),
        'status': project.status,
        'parent_id': None,
        'level': 0,
        'editable': True,
    })

    # Milestones
    for milestone in project.milestones.all().order_by('start_date'):
        items.append({
            'id': f'milestone-{milestone.id}',
            'type': 'milestone',
            'name': milestone.name,
            'start_date': milestone.start_date.isoformat() if milestone.start_date else None,
            'end_date': milestone.end_date.isoformat() if milestone.end_date else None,
            'progress': round(milestone.calculate_completion_percentage(), 1),
            'status': milestone.status,
            'parent_id': f'project-{project.id}',
            'level': 1,
            'editable': True,
        })

        # Sprints
        for sprint in milestone.sprints.all().order_by('start_date'):
            items.append({
                'id': f'sprint-{sprint.id}',
                'type': 'sprint',
                'name': sprint.name,
                'start_date': sprint.start_date.isoformat() if sprint.start_date else None,
                'end_date': sprint.end_date.isoformat() if sprint.end_date else None,
                'progress': round(sprint.calculate_completion_percentage(), 1),
                'status': sprint.status,
                'parent_id': f'milestone-{milestone.id}',
                'level': 2,
                'editable': True,
            })

            # Tasks
            for task in sprint.tasks.all().order_by('start_date', 'id'):
                # Get dependencies
                dependencies = TaskDependency.objects.filter(task=task)
                dependency_ids = [f'task-{dep.depends_on.id}' for dep in dependencies]

                items.append({
                    'id': f'task-{task.id}',
                    'type': 'task',
                    'name': task.title,
                    'start_date': task.start_date.isoformat() if task.start_date else None,
                    'end_date': task.due_date.isoformat() if task.due_date else None,
                    'progress': 100 if task.status == 'Done' else (50 if task.status == 'In Progress' else (75 if task.status == 'Review' else 0)),
                    'status': task.status,
                    'priority': task.priority,
                    'assignee': {
                        'id': task.assignee.id,
                        'username': task.assignee.username,
                        'initials': (task.assignee.first_name[:1] + task.assignee.last_name[:1]).upper() if task.assignee.first_name and task.assignee.last_name else task.assignee.username[:2].upper(),
                    } if task.assignee else None,
                    'parent_id': f'sprint-{sprint.id}',
                    'level': 3,
                    'dependencies': dependency_ids,
                    'editable': True,
                })

    return {
        'project': {
            'id': project.id,
            'name': project.name,
            'start_date': project.start_date.isoformat() if project.start_date else None,
            'end_date': project.end_date.isoformat() if project.end_date else None,
        },
        'items': items,
        'total_items': len(items),
    }


def update_item_dates(item_type, item_id, start_date, end_date):
    """
    Update the dates for a timeline item (task, sprint, milestone).
    Returns the updated item or None if not found.
    """
    from datetime import datetime

    try:
        if item_type == 'task':
            item = Task.objects.get(id=item_id)
            if start_date:
                item.start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            if end_date:
                item.due_date = datetime.strptime(end_date, '%Y-%m-%d').date()
            item.save()
            return {'id': item.id, 'type': 'task', 'start_date': str(item.start_date), 'end_date': str(item.due_date)}

        elif item_type == 'sprint':
            item = Sprint.objects.get(id=item_id)
            if start_date:
                item.start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            if end_date:
                item.end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
            item.save()
            return {'id': item.id, 'type': 'sprint', 'start_date': str(item.start_date), 'end_date': str(item.end_date)}

        elif item_type == 'milestone':
            item = Milestone.objects.get(id=item_id)
            if start_date:
                item.start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            if end_date:
                item.end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
            item.save()
            return {'id': item.id, 'type': 'milestone', 'start_date': str(item.start_date), 'end_date': str(item.end_date)}

        elif item_type == 'project':
            item = Project.objects.get(id=item_id)
            if start_date:
                item.start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            if end_date:
                item.end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
            item.save()
            return {'id': item.id, 'type': 'project', 'start_date': str(item.start_date), 'end_date': str(item.end_date)}

    except (Task.DoesNotExist, Sprint.DoesNotExist, Milestone.DoesNotExist, Project.DoesNotExist):
        return None

    return None
