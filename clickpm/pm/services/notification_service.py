import re
from django.contrib.contenttypes.models import ContentType
from django.conf import settings
from pm.models.notification_models import Notification
from pm.models.user_models import User
from pm.services.email_service import EmailService
import logging

logger = logging.getLogger(__name__)


class NotificationService:
    """
    Service for creating notifications and sending emails.
    """

    @staticmethod
    def create_notification(
        recipient,
        verb,
        notification_type='general',
        actor=None,
        target=None,
        send_email=True
    ):
        """
        Create an in-app notification and optionally send an email.

        Args:
            recipient: User to receive the notification
            verb: Description of the action (e.g., "mentioned you in a comment")
            notification_type: One of 'mention', 'login', 'deadline', 'assignment', 'comment', 'general'
            actor: User who performed the action (None for system notifications)
            target: The object related to the notification (Task, Project, etc.)
            send_email: Whether to also send an email notification

        Returns:
            The created Notification object
        """
        # Create in-app notification
        notification_data = {
            'recipient': recipient,
            'verb': verb,
            'notification_type': notification_type,
            'actor': actor,
        }

        if target:
            content_type = ContentType.objects.get_for_model(target)
            notification_data['target_content_type'] = content_type
            notification_data['target_object_id'] = target.id

        notification = Notification.objects.create(**notification_data)
        logger.info(f"Notification created for {recipient.username}: {verb}")

        # Send email if enabled
        if send_email and recipient.email:
            NotificationService._send_notification_email(
                recipient=recipient,
                verb=verb,
                notification_type=notification_type,
                actor=actor,
                target=target
            )

        return notification

    @staticmethod
    def _send_notification_email(recipient, verb, notification_type, actor, target):
        """
        Send email based on notification type.
        """
        try:
            target_name = ''
            if target:
                target_name = getattr(target, 'title', None) or getattr(target, 'name', 'item')

            subject = f"[CuriousPMO] {verb}"
            actor_name = actor.username if actor else 'System'

            message = f"""Hi {recipient.username},

{actor_name} {verb}

{f'Related to: {target_name}' if target_name else ''}

Log in to CuriousPMO to view more details.

Best regards,
CuriousPMO Team
"""

            EmailService.send_email(recipient.email, subject, message)
        except Exception as e:
            logger.error(f"Failed to send notification email: {e}")

    @staticmethod
    def notify_task_assignment(task, old_assignee=None):
        """
        Notify user when they are assigned to a task.
        """
        if not task.assignee:
            return None

        verb = f'assigned you to task "{task.title}"'
        actor = task.reporter or None  # Reporter is usually the one assigning

        notification = NotificationService.create_notification(
            recipient=task.assignee,
            verb=verb,
            notification_type='assignment',
            actor=actor,
            target=task,
            send_email=True
        )

        # Also send the specific assignment email
        EmailService.send_task_assignment_email(task.assignee, task)

        return notification

    @staticmethod
    def notify_task_status_change(task, old_status, actor=None):
        """
        Notify relevant users when task status changes.
        """
        notifications = []

        # Notify assignee if they didn't make the change
        if task.assignee and task.assignee != actor:
            verb = f'changed status of task "{task.title}" from {old_status} to {task.status}'
            notification = NotificationService.create_notification(
                recipient=task.assignee,
                verb=verb,
                notification_type='status_change',
                actor=actor,
                target=task,
                send_email=True
            )
            notifications.append(notification)

        # Notify reporter if they didn't make the change
        if task.reporter and task.reporter != actor and task.reporter != task.assignee:
            verb = f'changed status of task "{task.title}" from {old_status} to {task.status}'
            notification = NotificationService.create_notification(
                recipient=task.reporter,
                verb=verb,
                notification_type='status_change',
                actor=actor,
                target=task,
                send_email=True
            )
            notifications.append(notification)

        return notifications

    @staticmethod
    def notify_mention(comment, mentioned_user, actor):
        """
        Notify user when they are mentioned in a comment.
        """
        # Get the target (task/sprint/project) from the comment
        target = comment.task or comment.sprint or comment.project

        verb = f'mentioned you in a comment'
        notification = NotificationService.create_notification(
            recipient=mentioned_user,
            verb=verb,
            notification_type='mention',
            actor=actor,
            target=target,
            send_email=True
        )

        # Send specific mention email
        if target:
            EmailService.send_mention_email(mentioned_user, actor, comment, target)

        return notification

    @staticmethod
    def notify_new_comment(comment, actor):
        """
        Notify relevant users about a new comment.
        Excludes the actor (person who made the comment).
        """
        notifications = []
        target = comment.task or comment.sprint or comment.project
        notified_users = {actor.id}  # Don't notify the commenter

        if comment.task:
            task = comment.task
            # Notify assignee
            if task.assignee and task.assignee.id not in notified_users:
                verb = f'commented on task "{task.title}"'
                notification = NotificationService.create_notification(
                    recipient=task.assignee,
                    verb=verb,
                    notification_type='comment',
                    actor=actor,
                    target=task,
                    send_email=True
                )
                notifications.append(notification)
                notified_users.add(task.assignee.id)

            # Notify reporter
            if task.reporter and task.reporter.id not in notified_users:
                verb = f'commented on task "{task.title}"'
                notification = NotificationService.create_notification(
                    recipient=task.reporter,
                    verb=verb,
                    notification_type='comment',
                    actor=actor,
                    target=task,
                    send_email=True
                )
                notifications.append(notification)
                notified_users.add(task.reporter.id)

        return notifications

    @staticmethod
    def notify_deadline(recipient, target, target_type, days_until=1):
        """
        Create deadline notification and send email.
        """
        name = getattr(target, 'title', None) or getattr(target, 'name', 'Unknown')

        if days_until == 0:
            verb = f'{target_type.capitalize()} "{name}" is due today'
        elif days_until == 1:
            verb = f'{target_type.capitalize()} "{name}" is due tomorrow'
        else:
            verb = f'{target_type.capitalize()} "{name}" is due in {days_until} days'

        notification = NotificationService.create_notification(
            recipient=recipient,
            verb=verb,
            notification_type='deadline',
            actor=None,  # System notification
            target=target,
            send_email=True
        )

        # Send specific deadline email
        EmailService.send_deadline_reminder_email(recipient, target, target_type, days_until)

        return notification

    @staticmethod
    def notify_project_member_added(user, project, inviter):
        """
        Notify user when they are added to a project.
        """
        verb = f'added you to project "{project.name}"'

        notification = NotificationService.create_notification(
            recipient=user,
            verb=verb,
            notification_type='member_added',
            actor=inviter,
            target=project,
            send_email=True
        )

        # Send specific invitation email
        EmailService.send_project_invitation_email(user, project, inviter)

        return notification

    @staticmethod
    def extract_mentions(text):
        """
        Extract @username mentions from text.
        Returns list of usernames mentioned.
        """
        pattern = r'@(\w+)'
        mentions = re.findall(pattern, text)
        return mentions

    @staticmethod
    def process_mentions_in_comment(comment, actor):
        """
        Process a comment and create notifications for mentioned users.
        """
        mentions = NotificationService.extract_mentions(comment.content)
        notifications = []

        for username in mentions:
            try:
                user = User.objects.get(username=username)
                if user.id != actor.id:  # Don't notify yourself
                    notification = NotificationService.notify_mention(comment, user, actor)
                    notifications.append(notification)
            except User.DoesNotExist:
                logger.warning(f"Mentioned user not found: {username}")
                continue

        return notifications

    @staticmethod
    def mark_all_as_read(user):
        """
        Mark all notifications as read for a user.
        """
        count = Notification.objects.filter(recipient=user, read=False).update(read=True)
        return count

    @staticmethod
    def get_unread_count(user):
        """
        Get count of unread notifications for a user.
        """
        return Notification.objects.filter(recipient=user, read=False).count()
