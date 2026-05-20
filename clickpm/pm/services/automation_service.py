import logging
from pm.models.project_models import AutomationRule

logger = logging.getLogger(__name__)


def evaluate_triggers(task, event_type: str, old_data: dict, new_data: dict):
    """
    Check all active automation rules for the task's project and fire matching ones.
    Called from task_views after every create/update.

    event_type: 'task_created' | 'status_change' | 'assignee_changed'
    old_data / new_data: dicts with relevant before/after values
    """
    try:
        project = task.sprint.milestone.project
    except Exception:
        return

    rules = AutomationRule.objects.filter(project=project, is_active=True, trigger=event_type)

    for rule in rules:
        try:
            if _conditions_match(rule, old_data, new_data):
                _execute_action(rule, task)
        except Exception as exc:
            logger.warning("Automation rule %s failed: %s", rule.id, exc)


def _conditions_match(rule: AutomationRule, old_data: dict, new_data: dict) -> bool:
    cond = rule.conditions or {}

    if rule.trigger == 'status_change':
        from_s = cond.get('from_status')
        to_s   = cond.get('to_status')
        if from_s and old_data.get('status') != from_s:
            return False
        if to_s and new_data.get('status') != to_s:
            return False

    return True


def _execute_action(rule: AutomationRule, task):
    params = rule.action_params or {}

    if rule.action == 'send_notification':
        _action_send_notification(rule, task, params)

    elif rule.action == 'change_status':
        new_status = params.get('status')
        if new_status and task.status != new_status:
            task.status = new_status
            task.save(update_fields=['status'])

    elif rule.action == 'change_priority':
        new_priority = params.get('priority')
        if new_priority and task.priority != new_priority:
            task.priority = new_priority
            task.save(update_fields=['priority'])

    elif rule.action == 'assign_to':
        from pm.models.user_models import User
        user_id = params.get('user_id')
        if user_id:
            try:
                user = User.objects.get(id=user_id)
                task.assignee = user
                task.save(update_fields=['assignee'])
            except User.DoesNotExist:
                pass


def _action_send_notification(rule: AutomationRule, task, params: dict):
    from pm.services.notification_service import NotificationService

    message = params.get('message') or f'Automation "{rule.name}" triggered on task "{task.title}"'
    notify  = params.get('notify', 'assignees')

    recipients = _resolve_recipients(task, notify)
    for recipient in recipients:
        NotificationService.create_notification(
            recipient=recipient,
            verb=message,
            notification_type='general',
            target=task,
            send_email=False,
        )


def _resolve_recipients(task, notify: str):
    recipients = []

    if notify == 'assignees':
        if task.assignee:
            recipients.append(task.assignee)
        recipients += list(task.assignees.all())

    elif notify == 'reporter':
        if task.reporter:
            recipients.append(task.reporter)

    elif notify == 'project_owner':
        try:
            from pm.models.workspace_models import WorkspaceMember
            project = task.sprint.milestone.project
            owner_memberships = WorkspaceMember.objects.filter(
                workspace=project.workspace, role__name='Owner'
            ).select_related('user')
            recipients = [m.user for m in owner_memberships]
            if not recipients and project.workspace:
                pass
        except Exception:
            pass

    elif notify == 'project_members':
        try:
            from pm.models.project_models import ProjectMember
            project = task.sprint.milestone.project
            recipients = [pm.user for pm in ProjectMember.objects.filter(project=project).select_related('user')]
        except Exception:
            pass

    # Deduplicate
    seen, unique = set(), []
    for u in recipients:
        if u.id not in seen:
            seen.add(u.id)
            unique.append(u)
    return unique
