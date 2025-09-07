from celery import shared_task
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Event, EventLog
from datetime import datetime, timedelta


@receiver(post_save, sender=Event)
def log_event_creation(sender, instance, created, **kwargs):
    """Логирует создание нового мероприятия."""
    if created:
        # Логируем событие
        EventLog.objects.create(
            event=instance,
            message=f"Создано мероприятие с инвойсом на {instance.amount} сум."
        )


@shared_task
def send_reminder_notifications():
    """Отправляет напоминания о мероприятиях за день до их начала."""
    # Используем created_at вместо несуществующего start_time
    tomorrow = datetime.now().date() + timedelta(days=1)
    events = Event.objects.filter(created_at__date=tomorrow)

    for event in events:
        # Логируем напоминание
        EventLog.objects.create(
            event=event,
            message=f"Напоминание: Мероприятие запланировано на завтра."
        )


# redis-server
# celery -A config beat --loglevel=info
# celery -A config worker --loglevel=info