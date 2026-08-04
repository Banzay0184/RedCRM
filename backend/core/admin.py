from django.contrib import admin

from .models import Client, ClientHistory, PhoneClient, Workers, Service, Device, Event, EventHistory, EventLog

admin.site.register(Client)
admin.site.register(PhoneClient)
admin.site.register(Workers)
admin.site.register(Service)
admin.site.register(Device)
admin.site.register(Event)
admin.site.register(EventLog)


@admin.register(EventHistory)
class EventHistoryAdmin(admin.ModelAdmin):
    list_display = ["event", "field_name", "old_value", "new_value", "changed_by", "changed_at"]
    list_filter = ["field_name"]
    readonly_fields = [f.name for f in EventHistory._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(ClientHistory)
class ClientHistoryAdmin(admin.ModelAdmin):
    list_display = ["client", "field_name", "old_value", "new_value", "changed_by", "changed_at"]
    list_filter = ["field_name"]
    readonly_fields = [f.name for f in ClientHistory._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
