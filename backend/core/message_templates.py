from datetime import datetime
from .models import Event


def format_currency(amount, is_usd: bool) -> str:
    """Форматирование валюты для отображения."""
    if is_usd:
        return f"{amount:,.2f} USD".replace(',', ' ')
    else:
        return f"{int(amount):,} UZS".replace(',', ' ')


def generate_contract_message(event: Event) -> str:
    """
    Генерация текста договора для отправки в Telegram.

    Args:
        event: Объект события (Event)

    Returns:
        str: Текст договора
    """
    client = event.client
    phones = ', '.join([f"+{phone.phone_number}" for phone in client.phones.all()])
    
    # Форматирование услуг
    services_text = []
    for device in event.devices.all():
        service_name = device.service.name
        service_date = device.event_service_date.strftime('%d.%m.%Y') if device.event_service_date else 'Дата не указана'
        
        service_info = f"• {service_name} - {service_date}"
        
        if device.restaurant_name:
            service_info += f" (Ресторан: {device.restaurant_name})"
        if device.camera_count:
            service_info += f" (Камер: {device.camera_count})"
        if device.comment:
            service_info += f"\n  Комментарий: {device.comment}"
        
        services_text.append(service_info)
    
    services_block = '\n'.join(services_text) if services_text else 'Услуги не указаны'
    
    # Финансовая информация
    total_amount = format_currency(event.amount, event.amount_money)
    advance = format_currency(event.advance, event.advance_money)
    remaining = format_currency(event.amount - event.advance, event.amount_money)
    
    # Текущая дата
    current_date = datetime.now().strftime('%d.%m.%Y')
    
    message = f"""🎬 **RED VIDEO GROUP**  
— создаём эмоции, а не просто видео —

━━━━━━━━━━━━━━━━━━
📋 **ДОГОВОР**
━━━━━━━━━━━━━━━━━━

👤 **Клиент:** {client.name}
📞 **Телефон:** {phones}
📅 **Дата договора:** {current_date}

━━━━━━━━━━━━━━━━━━
📦 **УСЛУГИ**
━━━━━━━━━━━━━━━━━━
{services_block}

━━━━━━━━━━━━━━━━━━
💰 **ФИНАНСОВАЯ ИНФОРМАЦИЯ**
━━━━━━━━━━━━━━━━━━
• **Общая сумма:** {total_amount}
• **Аванс:** {advance}
• **Остаток к доплате:** {remaining}

━━━━━━━━━━━━━━━━━━
📝 **УСЛОВИЯ ДОГОВОРА**
━━━━━━━━━━━━━━━━━━
Просим вас внимательно ознакомиться с перечнем услуг, указанным выше.  
Обращаем внимание, что **100% оплата должна быть произведена до дня свадьбы**.

🙏 Спасибо, что выбрали **RED VIDEO GROUP**  
🎥 Мы сохраним ваш день навсегда
"""


    return message


def generate_advance_notification_message(event: Event, change_type: str, amount: float) -> str:
    """
    Генерация текста уведомления об изменении аванса.

    Args:
        event: Объект события (Event)
        change_type: Тип изменения ('add' или 'subtract')
        amount: Сумма изменения

    Returns:
        str: Текст уведомления
    """
    client = event.client
    
    # Определяем тип операции
    if change_type == 'add':
        operation_text = "добавлен"
        operation_emoji = "➕"
    elif change_type == 'subtract':
        operation_text = "уменьшен"
        operation_emoji = "➖"
    else:
        operation_text = "изменен"
        operation_emoji = "💰"
    
    # Форматирование сумм
    change_amount = format_currency(amount, event.advance_money)
    current_advance = format_currency(event.advance, event.advance_money)
    total_amount = format_currency(event.amount, event.amount_money)
    remaining = format_currency(event.amount - event.advance, event.amount_money)
    
    # Текущая дата и время
    current_datetime = datetime.now().strftime('%d.%m.%Y %H:%M')
    
    # Получаем всю историю аванса, отсортированную по дате (от новых к старым)
    advance_history = event.advance_history.all().order_by('-date')
    
    # Формируем блок истории аванса
    history_lines = []
    for history_item in advance_history:
        history_date = history_item.date.strftime('%d.%m.%Y %H:%M')
        history_amount = format_currency(history_item.amount, event.advance_money)
        
        if history_item.change_type == 'add':
            history_operation = "➕ Добавлено"
        else:
            history_operation = "➖ Убыло"
        
        history_lines.append(f"• {history_date} - {history_operation}: {history_amount}")
    
    history_block = '\n'.join(history_lines) if history_lines else "История изменений отсутствует"
    
    message = f"""🎬 **RED VIDEO GROUP**

━━━━━━━━━━━━━━━━━━
{operation_emoji} **УВЕДОМЛЕНИЕ ОБ АВАНСЕ**
━━━━━━━━━━━━━━━━━━

👤 **Клиент:** {client.name}
📅 **Дата:** {current_datetime}

💰 **Аванс {operation_text}**
• **Сумма:** {change_amount}

━━━━━━━━━━━━━━━━━━
📊 **ТЕКУЩЕЕ СОСТОЯНИЕ**
━━━━━━━━━━━━━━━━━━
• **Общая сумма:** {total_amount}
• **Текущий аванс:** {current_advance}
• **Остаток к доплате:** {remaining}

━━━━━━━━━━━━━━━━━━
📜 **ИСТОРИЯ ИЗМЕНЕНИЙ АВАНСА**
━━━━━━━━━━━━━━━━━━
{history_block}

🤝 **RED VIDEO GROUP** — всё прозрачно, всё под контролем
"""


    return message

