import logging
from django.db.models.signals import post_save
from django.dispatch import receiver

from pm.models.task_models import Task
from pm.models.project_models import Sprint, Milestone
from pm.services.health_service import refresh_health

logger = logging.getLogger(__name__)


def _is_health_only_save(update_fields):
    """Return True when the save was triggered by refresh_health itself — skip to avoid recursion."""
    if update_fields and set(update_fields) == {'health_status'}:
        return True
    return False


@receiver(post_save, sender=Task)
def task_saved_refresh_health(sender, instance, **kwargs):
    if _is_health_only_save(kwargs.get('update_fields')):
        return
    sprint = instance.sprint
    if not sprint:
        return
    refresh_health(sprint)
    milestone = sprint.milestone
    if not milestone:
        return
    refresh_health(milestone)
    if milestone.project:
        refresh_health(milestone.project)


@receiver(post_save, sender=Sprint)
def sprint_saved_refresh_health(sender, instance, **kwargs):
    if _is_health_only_save(kwargs.get('update_fields')):
        return
    refresh_health(instance)
    milestone = instance.milestone
    if not milestone:
        return
    refresh_health(milestone)
    if milestone.project:
        refresh_health(milestone.project)


@receiver(post_save, sender=Milestone)
def milestone_saved_refresh_health(sender, instance, **kwargs):
    if _is_health_only_save(kwargs.get('update_fields')):
        return
    refresh_health(instance)
    if instance.project:
        refresh_health(instance.project)
