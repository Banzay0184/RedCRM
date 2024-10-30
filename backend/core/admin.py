from django.contrib import admin

from .models import Client, PhoneClient, Workers, Service, Device, Event, EventLog

admin.site.register(Client)
admin.site.register(PhoneClient)
admin.site.register(Workers)
admin.site.register(Service)
admin.site.register(Device)
admin.site.register(Event)
admin.site.register(EventLog)
