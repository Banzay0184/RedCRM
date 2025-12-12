import asyncio
from django.core.exceptions import ValidationError
from django.contrib.auth.models import User
from django.utils.dateparse import parse_datetime
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.generics import get_object_or_404, UpdateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Client, Workers, Service, Event, AdvanceHistory, TelegramContractLog, TelegramAdvanceNotificationLog
from .serializers import ClientSerializer, WorkersSerializer, ServiceSerializer, EventSerializer, UserSerializer, \
    AdvanceHistorySerializer, TelegramContractLogSerializer, TelegramAdvanceNotificationLogSerializer
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

        clients = Client.objects.all()

        if start_date and end_date:
            try:
                start_date = parse_datetime(start_date)
                end_date = parse_datetime(end_date)
                clients = clients.filter(created_at__range=[start_date, end_date])
            except (ValueError, TypeError):
                return Response({"detail": "Неверный формат даты."}, status=status.HTTP_400_BAD_REQUEST)

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
    queryset = Workers.objects.all().order_by('order')
    serializer_class = WorkersSerializer

    def get(self, request):
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
    workers_order = request.data  # Ожидаем список словарей с 'id' и 'order'

    try:
        for worker_data in workers_order:
            worker = Workers.objects.get(id=worker_data['id'])
            worker.order = worker_data['order']
            worker.save()
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

    def delete(self, request, pk):
        worker = get_object_or_404(Workers, pk=pk)
        worker.delete()
        return Response({"detail": "Worker deleted successfully."}, status=status.HTTP_204_NO_CONTENT)


class ServiceAPIView(APIView):
    """API для создания и получения услуг."""

    def get(self, request):
        services = Service.objects.all()
        serializer = ServiceSerializer(services, many=True)
        return Response(serializer.data, 200)

    def post(self, request):
        serializer = ServiceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, 201)



class ServiceDetailView(UpdateAPIView):
    serializer_class = ServiceSerializer
    queryset = Service.objects.all()

    def delete(self, request, pk):
        service = get_object_or_404(Service, pk=pk)
        service.delete()
        return Response({"detail": "Service deleted successfully."}, 204)


class EventAPIView(APIView):
    """API для работы с мероприятиями."""

    def get(self, request, pk=None):
        start_date_str = request.query_params.get("start_date")
        end_date_str = request.query_params.get("end_date")

        if pk:
            event = get_object_or_404(Event, pk=pk)
            serializer = EventSerializer(event)
            return Response(serializer.data, status=status.HTTP_200_OK)

        events = Event.objects.all()

        if start_date_str and end_date_str:
            try:
                start_date = parse_datetime(start_date_str)
                end_date = parse_datetime(end_date_str)
                events = events.filter(created_at__range=[start_date, end_date])
            except (ValueError, TypeError):
                return Response({"detail": "Неверный формат даты."}, status=status.HTTP_400_BAD_REQUEST)

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
    
    # Отправка сообщения
    try:
        result = run_async_telegram(TelegramService.send_message(phone, message_text))
        
        # Сохранение лога
        log = TelegramContractLog.objects.create(
            event=event,
            phone=phone,
            status='success' if result.get('ok') else 'error',
            error=result.get('error'),
            message_text=message_text,
            telegram_user_id=result.get('telegram_user_id')
        )
        
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
        # Сохранение лога с ошибкой
        TelegramContractLog.objects.create(
            event=event,
            phone=phone,
            status='error',
            error=str(e),
            message_text=message_text
        )
        return Response(
            {"detail": f"Ошибка при отправке: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_contract_logs(request, pk):
    """Получение истории отправок договоров."""
    
    event = get_object_or_404(Event, pk=pk)
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
    
    # Получаем последнюю запись из истории аванса
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
    
    # Отправка сообщения
    try:
        result = run_async_telegram(TelegramService.send_message(phone, message_text))
        
        # Сохранение лога
        log = TelegramAdvanceNotificationLog.objects.create(
            event=event,
            phone=phone,
            status='success' if result.get('ok') else 'error',
            error=result.get('error'),
            message_text=message_text,
            telegram_user_id=result.get('telegram_user_id')
        )
        
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
        # Сохранение лога с ошибкой
        TelegramAdvanceNotificationLog.objects.create(
            event=event,
            phone=phone,
            status='error',
            error=str(e),
            message_text=message_text
        )
        return Response(
            {"detail": f"Ошибка при отправке: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_advance_notification_logs(request, pk):
    """Получение истории отправок уведомлений об авансе."""
    
    event = get_object_or_404(Event, pk=pk)
    logs = TelegramAdvanceNotificationLog.objects.filter(event=event).order_by('-sent_at')
    serializer = TelegramAdvanceNotificationLogSerializer(logs, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)
