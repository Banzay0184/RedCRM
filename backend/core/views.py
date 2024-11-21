from django.contrib.auth.models import User
from django.utils.dateparse import parse_datetime
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.generics import get_object_or_404, UpdateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Client, Workers, Service, Event
from .serializers import ClientSerializer, WorkersSerializer, ServiceSerializer, EventSerializer, UserSerializer


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
        workers = Workers.objects.all()
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
