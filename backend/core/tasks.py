from celery import shared_task
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from .models import Event, EventLog, Workers, Device, WorkerNotificationSettings, WorkerNotificationLog
from .telegram_service import TelegramService
from datetime import datetime, timedelta, date
import asyncio


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


@shared_task
def send_worker_event_notifications():
    """Отправляет уведомления работникам о мероприятиях сегодня и завтра."""
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        # Получаем настройки уведомлений
        settings = WorkerNotificationSettings.objects.first()
        if not settings:
            logger.warning("Настройки уведомлений работникам не найдены. Создайте настройки через интерфейс.")
            return
        
        if not settings.enabled:
            logger.info("Автоматические уведомления работникам выключены.")
            return
        
        # Проверяем время отправки (если задача запускается каждый час, проверяем время)
        current_time = datetime.now().time()
        notification_time = settings.notification_time
        
        # Сравниваем время (с точностью до минуты)
        if current_time.hour != notification_time.hour or current_time.minute != notification_time.minute:
            logger.debug(f"Текущее время {current_time} не совпадает с временем отправки {notification_time}. Пропускаем.")
            # Не возвращаемся, так как задача может быть запущена вручную
        
        logger.info(f"Начинаем отправку уведомлений работникам. Время: {current_time}")
        
        today = date.today()
        tomorrow = today + timedelta(days=1)
        
        # Находим работников с мероприятиями завтра
        workers_tomorrow = Workers.objects.filter(
            devices__event_service_date=tomorrow
        ).distinct()
        
        # Отправляем уведомления работникам с мероприятиями завтра
        workers_tomorrow_count = 0
        for worker in workers_tomorrow:
            if worker.phone_number:
                # Получаем устройства работника на завтра
                devices_tomorrow = Device.objects.filter(
                    workers=worker,
                    event_service_date=tomorrow
                ).select_related('event', 'event__client', 'service')
                
                if devices_tomorrow.exists():
                    logger.info(f"Отправляем уведомление работнику {worker.name} о мероприятиях завтра")
                    message = generate_worker_notification_message(worker, devices_tomorrow, tomorrow, "завтра")
                    result = send_telegram_message(worker.phone_number, message)
                    workers_tomorrow_count += 1
                    
                    # Сохраняем историю отправки
                    WorkerNotificationLog.objects.create(
                        worker=worker,
                        phone=worker.phone_number,
                        status='success' if result.get('ok') else 'error',
                        error=result.get('error'),
                        message_text=message,
                        telegram_user_id=result.get('telegram_user_id'),
                        event_date=tomorrow,
                        notification_type='tomorrow'
                    )
                    
                    if result.get('ok'):
                        logger.info(f"Уведомление успешно отправлено работнику {worker.name}")
                    else:
                        logger.error(f"Ошибка при отправке уведомления работнику {worker.name}: {result.get('error')}")
        
        logger.info(f"Отправка уведомлений завершена. Сегодня: {workers_today_count}, Завтра: {workers_tomorrow_count}")
                    
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Ошибка при отправке уведомлений работникам: {str(e)}", exc_info=True)


def generate_worker_notification_message(worker, devices, event_date, date_text):
    """Генерация сообщения для работника о мероприятиях."""
    date_str = event_date.strftime('%d.%m.%Y')
    
    devices_info = []
    for device in devices:
        event = device.event
        client_name = event.client.name if event.client else "Неизвестный клиент"
        service_name = device.service.name if device.service else "Неизвестная услуга"
        
        device_info = f"• {service_name} - {client_name}"
        if device.restaurant_name:
            device_info += f"\n  📍 Адрес: {device.restaurant_name}"
        if device.camera_count > 0:
            device_info += f" - {device.camera_count} камер"
        if device.comment:
            device_info += f"\n  💬 Комментарий: {device.comment}"
        devices_info.append(device_info)
    
    devices_block = '\n'.join(devices_info) if devices_info else "Нет мероприятий"
    
    message = f"""📅 УВЕДОМЛЕНИЕ О МЕРОПРИЯТИИ

👤 {worker.name}

У вас есть мероприятие {date_text} ({date_str}):

{devices_block}

Пожалуйста, будьте готовы к мероприятию!
"""
    return message


def send_telegram_message(phone, message):
    """Отправка сообщения через Telegram."""
    try:
        from .views import run_async_telegram
        result = run_async_telegram(TelegramService.send_message(phone, message))
        # Возвращаем полный результат для сохранения в лог
        return result if isinstance(result, dict) else {'ok': False, 'error': str(result)}
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Ошибка при отправке сообщения работнику {phone}: {str(e)}")
        return {'ok': False, 'error': str(e)}


# redis-server
# celery -A config beat --loglevel=info
# celery -A config worker --loglevel=info