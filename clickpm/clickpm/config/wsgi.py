"""
WSGI config for clickpm project.
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'clickpm.config.settings')

application = get_wsgi_application()
