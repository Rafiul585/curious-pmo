from pm.models.activity_models import ActivityLog
from django.contrib.contenttypes.models import ContentType

def log_activity(user, instance, action, reason=None, old_value=None, new_value=None, extra_info=None):
    """
    Logs activity for any model instance.
    """
    ActivityLog.objects.create(
        user=user,
        content_type=type(instance).__name__,
        object_id=instance.id,
        action=action,
        reason=reason,
        old_value=old_value,
        new_value=new_value,
        extra_info=extra_info
    )
