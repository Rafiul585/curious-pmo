from django.db.models import Q, Value, CharField
from django.db.models.functions import Concat
from pm.models import Task, Project, Milestone, Sprint, User
from pm.models.comment_models import Comment
from pm.models.workspace_models import Workspace, WorkspaceMember


class SearchService:
    """
    Service for global search across multiple models.
    """

    @staticmethod
    def search_all(query, user, limit=20):
        """
        Search across all searchable models.
        Returns categorized results.
        """
        if not query or len(query) < 2:
            return {
                'query': query,
                'error': 'Search query must be at least 2 characters',
                'results': {}
            }

        results = {
            'tasks': SearchService.search_tasks(query, user, limit),
            'projects': SearchService.search_projects(query, user, limit),
            'milestones': SearchService.search_milestones(query, user, limit),
            'sprints': SearchService.search_sprints(query, user, limit),
            'users': SearchService.search_users(query, limit),
        }

        total_count = sum(r['count'] for r in results.values())

        return {
            'query': query,
            'total_count': total_count,
            'results': results,
        }

    @staticmethod
    def search_tasks(query, user, limit=20):
        """
        Search tasks by title and description.
        Respects user's access permissions.
        """
        from pm.utils.permission_helpers import get_accessible_projects

        accessible_projects = get_accessible_projects(user)

        tasks = Task.objects.filter(
            Q(title__icontains=query) | Q(description__icontains=query),
            Q(sprint__milestone__project__in=accessible_projects) |
            Q(assignee=user) |
            Q(reporter=user)
        ).distinct().select_related(
            'assignee', 'sprint', 'sprint__milestone', 'sprint__milestone__project'
        )[:limit]

        return {
            'count': tasks.count(),
            'items': [
                {
                    'id': task.id,
                    'type': 'task',
                    'title': task.title,
                    'description': task.description[:100] if task.description else None,
                    'status': task.status,
                    'priority': task.priority,
                    'assignee': task.assignee.username if task.assignee else None,
                    'project': {
                        'id': task.sprint.milestone.project.id,
                        'name': task.sprint.milestone.project.name,
                    } if task.sprint and task.sprint.milestone else None,
                    'sprint': {
                        'id': task.sprint.id,
                        'name': task.sprint.name,
                    } if task.sprint else None,
                }
                for task in tasks
            ]
        }

    @staticmethod
    def search_projects(query, user, limit=20):
        """
        Search projects by name and description.
        Respects user's access permissions.
        """
        from pm.utils.permission_helpers import get_accessible_projects

        accessible_projects = get_accessible_projects(user)

        projects = accessible_projects.filter(
            Q(name__icontains=query) | Q(description__icontains=query)
        ).select_related('workspace')[:limit]

        return {
            'count': projects.count(),
            'items': [
                {
                    'id': project.id,
                    'type': 'project',
                    'name': project.name,
                    'description': project.description[:100] if project.description else None,
                    'status': project.status,
                    'workspace': {
                        'id': project.workspace.id,
                        'name': project.workspace.name,
                    } if project.workspace else None,
                    'start_date': project.start_date.isoformat() if project.start_date else None,
                    'end_date': project.end_date.isoformat() if project.end_date else None,
                }
                for project in projects
            ]
        }

    @staticmethod
    def search_milestones(query, user, limit=20):
        """
        Search milestones by name and description.
        """
        from pm.utils.permission_helpers import get_accessible_projects

        accessible_projects = get_accessible_projects(user)

        milestones = Milestone.objects.filter(
            Q(name__icontains=query) | Q(description__icontains=query),
            project__in=accessible_projects
        ).select_related('project')[:limit]

        return {
            'count': milestones.count(),
            'items': [
                {
                    'id': milestone.id,
                    'type': 'milestone',
                    'name': milestone.name,
                    'description': milestone.description[:100] if milestone.description else None,
                    'status': milestone.status,
                    'project': {
                        'id': milestone.project.id,
                        'name': milestone.project.name,
                    },
                    'start_date': milestone.start_date.isoformat() if milestone.start_date else None,
                    'end_date': milestone.end_date.isoformat() if milestone.end_date else None,
                }
                for milestone in milestones
            ]
        }

    @staticmethod
    def search_sprints(query, user, limit=20):
        """
        Search sprints by name and description.
        """
        from pm.utils.permission_helpers import get_accessible_projects

        accessible_projects = get_accessible_projects(user)

        sprints = Sprint.objects.filter(
            Q(name__icontains=query) | Q(description__icontains=query),
            milestone__project__in=accessible_projects
        ).select_related('milestone', 'milestone__project')[:limit]

        return {
            'count': sprints.count(),
            'items': [
                {
                    'id': sprint.id,
                    'type': 'sprint',
                    'name': sprint.name,
                    'description': sprint.description[:100] if sprint.description else None,
                    'status': sprint.status,
                    'milestone': {
                        'id': sprint.milestone.id,
                        'name': sprint.milestone.name,
                    },
                    'project': {
                        'id': sprint.milestone.project.id,
                        'name': sprint.milestone.project.name,
                    },
                    'start_date': sprint.start_date.isoformat() if sprint.start_date else None,
                    'end_date': sprint.end_date.isoformat() if sprint.end_date else None,
                }
                for sprint in sprints
            ]
        }

    @staticmethod
    def search_users(query, limit=20):
        """
        Search users by username, first name, last name, or email.
        """
        users = User.objects.filter(
            Q(username__icontains=query) |
            Q(first_name__icontains=query) |
            Q(last_name__icontains=query) |
            Q(email__icontains=query)
        ).filter(is_active=True)[:limit]

        return {
            'count': users.count(),
            'items': [
                {
                    'id': user.id,
                    'type': 'user',
                    'username': user.username,
                    'full_name': f"{user.first_name} {user.last_name}".strip() or user.username,
                    'email': user.email,
                }
                for user in users
            ]
        }

    @staticmethod
    def search_comments(query, user, limit=20):
        """
        Search comments by content.
        """
        from pm.utils.permission_helpers import get_accessible_projects

        accessible_projects = get_accessible_projects(user)

        comments = Comment.objects.filter(
            Q(content__icontains=query),
            Q(task__sprint__milestone__project__in=accessible_projects) |
            Q(sprint__milestone__project__in=accessible_projects) |
            Q(project__in=accessible_projects)
        ).select_related('author', 'task', 'sprint', 'project')[:limit]

        return {
            'count': comments.count(),
            'items': [
                {
                    'id': comment.id,
                    'type': 'comment',
                    'content': comment.content[:100] if comment.content else None,
                    'author': comment.author.username if comment.author else None,
                    'target_type': 'task' if comment.task else ('sprint' if comment.sprint else 'project'),
                    'target_name': (
                        comment.task.title if comment.task else
                        (comment.sprint.name if comment.sprint else
                         (comment.project.name if comment.project else None))
                    ),
                    'created_at': comment.created_at.isoformat() if comment.created_at else None,
                }
                for comment in comments
            ]
        }

    @staticmethod
    def quick_search(query, user, limit=5):
        """
        Quick search returning top results from each category.
        Useful for autocomplete/typeahead functionality.
        """
        if not query or len(query) < 2:
            return {'query': query, 'results': []}

        results = []

        # Get top tasks
        tasks = SearchService.search_tasks(query, user, limit)
        for item in tasks['items']:
            item['category'] = 'task'
            results.append(item)

        # Get top projects
        projects = SearchService.search_projects(query, user, limit)
        for item in projects['items']:
            item['category'] = 'project'
            results.append(item)

        # Get top users
        users = SearchService.search_users(query, limit)
        for item in users['items']:
            item['category'] = 'user'
            results.append(item)

        return {
            'query': query,
            'results': results[:limit * 3],  # Limit total results
        }
