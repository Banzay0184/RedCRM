from colorfield.fields import ColorField
from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator
from django.db import models
from django.db.models import CASCADE


class BaseModel(models.Model):
    """Базовая модель с общими полями."""

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class PhoneNumber(models.Model):
    """Абстрактная модель для хранения номеров телефонов."""

    phone_number = models.CharField(
        max_length=15,
        validators=[
            RegexValidator(
                regex=r"^\+?1?\d{9,15}$",
                message="Номер телефона необходимо вводить в формате: «+998901234567». Допускается до 15 цифр.",
            )
        ],
    )

    class Meta:
        abstract = True


class Client(BaseModel):
    """Модель клиента."""

    name = models.CharField(max_length=255, null=True, blank=True, db_index=True)
    is_vip = models.BooleanField(default=False, db_index=True)
    is_archived = models.BooleanField(default=False, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=['is_archived', 'is_vip']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return self.name or "Без имени"


class PhoneClient(PhoneNumber, BaseModel):
    """Модель для хранения телефонов клиента."""

    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name="phones", db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=['client', 'phone_number']),
        ]

    def __str__(self):
        return self.phone_number


class Workers(PhoneNumber, BaseModel):
    """Модель сотрудников."""

    name = models.CharField(max_length=255, db_index=True)
    order = models.IntegerField(default=0, null=True, blank=True, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=['order']),
        ]
        ordering = ['order']

    def __str__(self):
        return self.name


class Service(BaseModel):
    """Услуги для мероприятий."""

    name = models.CharField(max_length=255, unique=True)
    is_active_camera = models.BooleanField(default=False)
    color = ColorField(default="#FFFFFF")
    order = models.IntegerField(default=0, null=True, blank=True, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=['order']),
        ]
        ordering = ['order']

    def __str__(self):
        return self.name


class Device(BaseModel):
    """Устройства для услуг на мероприятиях."""

    camera_count = models.PositiveIntegerField(default=0)  # Количество камер
    restaurant_name = models.CharField(max_length=255, null=True, blank=True)  # Название ресторана
    comment = models.TextField(null=True, blank=True)  # Команда для управления
    event_service_date = models.DateField(null=True, blank=True,)  # Дата использования устройства
    service = models.ForeignKey(Service, CASCADE, "devices")
    event = models.ForeignKey("Event", CASCADE, "devices")
    workers = models.ManyToManyField(Workers, related_name="devices", blank=True)


class Event(BaseModel):
    """Модель мероприятий."""

    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name="events", db_index=True)
    amount = models.PositiveIntegerField(default=0, db_index=True)
    amount_money = models.BooleanField(default=False)
    advance = models.PositiveIntegerField(default=0, db_index=True)
    advance_money = models.BooleanField(default=False)
    computer_numbers = models.PositiveIntegerField(default=0)
    comment = models.TextField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['client', 'created_at']),
            models.Index(fields=['created_at']),
            models.Index(fields=['amount']),
        ]

    def update_advance(self, amount, change_type, advance_money=None):
        """Метод обновления аванса с сохранением истории."""
        if change_type == 'add':
            self.advance += amount
        elif change_type == 'subtract':
            self.advance -= amount

        # Обновляем валюту аванса, если указана
        if advance_money is not None:
            self.advance_money = advance_money

        # Валидация
        if self.advance < 0:
            raise ValidationError("Аванс не может быть отрицательным.")
        if self.advance > self.amount:
            raise ValidationError("Аванс не может быть больше общей суммы.")

        # Сохранение
        self.save()

        # Запись истории
        AdvanceHistory.objects.create(event=self, amount=amount, change_type=change_type)


    def clean(self):
        """Проверка, что аванс не превышает общую сумму и что сумма не отрицательна."""
        if self.advance > self.amount:
            raise ValidationError("Аванс не может быть больше общей суммы.")
        if self.amount < 0 or self.advance < 0:
            raise ValidationError("Сумма и аванс не могут быть отрицательными.")

    def __str__(self):
        return f"{self.client.name} - {self.amount} сум"


class AdvanceHistory(BaseModel):
    """История изменений аванса."""

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="advance_history", db_index=True)
    amount = models.IntegerField()  # Сумма изменения
    change_type = models.CharField(
        max_length=10,
        choices=[('add', 'Добавлено'), ('subtract', 'Убыло')]
    )
    date = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=['event', '-date']),
            models.Index(fields=['-date']),
        ]
        ordering = ['-date']

    def __str__(self):
        return f"{self.amount} {self.get_change_type_display()} - {self.date}"



class EventLog(BaseModel):
    """Логи для отслеживания изменений в мероприятии."""

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="logs")
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Лог для {self.event}: {self.message}"


class TelegramContractLog(BaseModel):
    """История отправки договоров в Telegram."""

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="telegram_contract_logs", db_index=True)
    phone = models.CharField(max_length=15, db_index=True)
    status = models.CharField(
        max_length=20,
        choices=[('success', 'Успешно'), ('error', 'Ошибка')],
        default='error',
        db_index=True
    )
    error = models.TextField(null=True, blank=True)
    message_text = models.TextField(null=True, blank=True)
    telegram_user_id = models.BigIntegerField(null=True, blank=True)
    sent_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-sent_at']
        indexes = [
            models.Index(fields=['event', '-sent_at']),
            models.Index(fields=['status', '-sent_at']),
        ]

    def __str__(self):
        return f"Договор для {self.event} на {self.phone} - {self.get_status_display()}"


class TelegramAdvanceNotificationLog(BaseModel):
    """История отправки уведомлений об авансе в Telegram."""

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="telegram_advance_notification_logs", db_index=True)
    phone = models.CharField(max_length=15, db_index=True)
    status = models.CharField(
        max_length=20,
        choices=[('success', 'Успешно'), ('error', 'Ошибка')],
        default='error',
        db_index=True
    )
    error = models.TextField(null=True, blank=True)
    message_text = models.TextField(null=True, blank=True)
    telegram_user_id = models.BigIntegerField(null=True, blank=True)
    sent_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-sent_at']
        indexes = [
            models.Index(fields=['event', '-sent_at']),
            models.Index(fields=['status', '-sent_at']),
        ]

    def __str__(self):
        return f"Уведомление об авансе для {self.event} на {self.phone} - {self.get_status_display()}"


class WorkerNotificationSettings(BaseModel):
    """Настройки времени отправки уведомлений работникам о мероприятиях."""
    
    notification_time = models.TimeField(
        help_text="Время отправки уведомлений (например, 09:00)"
    )
    enabled = models.BooleanField(
        default=True,
        help_text="Включены ли автоматические уведомления"
    )
    
    class Meta:
        verbose_name = "Настройка уведомлений работникам"
        verbose_name_plural = "Настройки уведомлений работникам"
    
    def __str__(self):
        status = "включено" if self.enabled else "выключено"
        return f"Уведомления работникам: {self.notification_time.strftime('%H:%M')} ({status})"


class WorkerNotificationLog(BaseModel):
    """История отправки уведомлений работникам о мероприятиях."""
    
    worker = models.ForeignKey(
        Workers, 
        on_delete=models.CASCADE, 
        related_name="notification_logs",
        db_index=True,
        help_text="Работник, которому отправлено уведомление"
    )
    phone = models.CharField(
        max_length=15, 
        db_index=True,
        help_text="Номер телефона работника"
    )
    status = models.CharField(
        max_length=20,
        choices=[('success', 'Успешно'), ('error', 'Ошибка')],
        default='error',
        db_index=True,
        help_text="Статус отправки"
    )
    error = models.TextField(
        null=True, 
        blank=True,
        help_text="Текст ошибки, если отправка не удалась"
    )
    message_text = models.TextField(
        null=True, 
        blank=True,
        help_text="Текст отправленного сообщения"
    )
    telegram_user_id = models.BigIntegerField(
        null=True, 
        blank=True,
        help_text="ID пользователя в Telegram"
    )
    event_date = models.DateField(
        db_index=True,
        help_text="Дата мероприятия, о котором отправлено уведомление"
    )
    notification_type = models.CharField(
        max_length=20,
        choices=[('today', 'Сегодня'), ('tomorrow', 'Завтра')],
        db_index=True,
        help_text="Тип уведомления: сегодня или завтра"
    )
    sent_at = models.DateTimeField(
        auto_now_add=True, 
        db_index=True,
        help_text="Время отправки уведомления"
    )
    
    class Meta:
        ordering = ['-sent_at']
        indexes = [
            models.Index(fields=['worker', '-sent_at']),
            models.Index(fields=['status', '-sent_at']),
            models.Index(fields=['event_date', '-sent_at']),
            models.Index(fields=['notification_type', '-sent_at']),
        ]
        verbose_name = "Лог уведомления работнику"
        verbose_name_plural = "Логи уведомлений работникам"
    
    def __str__(self):
        return f"Уведомление для {self.worker.name} ({self.event_date}) - {self.get_status_display()}"