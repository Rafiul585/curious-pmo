from django.db import models
from django.conf import settings
from .comment_models import Comment
from .task_models import Task


class Attachment(models.Model):
    file = models.FileField(upload_to='attachments/')
    filename = models.CharField(max_length=255, blank=True)
    file_size = models.PositiveIntegerField(default=0)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='attachments'
    )
    # Support both comment and task attachments
    comment = models.ForeignKey(
        Comment,
        on_delete=models.CASCADE,
        related_name='attachments',
        null=True,
        blank=True
    )
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='attachments',
        null=True,
        blank=True
    )

    def __str__(self):
        return self.filename or self.file.name

    def save(self, *args, **kwargs):
        if self.file and not self.filename:
            self.filename = self.file.name
        if self.file and not self.file_size:
            self.file_size = self.file.size
        super().save(*args, **kwargs)
