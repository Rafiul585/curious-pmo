from datetime import date, timedelta
from collections import defaultdict


def get_sprint_burndown(sprint) -> dict:
    """
    Build ideal vs. actual burndown data for a sprint.

    ideal  — linear descent from total_tasks on day-0 to 0 on the last day.
    actual — remaining tasks per day, derived from ActivityLog.  Future days
             are None so the frontend can stop the line at today.
    """
    from pm.models.activity_models import ActivityLog
    from pm.services.audit_service import EventType

    today = date.today()
    start: date = sprint.start_date
    end: date = sprint.end_date
    total_tasks: int = sprint.tasks.count()

    num_days = (end - start).days + 1
    labels = [(start + timedelta(days=i)).isoformat() for i in range(num_days)]

    # Ideal: linear from total_tasks → 0
    if num_days > 1:
        ideal = [
            round(total_tasks - total_tasks * i / (num_days - 1), 2)
            for i in range(num_days)
        ]
    else:
        ideal = [float(total_tasks)]

    # Actual: replay ActivityLog for this sprint
    # extra_info contains {'sprint_id': ..., 'old_status': ..., 'new_status': ...}
    logs = ActivityLog.objects.filter(
        action=EventType.TASK_STATUS_CHANGED,
        extra_info__sprint_id=sprint.id,
    ).order_by('timestamp')

    net_completions: dict[date, int] = defaultdict(int)
    for log in logs:
        info = log.extra_info or {}
        old_s = info.get('old_status', '')
        new_s = info.get('new_status', '')
        log_date = log.timestamp.date()
        if new_s == 'Done' and old_s != 'Done':
            net_completions[log_date] += 1
        elif old_s == 'Done' and new_s != 'Done':
            net_completions[log_date] -= 1

    chart_end = min(today, end)
    remaining = total_tasks
    actual = []
    for i in range(num_days):
        day = start + timedelta(days=i)
        if day > chart_end:
            actual.append(None)
        else:
            remaining -= net_completions.get(day, 0)
            actual.append(remaining)

    return {
        'sprint_start': start.isoformat(),
        'sprint_end': end.isoformat(),
        'total_tasks': total_tasks,
        'labels': labels,
        'ideal': ideal,
        'actual': actual,
    }
