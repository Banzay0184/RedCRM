from celery import shared_task
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Event, EventLog
from .signals import send_sms_task
from datetime import datetime, timedelta


@receiver(post_save, sender=Event)
def send_invoice_on_event_creation(sender, instance, created, **kwargs):
    if created:
        # Формируем сообщение для инвойса
        message = (
            f"Инвойс для мероприятия в '{instance.restaurant_name}': "
            f"Сумма: {instance.amount} сум, аванс: {instance.advance} сум."
        )

        # Отправляем SMS клиенту
        for phone in instance.client.phones.all():
            send_sms_task.delay(phone.phone_number, message, instance.id)

        # Отправляем SMS Директору
        send_sms_task('+998909999999', message)

        # Логируем событие
        EventLog.objects.create(
            event=instance,
            message=f"Создано мероприятие с инвойсом на {instance.amount} сум."
        )


@shared_task
def send_reminder_notifications():
    """Отправляет напоминания о мероприятиях за день до их начала."""
    tomorrow = datetime.now().date() + timedelta(days=1)
    events = Event.objects.filter(start_time__date=tomorrow)

    for event in events:
        # Отправляем уведомление работникам
        for worker in event.workers.all():
            send_sms_task.delay(
                worker.phone_number,
                f"Напоминание: Вы назначены на мероприятие в '{event.restaurant_name}' завтра."
            )


# redis-server
# celery -A config beat --loglevel=info
# celery -A config worker --loglevel=info