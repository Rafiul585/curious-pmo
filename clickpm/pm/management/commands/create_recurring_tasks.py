from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
from django.core.management.base import BaseCommand
from django.db.models import Q

from pm.models.task_models import Task


def _next_due_date(current: date, recurrence: str) -> date:
    if recurrence == 'daily':
        return current + timedelta(days=1)
    if recurrence == 'weekly':
        return current + timedelta(weeks=1)
    if recurrence == 'biweekly':
        return current + timedelta(weeks=2)
    if recurrence == 'monthly':
        return current + relativedelta(months=1)
    return current + timedelta(weeks=1)


class Command(BaseCommand):
    help = 'Create next occurrence for recurring tasks that are marked Done.'

    def handle(self, *args, **options):
        today = date.today()
        created = 0

        # Find recurring tasks that are Done and have no pending recurrence already
        recurring_done = Task.objects.filter(
            recurrence__isnull=False,
            status='Done',
        ).exclude(
            # Skip if a child recurrence already exists that is not Done
            recurrences__status__in=['To-do', 'In Progress', 'Review']
        ).select_related('sprint', 'assignee', 'reporter')

        for task in recurring_done:
            # Respect recurrence_end
            if task.recurrence_end and today > task.recurrence_end:
                continue

            # Compute next due date from the task's due_date (or today if none)
            base_date = task.due_date or today
            next_due = _next_due_date(base_date, task.recurrence)

            # Don't spawn beyond recurrence_end
            if task.recurrence_end and next_due > task.recurrence_end:
                continue

            new_task = Task.objects.create(
                sprint=task.sprint,
                parent=task.parent,
                title=task.title,
                description=task.description,
                assignee=task.assignee,
                reporter=task.reporter,
                status='To-do',
                priority=task.priority,
                start_date=today if task.start_date else None,
                due_date=next_due,
                estimated_hours=task.estimated_hours,
                recurrence=task.recurrence,
                recurrence_end=task.recurrence_end,
                recurrence_parent=task.recurrence_parent or task,
            )

            # Copy assignees M2M
            if task.assignees.exists():
                new_task.assignees.set(task.assignees.all())

            # Copy tags M2M
            if task.tags.exists():
                new_task.tags.set(task.tags.all())

            created += 1
            self.stdout.write(
                f'  Created recurrence of "{task.title}" (due {next_due})'
            )

        self.stdout.write(self.style.SUCCESS(f'Done — {created} recurring task(s) created.'))
