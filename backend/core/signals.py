import requests
from .models import Event, EventLog


def send_sms_task(phone_number, message, event_id=None):
    """Асинхронная задача для отправки SMS."""
    API_URL = "https://notify.eskiz.uz/api/message/sms/send"
    headers = {"Authorization": "Bearer YOUR_ACCESS_TOKEN"}
    data = {"mobile_phone": phone_number, "message": message, "from": "4546"}

    response = requests.post(API_URL, headers=headers, data=data)

    # Логируем результат отправки
    if event_id:
        status = "успешно" if response.status_code == 200 else "неуспешно"
        EventLog.objects.create(
            event_id=event_id,
            message=f"SMS отправлено на {phone_number}: {status}."
        )
