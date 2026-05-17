import logging
from datetime import date

logger = logging.getLogger(__name__)

# Statuses that mean the item is finished
DONE_STATUSES = {'Done', 'Completed'}

# Severity order used for degradation detection (A5)
SEVERITY = {'on_track': 0, 'at_risk': 1, 'behind': 2, 'critical': 3}


def calculate_health_status(entity) -> str:
    """
    Derive health_status for a Project, Milestone, or Sprint.

    Logic:
      ratio = completion_pct / time_elapsed_pct
      >= 0.9 → on_track
      >= 0.6 → at_risk
      >= 0.3 → behind
       < 0.3 → critical
    """
    today = date.today()
    start  = getattr(entity, 'start_date', None)
    end    = getattr(entity, 'end_date', None)
    status = getattr(entity, 'status', '')

    # Already finished — always healthy
    if status in DONE_STATUSES:
        return 'on_track'

    # Can't calculate without dates — leave unchanged
    if not start or not end:
        return entity.health_status or 'on_track'

    # Past deadline and not done
    if end < today:
        return 'critical'

    total_days   = (end - start).days
    elapsed_days = (today - start).days

    # Hasn't started yet
    if elapsed_days <= 0:
        return 'on_track'

    time_elapsed_pct = (elapsed_days / total_days * 100) if total_days > 0 else 100
    completion_pct   = entity.calculate_completion_percentage()

    ratio = completion_pct / time_elapsed_pct if time_elapsed_pct > 0 else 1.0

    if ratio >= 0.9:
        return 'on_track'
    elif ratio >= 0.6:
        return 'at_risk'
    elif ratio >= 0.3:
        return 'behind'
    else:
        return 'critical'


def refresh_health(entity, save=True) -> None:
    """Recalculate and optionally persist health_status on a single entity."""
    new_status = calculate_health_status(entity)
    if entity.health_status == new_status:
        return

    old_status = entity.health_status
    entity.health_status = new_status

    if save:
        entity.save(update_fields=['health_status'])

    logger.debug(
        "%s '%s' health: %s → %s",
        entity.__class__.__name__, entity.name, old_status, new_status
    )

    # Fire degradation notification only when severity worsens
    if SEVERITY.get(new_status, 0) > SEVERITY.get(old_status, 0):
        try:
            from pm.services.notification_service import NotificationService
            NotificationService.create_health_alert(entity, old_status, new_status)
        except Exception as e:
            logger.error("Failed to send health degradation alert for %s '%s': %s", entity.__class__.__name__, entity.name, e)


def refresh_project_tree_health(project) -> None:
    """Refresh health for every Sprint and Milestone under a project, then the project itself."""
    for milestone in project.milestones.all():
        for sprint in milestone.sprints.all():
            refresh_health(sprint)
        refresh_health(milestone)
    refresh_health(project)
