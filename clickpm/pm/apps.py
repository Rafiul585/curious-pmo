from django.apps import AppConfig


class PmConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'pm'

    def ready(self):
        import pm.signals  # noqa: F401 — registers post_save health refresh handlers
