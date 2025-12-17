# project/celery.py
from __future__ import absolute_import, unicode_literals
import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('config')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

# Настройка расписания для автоматической отправки уведомлений работникам
# Задача будет запускаться каждые 5 минут, чтобы сверять время отправки
app.conf.beat_schedule = {
    'check-and-send-worker-notifications': {
        'task': 'core.tasks.send_worker_event_notifications',
        'schedule': crontab(hour=12, minute=30),
    },
}
