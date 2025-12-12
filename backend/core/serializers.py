from django.contrib.auth.models import User
from rest_framework import serializers
from .models import (
    Client, PhoneClient, Workers, Service, Device, Event, EventLog, AdvanceHistory,
    TelegramContractLog, TelegramAdvanceNotificationLog
)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "email", "is_staff"]

    def update(self, instance, validated_data):
        instance.username = validated_data.get("username", instance.username)
        instance.first_name = validated_data.get("first_name", instance.first_name)
        instance.last_name = validated_data.get("last_name", instance.last_name)
        instance.email = validated_data.get("email", instance.email)
        instance.save()
        return instance


class PhoneClientSerializer(serializers.ModelSerializer):
    class Meta:
        model = PhoneClient
        fields = ["id", "phone_number"]


class ClientSerializer(serializers.ModelSerializer):
    phones = PhoneClientSerializer(many=True, required=False)

    class Meta:
        model = Client
        fields = ["id", "name", "is_vip", "is_archived", "phones"]

    def create(self, validated_data):
        phones_data = validated_data.pop("phones", [])
        client = Client.objects.create(**validated_data)
        PhoneClient.objects.bulk_create([PhoneClient(client=client, **phone) for phone in phones_data])
        return client

    def update(self, instance, validated_data):
        phones_data = validated_data.pop("phones", [])
        instance.name = validated_data.get("name", instance.name)
        instance.is_vip = validated_data.get("is_vip", instance.is_vip)
        instance.is_archived = validated_data.get("is_archived", instance.is_archived)
        instance.save()

        # Удаляем телефоны, которых нет в обновленных данных
        existing_phone_ids = {phone.id for phone in instance.phones.all()}
        updated_phone_ids = {phone["id"] for phone in phones_data if "id" in phone}
        phones_to_delete = instance.phones.exclude(id__in=updated_phone_ids)
        phones_to_delete.delete()

        # Обновляем или добавляем новые телефоны
        for phone_data in phones_data:
            phone_id = phone_data.get("id")
            if phone_id and phone_id in existing_phone_ids:
                phone = PhoneClient.objects.get(id=phone_id)
                phone.phone_number = phone_data["phone_number"]
                phone.save()
            else:
                PhoneClient.objects.create(client=instance, **phone_data)

        return instance


class WorkersSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workers
        fields = ["id", "name", "phone_number",'order']

    def update(self, instance, validated_data):
        instance.name = validated_data.get("name", instance.name)
        instance.phone_number = validated_data.get("phone_number", instance.phone_number)
        instance.save()
        return instance


class DeviceSerializer(serializers.ModelSerializer):
    workers = serializers.PrimaryKeyRelatedField(many=True, queryset=Workers.objects.all())
    # event_service_date = serializers.DateField(format="%Y-%m-%d", allow_null=True)

    def create(self, validated_data):
        workers = validated_data.pop("workers", None)  # Извлекаем workers, если они есть
        device = Device.objects.create(**validated_data)
        if workers:
            device.workers.set(workers)  # Привязываем работников к устройству
        return device


    class Meta:
        model = Device
        fields = ["id", "service", "camera_count", "comment", 'workers', "restaurant_name", "event_service_date"]


class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = ["id", "name", "color", "is_active_camera"]

class AdvanceHistorySerializer(serializers.ModelSerializer):
    """Сериализатор для истории аванса."""

    class Meta:
        model = AdvanceHistory
        fields = ["id", "amount", "change_type", "date"]



class EventSerializer(serializers.ModelSerializer):
    client = ClientSerializer()
    devices = DeviceSerializer(many=True)
    advance_history = AdvanceHistorySerializer(many=True, read_only=True)  # История аванса

    def create(self, validated_data):
        devices_data = validated_data.pop("devices", [])
        client_data = validated_data.pop("client")
        phones = client_data.pop("phones", [])

        # Создаём клиента
        client = Client.objects.create(**client_data)
        for phone in phones:
            client.phones.create(**phone)
        validated_data["client"] = client

        # Создаём событие
        event = Event.objects.create(**validated_data)

        # Создаём устройства и добавляем работников
        for device_data in devices_data:
            workers = device_data.pop("workers", [])
            device = Device.objects.create(event=event, **device_data)
            if workers:
                device.workers.set(workers)

        return event

    def update(self, instance, validated_data):
        client_data = validated_data.pop("client", None)
        devices_data = validated_data.pop("devices", None)

        # Обновление клиента
        if client_data:
            client_serializer = ClientSerializer(instance.client, data=client_data)
            client_serializer.is_valid(raise_exception=True)
            client_serializer.save()

        # Обновление устройств
        if devices_data is not None:
            existing_devices = {device.id: device for device in instance.devices.all()}

            updated_device_ids = set()

            for device_data in devices_data:
                workers = device_data.pop("workers", [])
                device_id = device_data.get("id")

                if device_id and device_id in existing_devices:
                    # Обновляем существующее устройство
                    device = existing_devices[device_id]
                    for attr, value in device_data.items():
                        setattr(device, attr, value)
                    device.save()
                    if workers:
                        device.workers.set(workers)
                    updated_device_ids.add(device_id)
                else:
                    # Создаем новое устройство
                    device = Device.objects.create(event=instance, **device_data)
                    if workers:
                        device.workers.set(workers)
                    updated_device_ids.add(device.id)

            # Удаляем устройства, которые не были включены в devices_data
            for device_id, device in existing_devices.items():
                if device_id not in updated_device_ids:
                    device.delete()

        # Обновляем остальные поля события
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance

    class Meta:
        model = Event
        fields = [
            "id",
            "client",
            "devices",
            "computer_numbers",
            "amount",
            "amount_money",
            "advance",
            "advance_money",
            "comment",
            "created_at",
            "updated_at",
            "advance_history",  # Добавляем поле для истории
        ]


class EventLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventLog
        fields = ["id", "event", "message", "created_at"]


class TelegramContractLogSerializer(serializers.ModelSerializer):
    """Сериализатор для истории отправки договоров в Telegram."""

    class Meta:
        model = TelegramContractLog
        fields = ["id", "phone", "status", "error", "message_text", "telegram_user_id", "sent_at"]


class TelegramAdvanceNotificationLogSerializer(serializers.ModelSerializer):
    """Сериализатор для истории отправки уведомлений об авансе в Telegram."""

    class Meta:
        model = TelegramAdvanceNotificationLog
        fields = ["id", "phone", "status", "error", "message_text", "telegram_user_id", "sent_at"]
