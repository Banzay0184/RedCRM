from django.contrib.auth.models import User
from rest_framework import serializers

from .models import Client, PhoneClient, Workers, Service, Device, Event, EventLog


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
        fields = ["id", "name", "phone_number"]

    def update(self, instance, validated_data):
        instance.name = validated_data.get("name", instance.name)
        instance.phone_number = validated_data.get("phone_number", instance.phone_number)
        instance.save()
        return instance


class DeviceSerializer(serializers.ModelSerializer):
    event_service_date = serializers.DateField(format="%Y-%m-%d", required=False, allow_null=True)

    class Meta:
        model = Device
        fields = ["id", "service", "camera_count", "comment", "event_service_date"]


class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = ["id", "name", "is_active_camera"]


class EventSerializer(serializers.ModelSerializer):
    client = ClientSerializer()
    devices = DeviceSerializer(many=True)
    workers = serializers.PrimaryKeyRelatedField(many=True, queryset=Workers.objects.all())

    def create(self, validated_data):
        # Извлекаем устройства и работников
        devices = validated_data.pop("devices")
        client_data = validated_data.pop("client")
        workers = validated_data.pop("workers")

        # Извлекаем и отделяем телефоны от данных клиента
        phones = client_data.pop("phones", [])

        # Создаем клиента
        client = Client.objects.create(**client_data)

        # Добавляем телефоны клиенту
        for phone in phones:
            client.phones.create(**phone)

        # Привязываем клиента к данным события
        validated_data['client'] = client

        # Привязываем работников к данным события
        validated_data['workers'] = workers

        # Создаем событие
        instance = super().create(validated_data)

        # Создаем устройства, привязанные к событию
        Device.objects.bulk_create([Device(**{"event_id": instance.id, **item}) for item in devices])

        return instance

    def update(self, instance, validated_data):
        # Обновляем данные клиента
        client_data = validated_data.pop('client', None)
        if client_data:
            client_instance = instance.client
            client_serializer = ClientSerializer(client_instance, data=client_data)
            client_serializer.is_valid(raise_exception=True)
            client_serializer.save()

        # Обновляем данные устройств
        devices_data = validated_data.pop('devices', None)
        if devices_data is not None:
            # Удаляем существующие устройства
            instance.devices.all().delete()
            # Создаём новые устройства
            for device_data in devices_data:
                Device.objects.create(event=instance, **device_data)

        # Обновляем поле workers (многие-ко-многим)
        workers = validated_data.pop('workers', None)
        if workers is not None:
            instance.workers.set(workers)

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
            "restaurant_name",
            "workers",
            "devices",
            "amount",
            "advance",
            "comment",
            "created_at",
            "updated_at",
        ]



class EventLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventLog
        fields = ["id", "event", "message", "created_at"]
