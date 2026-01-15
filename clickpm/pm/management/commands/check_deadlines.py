from django.core.management.base import BaseCommand
from django.utils import timezone
from django.conf import settings
from datetime import timedelta
from pm.models.task_models import Task
from pm.models.project_models import Sprint, Milestone, Project
from pm.models.notification_models import Notification
from pm.services.notification_service import NotificationService
from django.contrib.contenttypes.models import ContentType


class Command(BaseCommand):
    help = 'Check for upcoming deadlines and create notifications with email alerts'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=1,
            help='Number of days ahead to check for deadlines (default: 1)'
        )
        parser.add_argument(
            '--no-email',
            action='store_true',
            help='Skip sending email notifications'
        )

    def handle(self, *args, **options):
        days_ahead = options['days']
        send_email = not options['no_email'] and getattr(settings, 'EMAIL_NOTIFICATIONS_ENABLED', True)
        today = timezone.now().date()
        target_date = today + timedelta(days=days_ahead)

        self.stdout.write(f'Checking for deadlines on {target_date}...')
        self.stdout.write(f'Email notifications: {"enabled" if send_email else "disabled"}')

        total_notifications = 0

        # Check Tasks
        tasks_due = Task.objects.filter(
            due_date=target_date,
            assignee__isnull=False
        ).exclude(status='Done')

        for task in tasks_due:
            if not self._notification_exists(task.assignee, task):
                NotificationService.notify_deadline(
                    recipient=task.assignee,
                    target=task,
                    target_type='task',
                    days_until=days_ahead
                )
                total_notifications += 1

        self.stdout.write(f'  Tasks: {tasks_due.count()} due, {total_notifications} new notifications')

        # Check Sprints
        sprints_ending = Sprint.objects.filter(end_date=target_date).exclude(status='Completed')
        sprint_notifications = 0

        for sprint in sprints_ending:
            if sprint.milestone and sprint.milestone.project:
                project = sprint.milestone.project
                for member in project.members.all():
                    if not self._notification_exists(member, sprint):
                        NotificationService.notify_deadline(
                            recipient=member,
                            target=sprint,
                            target_type='sprint',
                            days_until=days_ahead
                        )
                        sprint_notifications += 1

        total_notifications += sprint_notifications
        self.stdout.write(f'  Sprints: {sprints_ending.count()} ending, {sprint_notifications} notifications')

        # Check Milestones
        milestones_ending = Milestone.objects.filter(end_date=target_date).exclude(status='Completed')
        milestone_notifications = 0

        for milestone in milestones_ending:
            if milestone.project:
                for member in milestone.project.members.all():
                    if not self._notification_exists(member, milestone):
                        NotificationService.notify_deadline(
                            recipient=member,
                            target=milestone,
                            target_type='milestone',
                            days_until=days_ahead
                        )
                        milestone_notifications += 1

        total_notifications += milestone_notifications
        self.stdout.write(f'  Milestones: {milestones_ending.count()} ending, {milestone_notifications} notifications')

        # Check Projects
        projects_ending = Project.objects.filter(end_date=target_date).exclude(status='Completed')
        project_notifications = 0

        for project in projects_ending:
            for member in project.members.all():
                if not self._notification_exists(member, project):
                    NotificationService.notify_deadline(
                        recipient=member,
                        target=project,
                        target_type='project',
                        days_until=days_ahead
                    )
                    project_notifications += 1

        total_notifications += project_notifications
        self.stdout.write(f'  Projects: {projects_ending.count()} ending, {project_notifications} notifications')

        self.stdout.write(self.style.SUCCESS(
            f'Deadline check completed! Total: {total_notifications} notifications created.'
        ))

    def _notification_exists(self, recipient, target):
        """
        Check if a deadline notification already exists for this target and recipient
        within the last 24 hours.
        """
        content_type = ContentType.objects.get_for_model(target)
        return Notification.objects.filter(
            recipient=recipient,
            notification_type='deadline',
            target_content_type=content_type,
            target_object_id=target.id,
            timestamp__gte=timezone.now() - timedelta(hours=24)
        ).exists()
