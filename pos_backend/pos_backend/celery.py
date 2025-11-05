# 2024 Archiva Solutions By Securaxe. Tous droits réservés.
# Ce fichier est protégé par le droit d’auteur et ne peut être reproduit, distribué, ni utilisé sans autorisation.

from __future__ import absolute_import, unicode_literals
import os
from celery import Celery

# Set default Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pos_backend.settings')

app = Celery('pos_backend')

# Load settings from Django's settings.py
app.config_from_object('django.conf:settings', namespace='CELERY')

# Discover tasks in installed apps
app.autodiscover_tasks()

@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
