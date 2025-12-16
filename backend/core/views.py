import asyncio
import logging
from django.core.exceptions import ValidationError
from django.core.cache import cache
from django.contrib.auth.models import User
from django.utils.dateparse import parse_datetime
from django.db import transaction
from rest_framework import status

logger = logging.getLogger(__name__)
from rest_framework.decorators import api_view, permission_classes
from rest_framework.generics import get_object_or_404, UpdateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination

from .models import Client, Workers, Service, Event, AdvanceHistory, TelegramContractLog, TelegramAdvanceNotificationLog, WorkerNotificationSettings, WorkerNotificationLog
from .serializers import ClientSerializer, WorkersSerializer, ServiceSerializer, EventSerializer, UserSerializer, \
    AdvanceHistorySerializer, TelegramContractLogSerializer, TelegramAdvanceNotificationLogSerializer, WorkerDetailSerializer, \
    WorkerNotificationSettingsSerializer, WorkerNotificationLogSerializer
from .telegram_service import TelegramService
from .message_templates import generate_contract_message, generate_advance_notification_message

# Примечание: nest_asyncio не используется, так как Telegram операции выполняются в отдельном потоке


def run_async_telegram(coro):
    """Выполнить асинхронную функцию Telegram в отдельном потоке с event loop."""
    import concurrent.futures
    
    def run_in_thread():
        """Запустить coroutine используя asyncio.run в отдельном потоке."""
        # asyncio.run создает новый event loop и правильно обрабатывает все задачи
        # Это правильный способ запуска async функций, который поддерживает wait_for
        return asyncio.run(coro)
    
    # Используем ThreadPoolExecutor для выполнения в отдельном потоке
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(run_in_thread)
        return future.result()


class ProtectedView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"message": "Вы авторизованы"})


class UserListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        users = User.objects.all()
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data, 200)


class UserDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        serializer = UserSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        serializer = UserSerializer(user, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ClientAPIView(APIView):
    """API для создания и получения клиентов."""

    def get(self, request):
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")

        # Оптимизация: prefetch_related для телефонов
        clients = Client.objects.prefetch_related('phones').all()

        if start_date and end_date:
            try:
                start_date = parse_datetime(start_date)
                end_date = parse_datetime(end_date)
                clients = clients.filter(created_at__range=[start_date, end_date])
            except (ValueError, TypeError):
                return Response({"detail": "Неверный формат даты."}, status=status.HTTP_400_BAD_REQUEST)

        # Применяем пагинацию только если запрошена (есть параметры page или page_size)
        page = request.query_params.get('page')
        page_size = request.query_params.get('page_size')
        
        if page or page_size:
            paginator = PageNumberPagination()
            paginator.page_size = int(page_size) if page_size else 10
            paginated_clients = paginator.paginate_queryset(clients, request)
            serializer = ClientSerializer(paginated_clients, many=True)
            return paginator.get_paginated_response(serializer.data)
        else:
            # Без пагинации - возвращаем все результаты
            serializer = ClientSerializer(clients, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = ClientSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, pk):
        client = get_object_or_404(Client, pk=pk)
        serializer = ClientSerializer(client, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        client = get_object_or_404(Client, pk=pk)
        client.delete()
        return Response({"detail": "Client deleted successfully."}, status=status.HTTP_204_NO_CONTENT)


class WorkerAPIView(APIView):
    serializer_class = WorkersSerializer

    def get(self, request):
        # Оптимизация: используем отсортированный queryset
        workers = Workers.objects.all().order_by('order')
        serializer = WorkersSerializer(workers, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = WorkersSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



@api_view(['POST'])
def update_workers_order(request):
    """Оптимизированное обновление порядка работников через bulk_update."""
    workers_order = request.data  # Ожидаем список словарей с 'id' и 'order'

    try:
        # Получаем все ID для обновления
        worker_ids = [item['id'] for item in workers_order]
        
        # Получаем все объекты одним запросом
        workers = {w.id: w for w in Workers.objects.filter(id__in=worker_ids)}
        
        # Обновляем порядок
        workers_to_update = []
        for worker_data in workers_order:
            worker_id = worker_data['id']
            if worker_id in workers:
                worker = workers[worker_id]
                worker.order = worker_data['order']
                workers_to_update.append(worker)
        
        # Bulk update - один запрос вместо N
        Workers.objects.bulk_update(workers_to_update, ['order'])
        
        return Response({'message': 'Порядок работников обновлен'}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
def update_advance(request, pk):
    """Обновление аванса с сохранением истории."""
    # Получаем событие по ID
    event = get_object_or_404(Event, pk=pk)
    amount = request.data.get('amount')
    change_type = request.data.get('change_type')
    advance_money = request.data.get('advance_money')

    if amount is None or change_type not in ['add', 'subtract']:
        return Response({"error": "Некорректные данные"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        amount = float(amount)
    except ValueError:
        return Response({"error": "Сумма должна быть числом"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Используем метод из модели
        event.update_advance(amount, change_type, advance_money)
        
        # Возвращаем обновлённые данные
        serializer = EventSerializer(event)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except ValidationError as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class WorkerDetailView(UpdateAPIView):
    serializer_class = WorkersSerializer
    queryset = Workers.objects.all()

    def get(self, request, pk):
        """Получение детальной информации о работнике с его задачами и мероприятиями."""
        worker = get_object_or_404(
            Workers.objects.prefetch_related(
                'devices__service',
                'devices__event__client',
                'devices__event__client__phones',
                'devices__event__devices__service',
            ),
            pk=pk
        )
        serializer = WorkerDetailSerializer(worker)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        worker = get_object_or_404(Workers, pk=pk)
        worker.delete()
        return Response({"detail": "Worker deleted successfully."}, status=status.HTTP_204_NO_CONTENT)


class ServiceAPIView(APIView):
    """API для создания и получения услуг."""

    def get(self, request):
        # Оптимизация: кэширование списка услуг
        cache_key = 'services_list'
        cached_data = cache.get(cache_key)
        
        if cached_data is None:
            services = Service.objects.all()
            serializer = ServiceSerializer(services, many=True)
            cached_data = serializer.data
            cache.set(cache_key, cached_data, 300)  # Кэш на 5 минут
        
        return Response(cached_data, 200)

    def post(self, request):
        serializer = ServiceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        # Инвалидация кэша при создании нового сервиса
        cache.delete('services_list')
        return Response(serializer.data, 201)



class ServiceDetailView(UpdateAPIView):
    serializer_class = ServiceSerializer
    queryset = Service.objects.all()

    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)
        # Инвалидация кэша при обновлении
        cache.delete('services_list')
        return response

    def delete(self, request, pk):
        service = get_object_or_404(Service, pk=pk)
        service.delete()
        # Инвалидация кэша при удалении
        cache.delete('services_list')
        return Response({"detail": "Service deleted successfully."}, 204)


class EventAPIView(APIView):
    """API для работы с мероприятиями."""

    def get(self, request, pk=None):
        start_date_str = request.query_params.get("start_date")
        end_date_str = request.query_params.get("end_date")

        if pk:
            # Оптимизация: select_related для client, prefetch_related для связанных объектов
            event = get_object_or_404(
                Event.objects.select_related('client')
                .prefetch_related(
                    'client__phones',
                    'devices__service',
                    'devices__workers',
                    'advance_history'
                ),
                pk=pk
            )
            serializer = EventSerializer(event)
            return Response(serializer.data, status=status.HTTP_200_OK)

        # Оптимизация: select_related и prefetch_related для списка событий
        # Сортируем по дате создания (сначала новые)
        events = Event.objects.select_related('client').prefetch_related(
            'client__phones',
            'devices__service',
            'devices__workers',
            'advance_history'
        ).order_by('-created_at')

        if start_date_str and end_date_str:
            try:
                start_date = parse_datetime(start_date_str)
                end_date = parse_datetime(end_date_str)
                events = events.filter(created_at__range=[start_date, end_date])
            except (ValueError, TypeError):
                return Response({"detail": "Неверный формат даты."}, status=status.HTTP_400_BAD_REQUEST)

        # Применяем пагинацию только если запрошена (есть параметры page или page_size)
        page = request.query_params.get('page')
        page_size = request.query_params.get('page_size')
        
        if page or page_size:
            paginator = PageNumberPagination()
            paginator.page_size = int(page_size) if page_size else 10
            paginated_events = paginator.paginate_queryset(events, request)
            serializer = EventSerializer(paginated_events, many=True)
            return paginator.get_paginated_response(serializer.data)
        else:
            # Без пагинации - возвращаем все результаты
            serializer = EventSerializer(events, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = EventSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, 201)

    def put(self, request, pk):
        event = get_object_or_404(Event, pk=pk)
        serializer = EventSerializer(event, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        event = get_object_or_404(Event, pk=pk)

        # Удаление всех связанных устройств через каскадное удаление
        event.delete()

        return Response(
            {"detail": "Event and its related devices deleted successfully."}, status=status.HTTP_204_NO_CONTENT
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_event_contract(request, pk):
    """Отправка договора в Telegram."""
    
    event = get_object_or_404(Event, pk=pk)
    phone = request.data.get('phone')
    
    if not phone:
        return Response(
            {"detail": "Номер телефона обязателен"}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Нормализация номера
    phone = TelegramService.normalize_phone(phone)
    
    # Валидация номера
    if not TelegramService.validate_phone_number(phone):
        return Response(
            {"detail": "Неверный формат номера телефона. Ожидается формат: +998XXXXXXXXX"}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Генерация текста договора
    message_text = generate_contract_message(event)
    
    # Отправка сообщения (вне транзакции, чтобы не блокировать БД)
    try:
        result = run_async_telegram(TelegramService.send_message(phone, message_text))
        
        # Сохранение лога после отправки (в отдельной транзакции)
        try:
            with transaction.atomic():
                TelegramContractLog.objects.create(
                    event=event,
                    phone=phone,
                    status='success' if result.get('ok') else 'error',
                    error=result.get('error'),
                    message_text=message_text,
                    telegram_user_id=result.get('telegram_user_id')
                )
        except Exception as db_error:
            # Логируем ошибку БД, но не прерываем ответ
            logger.error(f"Ошибка при сохранении лога: {db_error}")
        
        if result.get('ok'):
            return Response({
                "status": "success",
                "message": "Договор успешно отправлен в Telegram",
                "telegram_user_id": result.get('telegram_user_id')
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                "status": "error",
                "detail": result.get('error', 'Неизвестная ошибка')
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        # Сохранение лога с ошибкой (в отдельной транзакции)
        try:
            with transaction.atomic():
                TelegramContractLog.objects.create(
                    event=event,
                    phone=phone,
                    status='error',
                    error=str(e),
                    message_text=message_text
                )
        except Exception as db_error:
            logger.error(f"Ошибка при сохранении лога ошибки: {db_error}")
        
        return Response(
            {"detail": f"Ошибка при отправке: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_contract_logs(request, pk):
    """Получение истории отправок договоров."""
    
    event = get_object_or_404(Event, pk=pk)
    # Оптимизация: используем select_related если нужно, но здесь не требуется
    logs = TelegramContractLog.objects.filter(event=event).order_by('-sent_at')
    serializer = TelegramContractLogSerializer(logs, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_advance_notification(request, pk):
    """Отправка уведомления об авансе в Telegram."""
    
    event = get_object_or_404(Event, pk=pk)
    phone = request.data.get('phone')
    
    if not phone:
        return Response(
            {"detail": "Номер телефона обязателен"}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Нормализация номера
    phone = TelegramService.normalize_phone(phone)
    
    # Валидация номера
    if not TelegramService.validate_phone_number(phone):
        return Response(
            {"detail": "Неверный формат номера телефона. Ожидается формат: +998XXXXXXXXX"}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Получаем последнюю запись из истории аванса (используем индекс)
    last_advance_history = AdvanceHistory.objects.filter(event=event).order_by('-date').first()
    
    if not last_advance_history:
        return Response(
            {"detail": "История изменений аванса не найдена"}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Генерация текста уведомления
    message_text = generate_advance_notification_message(
        event, 
        last_advance_history.change_type, 
        last_advance_history.amount
    )
    
    # Отправка сообщения (вне транзакции, чтобы не блокировать БД)
    try:
        result = run_async_telegram(TelegramService.send_message(phone, message_text))
        
        # Сохранение лога после отправки (в отдельной транзакции)
        try:
            with transaction.atomic():
                TelegramAdvanceNotificationLog.objects.create(
                    event=event,
                    phone=phone,
                    status='success' if result.get('ok') else 'error',
                    error=result.get('error'),
                    message_text=message_text,
                    telegram_user_id=result.get('telegram_user_id')
                )
        except Exception as db_error:
            # Логируем ошибку БД, но не прерываем ответ
            logger.error(f"Ошибка при сохранении лога: {db_error}")
        
        if result.get('ok'):
            return Response({
                "status": "success",
                "message": "Уведомление об авансе успешно отправлено в Telegram",
                "telegram_user_id": result.get('telegram_user_id')
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                "status": "error",
                "detail": result.get('error', 'Неизвестная ошибка')
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        # Сохранение лога с ошибкой (в отдельной транзакции)
        try:
            with transaction.atomic():
                TelegramAdvanceNotificationLog.objects.create(
                    event=event,
                    phone=phone,
                    status='error',
                    error=str(e),
                    message_text=message_text
                )
        except Exception as db_error:
            logger.error(f"Ошибка при сохранении лога ошибки: {db_error}")
        
        return Response(
            {"detail": f"Ошибка при отправке: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_advance_notification_logs(request, pk):
    """Получение истории отправок уведомлений об авансе."""
    
    event = get_object_or_404(Event, pk=pk)
    # Оптимизация: используем индексы для быстрого поиска
    logs = TelegramAdvanceNotificationLog.objects.filter(event=event).order_by('-sent_at')
    serializer = TelegramAdvanceNotificationLogSerializer(logs, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def worker_notification_settings(request):
    """Получение и обновление настроек уведомлений работникам."""
    
    if request.method == 'GET':
        settings = WorkerNotificationSettings.objects.first()
        if not settings:
            # Создаём настройки по умолчанию
            settings = WorkerNotificationSettings.objects.create(
                notification_time='09:00:00',
                enabled=True
            )
        serializer = WorkerNotificationSettingsSerializer(settings)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    elif request.method == 'PUT':
        settings = WorkerNotificationSettings.objects.first()
        if not settings:
            settings = WorkerNotificationSettings.objects.create()
        
        serializer = WorkerNotificationSettingsSerializer(settings, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_worker_notification_logs(request):
    """Получение истории отправки уведомлений работникам."""
    
    worker_id = request.query_params.get('worker_id')
    event_date = request.query_params.get('event_date')
    notification_type = request.query_params.get('notification_type')
    
    logs = WorkerNotificationLog.objects.all().select_related('worker').order_by('-sent_at')
    
    # Фильтрация по работнику
    if worker_id:
        logs = logs.filter(worker_id=worker_id)
    
    # Фильтрация по дате мероприятия
    if event_date:
        logs = logs.filter(event_date=event_date)
    
    # Фильтрация по типу уведомления
    if notification_type:
        logs = logs.filter(notification_type=notification_type)
    
    # Применяем пагинацию
    page = request.query_params.get('page')
    page_size = request.query_params.get('page_size')
    
    if page or page_size:
        paginator = PageNumberPagination()
        paginator.page_size = int(page_size) if page_size else 20
        paginated_logs = paginator.paginate_queryset(logs, request)
        serializer = WorkerNotificationLogSerializer(paginated_logs, many=True)
        return paginator.get_paginated_response(serializer.data)
    else:
        # Без пагинации - возвращаем все результаты (ограничиваем последними 100)
        logs = logs[:100]
        serializer = WorkerNotificationLogSerializer(logs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_worker_notifications_manual(request):
    """Ручная отправка уведомлений работникам (для тестирования)."""
    from .tasks import send_worker_event_notifications
    
    try:
        # Запускаем задачу синхронно для тестирования
        send_worker_event_notifications.delay()
        return Response({
            "status": "success",
            "message": "Задача отправки уведомлений запущена. Проверьте историю отправки через несколько секунд."
        }, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Ошибка при запуске задачи отправки уведомлений: {str(e)}")
        return Response({
            "status": "error",
            "detail": f"Ошибка при запуске задачи: {str(e)}"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
