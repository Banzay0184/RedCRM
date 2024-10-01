from django.contrib import admin
from .models import Client, Service, Phone, Workers, SMS, Order, Event


@admin.register(Workers)
@admin.register(Phone)
@admin.register(Client)
@admin.register(Service)
@admin.register(Order)
@admin.register(Event)
@admin.register(SMS)
class SMSAdmin(admin.ModelAdmin):
    actions = ['send_sms_action']

    def send_sms_action(self, request, queryset):
        for sms in queryset.filter(status='pending'):
            sms.send_sms()

    send_sms_action.short_description = "Отправить выбранные SMS"
