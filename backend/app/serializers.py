from django.utils import timezone
from rest_framework import serializers
import requests
from .models import Order, Client, Phone, Event, Service, Workers, SMS


# Phone serializer to handle client's phone numbers
class PhoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = Phone
        fields = ['phone_number']


# Client serializer to handle client data
class ClientSerializer(serializers.ModelSerializer):
    phone_client = PhoneSerializer(many=True)

    class Meta:
        model = Client
        fields = ['id', 'name', 'phone_client', 'is_vip']

    # Custom method to handle client creation or update with phones
    def create(self, validated_data):
        phone_data = validated_data.pop('phone_client')
        client = Client.objects.create(**validated_data)
        for phone in phone_data:
            Phone.objects.create(client=client, **phone)
        return client

    def update(self, instance, validated_data):
        phone_data = validated_data.pop('phone_client', None)  # Получаем номера телефонов
        instance.name = validated_data.get('name', instance.name)
        instance.is_vip = validated_data.get('is_vip', instance.is_vip)
        instance.save()

        if phone_data:
            # Удаление старых номеров телефонов клиента
            instance.phone_client.all().delete()

            # Добавление новых номеров телефонов
            for phone in phone_data:
                Phone.objects.create(client=instance, **phone)

        return instance


# Workers serializer to handle workers assigned to an event
class WorkersSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workers
        fields = ['name', 'phone_number']


# Updated Service serializer to handle services in an event
class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = ['id', 'name', 'price']


# Updated EventSerializer to include services and workers for events
class EventSerializer(serializers.ModelSerializer):
    services = ServiceSerializer(many=True)
    workers = WorkersSerializer(many=True)

    class Meta:
        model = Event
        fields = ['restaurant_name', 'name', 'date', 'services', 'workers']

    def create(self, validated_data):
        services_data = validated_data.pop('services')
        workers_data = validated_data.pop('workers')

        # Create the event first
        event = Event.objects.create(**validated_data)

        # Add services to the event
        for service_data in services_data:
            service, created = Service.objects.get_or_create(
                name=service_data['name'],
                price=service_data['price']  # Ensure unique fields are used
            )
            event.services.add(service)

        # Add workers to the event
        for worker_data in workers_data:
            worker, created = Workers.objects.get_or_create(**worker_data)
            event.workers.add(worker)

        return event

    def update(self, instance, validated_data):
        services_data = validated_data.pop('services')
        workers_data = validated_data.pop('workers')

        instance.restaurant_name = validated_data.get('restaurant_name', instance.restaurant_name)
        instance.name = validated_data.get('name', instance.name)
        instance.date = validated_data.get('date', instance.date)
        instance.save()

        # Update services
        for service_data in services_data:
            service, created = Service.objects.update_or_create(
                name=service_data['name'], defaults={'price': service_data['price']}
            )

        # Update workers
        for worker_data in workers_data:
            worker, created = Workers.objects.update_or_create(
                name=worker_data['name'], defaults={'phone_number': worker_data['phone_number']}
            )

        return instance


class OrderSerializer(serializers.ModelSerializer):
    client = ClientSerializer()
    events = EventSerializer(source='event_order', many=True)

    class Meta:
        model = Order
        fields = ['id', 'comment', 'total', 'paid', 'client', 'events']

    # Custom method to handle order creation with nested events and client
    def create(self, validated_data):
        client_data = validated_data.pop('client')
        events_data = validated_data.pop('event_order')

        # Сохранение клиента
        client_serializer = ClientSerializer(data=client_data)
        client_serializer.is_valid(raise_exception=True)
        client = client_serializer.save()

        # Создание заказа
        order = Order.objects.create(client=client, **validated_data)

        # Создание событий и привязка их к заказу
        for event_data in events_data:
            event_serializer = EventSerializer(data=event_data)
            event_serializer.is_valid(raise_exception=True)
            event = event_serializer.save(order=order)

        # Отправка SMS клиенту и руководителю при создании
        self.send_sms_to_client_and_manager(client, order, created=True)

        return order

    # Custom method to handle order update
    def update(self, instance, validated_data):
        client_data = validated_data.pop('client')
        events_data = validated_data.pop('event_order')

        # Обновление клиента
        client_serializer = ClientSerializer(instance.client, data=client_data)
        client_serializer.is_valid(raise_exception=True)
        client = client_serializer.save()

        # Обновление данных заказа
        instance.comment = validated_data.get('comment', instance.comment)
        instance.total = validated_data.get('total', instance.total)
        instance.paid = validated_data.get('paid', instance.paid)
        instance.save()

        # Получаем все существующие события заказа
        existing_events = list(instance.event_order.all())

        # Обновление событий заказа
        for event_data in events_data:
            event_id = event_data.get('id', None)

            if event_id:
                # Если событие существует, обновляем его
                event_instance = instance.event_order.get(id=event_id)
                event_serializer = EventSerializer(event_instance, data=event_data)
                event_serializer.is_valid(raise_exception=True)
                event_serializer.save()

                # Убираем это событие из списка существующих событий
                existing_events = [event for event in existing_events if event.id != event_id]
            else:
                # Если ID нет, создаем новое событие
                event_serializer = EventSerializer(data=event_data)
                event_serializer.is_valid(raise_exception=True)
                event_serializer.save(order=instance)

        # Удаляем события, которые не были отправлены для обновления (то есть удаленные)
        for event in existing_events:
            event.delete()

        # Отправка SMS клиенту и руководителю при обновлении
        self.send_sms_to_client_and_manager(client, instance, created=False)

        return instance

    def send_sms_to_client_and_manager(self, client, order, created=True):
        """Отправляем SMS клиенту и руководителю с информацией об инвойсе"""
        # Логин в Eskiz
        response = self.eskiz_login()
        if response.status_code == 200:
            token = response.json().get('data')['token']

            # Формируем сообщение
            if created:
                message = f"Это тест от Eskiz"
            else:
                message = f"Это тест от Eskiz"

            # Получаем все номера телефона клиента
            phones = client.phone_client.all()
            if phones.exists():  # Проверяем, что у клиента есть телефоны
                client_phone = phones.first().phone_number  # Берем первый номер из списка
                self.send_sms(token, client_phone, message)

            # Отправляем сообщение руководителю
            manager_phone = "+998919777707"  # Номер руководителя
            self.send_sms(token, manager_phone, message)

    def eskiz_login(self):
        """Логин в Eskiz и получение токена"""
        login_url = "https://notify.eskiz.uz/api/auth/login"
        payload = {
            "email": "shakhzodabidov@gmail.com",  # Замените на ваш email
            "password": "GClc3tf45fEkbPKSQH6gfQOEBTwPFZHCUY0cd0oN"  # Замените на ваш пароль
        }
        return requests.post(login_url, data=payload)

    def send_sms(self, token, phone_number, message):
        """Отправка SMS через Eskiz API"""
        sms_url = "https://notify.eskiz.uz/api/message/sms/send"
        headers = {
            "Authorization": f"Bearer {token}"
        }
        payload = {
            "mobile_phone": phone_number,
            "message": message,
            "from": "4546",  # ID отправителя, который вам назначен в Eskiz
            "callback_url": "http://your-callback-url.com"  # Замените на ваш callback URL, если нужно
        }
        return requests.post(sms_url, headers=headers, data=payload)


class SMSSerializer(serializers.ModelSerializer):
    class Meta:
        model = SMS
        fields = ['clients', 'message', 'status', 'created_at', 'sent_at', 'error_message']

    def create(self, validated_data):
        # Отправка SMS через API Eskiz
        clients = validated_data.pop('clients')
        message = validated_data.get('message')

        # Логин в Eskiz
        response = self.eskiz_login()
        if response.status_code == 200:
            token = response.json().get('data')['token']
            for client in clients:
                phone_number = client.phone_client.first().phone_number  # Получаем первый телефон клиента
                response = self.send_sms(token, phone_number, message)
                if response.status_code == 200:
                    validated_data['status'] = SMS.SENT
                    validated_data['sent_at'] = timezone.now()
                else:
                    validated_data['status'] = SMS.FAILED
                    validated_data['error_message'] = response.text
        else:
            validated_data['status'] = SMS.FAILED
            validated_data['error_message'] = "Ошибка аутентификации Eskiz"

        sms = SMS.objects.create(**validated_data)
        sms.clients.set(clients)
        return sms

    def eskiz_login(self):
        """Логин в Eskiz и получение токена"""
        login_url = "https://notify.eskiz.uz/api/auth/login"
        payload = {
            "email": "shakhzodabidov@gmail.com",  # Замените на ваш email
            "password": "GClc3tf45fEkbPKSQH6gfQOEBTwPFZHCUY0cd0oN"  # Замените на ваш пароль
        }
        return requests.post(login_url, data=payload)

    def send_sms(self, token, phone_number, message):
        """Отправка SMS через Eskiz API"""
        sms_url = "https://notify.eskiz.uz/api/message/sms/send"
        headers = {
            "Authorization": f"Bearer {token}"
        }
        payload = {
            "mobile_phone": phone_number,
            "message": message,
            "from": "4546",  # Замените на ID отправителя, если необходимо
            "callback_url": "http://your-callback-url.com"  # Замените на ваш callback URL, если необходимо
        }
        return requests.post(sms_url, headers=headers, data=payload)
