from django.db import models
from django.core.validators import RegexValidator, MinValueValidator
from decimal import Decimal
from django.utils import timezone


# Абстрактная модель для телефонных номеров
class PhoneNumber(models.Model):
    phone_number = models.CharField(
        max_length=15,
        validators=[RegexValidator(regex=r'^\+?1?\d{9,15}$',
                                   message="Номер телефона необходимо вводить в формате: «+999999999». Допускается до 15 цифр.")]
    )

    class Meta:
        abstract = True


class Workers(PhoneNumber):
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name


class Phone(PhoneNumber):
    client = models.ForeignKey('Client', on_delete=models.CASCADE, related_name='phone_client')

    def __str__(self):
        return self.phone_number


class Client(models.Model):
    name = models.CharField(max_length=100)
    is_vip = models.BooleanField(default=False)

    def __str__(self):
        return self.name


class SMS(models.Model):
    PENDING = 'pending'
    SENT = 'sent'
    FAILED = 'failed'

    STATUS_CHOICES = [
        (PENDING, 'В ожидании'),
        (SENT, 'Отправлено'),
        (FAILED, 'Неуспешно'),
    ]

    clients = models.ManyToManyField('Client', related_name='sms_clients')
    message = models.TextField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=PENDING)
    created_at = models.DateTimeField(default=timezone.now)
    sent_at = models.DateTimeField(blank=True, null=True)
    error_message = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"SMS - Status: {self.status}"


class Service(models.Model):
    name = models.CharField(max_length=100)
    price = models.DecimalField( max_digits=1000, decimal_places=2,
                                validators=[
                                    MinValueValidator(Decimal('0.00'))])

    def __str__(self):
        return self.name


class Order(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    comment = models.TextField(blank=True, null=True)
    total = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'),
                                validators=[MinValueValidator(Decimal('0.00'))])
    paid = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'),
                               validators=[MinValueValidator(Decimal('0.00'))])

    client = models.ForeignKey(Client, on_delete=models.SET_NULL, null=True, related_name='order_client')

    def __str__(self):
        return f"Order {self.id} - {self.client.name if self.client else 'Нет клиента'}"


class Event(models.Model):
    restaurant_name = models.CharField(max_length=255)
    name = models.CharField(max_length=255)
    date = models.DateTimeField()
    services = models.ManyToManyField(Service, related_name='event_services')
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='event_order')
    workers = models.ManyToManyField(Workers, related_name='event_workers')

    def __str__(self):
        return f"{self.name} at {self.restaurant_name}"
