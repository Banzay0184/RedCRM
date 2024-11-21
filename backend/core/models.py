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

    name = models.CharField(max_length=255, null=True, blank=True)
    is_vip = models.BooleanField(default=False)
    is_archived = models.BooleanField(default=False)

    def __str__(self):
        return self.name or "Без имени"


class PhoneClient(PhoneNumber, BaseModel):
    """Модель для хранения телефонов клиента."""

    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name="phones")

    def __str__(self):
        return self.phone_number


class Workers(PhoneNumber, BaseModel):
    """Модель сотрудников."""

    name = models.CharField(max_length=255)
    order = models.PositiveIntegerField(default=0)

    def __str__(self):
        return self.name


class Service(BaseModel):
    """Услуги для мероприятий."""

    name = models.CharField(max_length=255, unique=True)
    is_active_camera = models.BooleanField(default=False)
    color = ColorField(default="#FFFFFF")

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


    # def __str__(self):
    #     return f"{self.comment} для {self.service.name}"


class Event(BaseModel):
    """Модель мероприятий."""

    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name="events")
    # workers = models.ManyToManyField(Workers, related_name="events")
    amount = models.PositiveIntegerField(default=0)
    amount_money = models.BooleanField(default=False)
    advance = models.PositiveIntegerField(default=0)
    advance_money = models.BooleanField(default=False)
    computer_numbers = models.PositiveIntegerField(default=0)
    comment = models.TextField(null=True, blank=True)

    def clean(self):
        """Проверка, что аванс не превышает общую сумму и что сумма не отрицательна."""
        if self.advance > self.amount:
            raise ValidationError("Аванс не может быть больше общей суммы.")
        if self.amount < 0 or self.advance < 0:
            raise ValidationError("Сумма и аванс не могут быть отрицательными.")

    def __str__(self):
        return f"{self.client.name} - {self.restaurant_name}"


class EventLog(BaseModel):
    """Логи для отслеживания изменений в мероприятии."""

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="logs")
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Лог для {self.event}: {self.message}"
