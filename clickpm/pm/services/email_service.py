from django.core.mail import send_mail, EmailMultiAlternatives
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags
import logging

logger = logging.getLogger(__name__)


class EmailService:
    """
    Service for sending email notifications.
    """

    @staticmethod
    def is_enabled():
        """Check if email notifications are enabled."""
        return getattr(settings, 'EMAIL_NOTIFICATIONS_ENABLED', True)

    @staticmethod
    def send_email(to_email, subject, message, html_message=None):
        """
        Send a simple email.
        Returns True if sent successfully, False otherwise.
        """
        if not EmailService.is_enabled():
            logger.info(f"Email notifications disabled. Skipping email to {to_email}")
            return False

        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[to_email] if isinstance(to_email, str) else to_email,
                html_message=html_message,
                fail_silently=False,
            )
            logger.info(f"Email sent to {to_email}: {subject}")
            return True
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return False

    @staticmethod
    def send_task_assignment_email(user, task):
        """
        Send email when a task is assigned to a user.
        """
        subject = f"[ClickPM] Task Assigned: {task.title}"

        context = {
            'user': user,
            'task': task,
            'sprint': task.sprint,
            'project': task.sprint.milestone.project if task.sprint and task.sprint.milestone else None,
        }

        message = f"""Hi {user.username},

You have been assigned a new task:

Task: {task.title}
Priority: {task.priority}
Due Date: {task.due_date or 'Not set'}
Sprint: {task.sprint.name if task.sprint else 'N/A'}

Description:
{task.description or 'No description provided.'}

Log in to ClickPM to view more details.

Best regards,
ClickPM Team
"""

        return EmailService.send_email(user.email, subject, message)

    @staticmethod
    def send_task_status_change_email(user, task, old_status, new_status):
        """
        Send email when a task status changes.
        """
        subject = f"[ClickPM] Task Status Changed: {task.title}"

        message = f"""Hi {user.username},

A task you're involved with has changed status:

Task: {task.title}
Status Change: {old_status} → {new_status}
Updated by: {task.assignee.username if task.assignee else 'System'}

Log in to ClickPM to view more details.

Best regards,
ClickPM Team
"""

        return EmailService.send_email(user.email, subject, message)

    @staticmethod
    def send_deadline_reminder_email(user, target, target_type, days_until):
        """
        Send email reminder for upcoming deadlines.
        target_type: 'task', 'sprint', 'milestone', 'project'
        """
        type_labels = {
            'task': 'Task',
            'sprint': 'Sprint',
            'milestone': 'Milestone',
            'project': 'Project',
        }

        label = type_labels.get(target_type, 'Item')
        name = getattr(target, 'title', None) or getattr(target, 'name', 'Unknown')

        if days_until == 0:
            time_text = "today"
        elif days_until == 1:
            time_text = "tomorrow"
        else:
            time_text = f"in {days_until} days"

        subject = f"[ClickPM] Deadline Reminder: {label} '{name}' due {time_text}"

        message = f"""Hi {user.username},

This is a reminder that the following {label.lower()} is due {time_text}:

{label}: {name}
Due Date: {getattr(target, 'due_date', None) or getattr(target, 'end_date', 'N/A')}

Please ensure all work is completed before the deadline.

Log in to ClickPM to view more details.

Best regards,
ClickPM Team
"""

        return EmailService.send_email(user.email, subject, message)

    @staticmethod
    def send_mention_email(user, actor, comment, target):
        """
        Send email when a user is mentioned in a comment.
        """
        target_name = getattr(target, 'title', None) or getattr(target, 'name', 'Unknown')

        subject = f"[ClickPM] {actor.username} mentioned you in a comment"

        message = f"""Hi {user.username},

{actor.username} mentioned you in a comment:

"{comment.content[:200]}{'...' if len(comment.content) > 200 else ''}"

Context: {target_name}

Log in to ClickPM to view the full comment and respond.

Best regards,
ClickPM Team
"""

        return EmailService.send_email(user.email, subject, message)

    @staticmethod
    def send_comment_email(user, actor, comment, target):
        """
        Send email when a new comment is added to a task/sprint/project user is involved in.
        """
        target_name = getattr(target, 'title', None) or getattr(target, 'name', 'Unknown')

        subject = f"[ClickPM] New comment on '{target_name}'"

        message = f"""Hi {user.username},

{actor.username} commented on '{target_name}':

"{comment.content[:200]}{'...' if len(comment.content) > 200 else ''}"

Log in to ClickPM to view the full comment and respond.

Best regards,
ClickPM Team
"""

        return EmailService.send_email(user.email, subject, message)

    @staticmethod
    def send_project_invitation_email(user, project, inviter):
        """
        Send email when a user is added to a project.
        """
        subject = f"[ClickPM] You've been added to project: {project.name}"

        message = f"""Hi {user.username},

{inviter.username} has added you to the project "{project.name}".

Project: {project.name}
Description: {project.description or 'No description provided.'}
Start Date: {project.start_date}
End Date: {project.end_date}

Log in to ClickPM to view the project and start collaborating.

Best regards,
ClickPM Team
"""

        return EmailService.send_email(user.email, subject, message)

    @staticmethod
    def send_bulk_email(recipients, subject, message):
        """
        Send the same email to multiple recipients.
        Returns dict with success/failure counts.
        """
        success_count = 0
        failure_count = 0

        for recipient in recipients:
            email = recipient.email if hasattr(recipient, 'email') else recipient
            if EmailService.send_email(email, subject, message):
                success_count += 1
            else:
                failure_count += 1

        return {
            'success': success_count,
            'failure': failure_count,
            'total': len(recipients),
        }
