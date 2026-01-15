"""
ASGI config for clickpm project.
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'clickpm.config.settings')

application = get_asgi_application()
