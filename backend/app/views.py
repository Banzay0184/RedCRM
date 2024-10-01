from rest_framework_simplejwt.tokens import RefreshToken
from .models import Order, Service
from .serializers import OrderSerializer, SMSSerializer, ServiceSerializer
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Client, Event, Workers
from .serializers import ClientSerializer, EventSerializer, WorkersSerializer

from rest_framework.permissions import IsAuthenticated


class ProtectedView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"message": "You are authenticated!"})


# Service view to handle creating and listing services
class ServiceListCreateView(APIView):

    # Get all services (GET)
    def get(self, request, format=None):
        services = Service.objects.all()
        serializer = ServiceSerializer(services, many=True)
        return Response(serializer.data)

    # Create a new service (POST)
    def post(self, request, format=None):
        serializer = ServiceSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# Service detail view to handle retrieving, updating, and deleting services
class ServiceDetailView(APIView):

    # Retrieve a specific service (GET)
    def get(self, request, pk, format=None):
        try:
            service = Service.objects.get(pk=pk)
        except Service.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        serializer = ServiceSerializer(service)
        return Response(serializer.data)

    # Update a service (PUT)
    def put(self, request, pk, format=None):
        try:
            service = Service.objects.get(pk=pk)
        except Service.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        serializer = ServiceSerializer(service, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # Delete a service (DELETE)
    def delete(self, request, pk, format=None):
        try:
            service = Service.objects.get(pk=pk)
        except Service.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        service.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# Client view to handle creating and listing clients
class ClientListCreateView(APIView):

    # Get all clients (GET)
    def get(self, request, format=None):
        clients = Client.objects.all()
        serializer = ClientSerializer(clients, many=True)
        return Response(serializer.data)

    # Create a new client (POST)
    def post(self, request, format=None):
        serializer = ClientSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# Client detail view to handle retrieving, updating, and deleting clients
class ClientDetailView(APIView):

    # Retrieve a specific client (GET)
    def get(self, request, pk, format=None):
        try:
            client = Client.objects.get(pk=pk)
        except Client.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        serializer = ClientSerializer(client)
        return Response(serializer.data)

    # Update a client (PUT)
    def put(self, request, pk, format=None):
        try:
            client = Client.objects.get(pk=pk)
        except Client.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        serializer = ClientSerializer(client, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # Delete a client (DELETE)
    def delete(self, request, pk, format=None):
        try:
            client = Client.objects.get(pk=pk)
        except Client.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        client.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# Event view to handle creating and listing events
class EventListCreateView(APIView):

    # Get all events (GET)
    def get(self, request, format=None):
        events = Event.objects.all()
        serializer = EventSerializer(events, many=True)
        return Response(serializer.data)

    # Create a new event (POST)
    def post(self, request, format=None):
        serializer = EventSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# Event detail view to handle retrieving, updating, and deleting events
class EventDetailView(APIView):

    # Retrieve a specific event (GET)
    def get(self, request, pk, format=None):
        try:
            event = Event.objects.get(pk=pk)
        except Event.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        serializer = EventSerializer(event)
        return Response(serializer.data)

    # Update an event (PUT)
    def put(self, request, pk, format=None):
        try:
            event = Event.objects.get(pk=pk)
        except Event.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        serializer = EventSerializer(event, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # Delete an event (DELETE)
    def delete(self, request, pk, format=None):
        try:
            event = Event.objects.get(pk=pk)
        except Event.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        event.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# Workers view to handle creating and listing workers
class WorkersListCreateView(APIView):

    # Get all workers (GET)
    def get(self, request, format=None):
        workers = Workers.objects.all()
        serializer = WorkersSerializer(workers, many=True)
        return Response(serializer.data)

    # Create a new worker (POST)
    def post(self, request, format=None):
        serializer = WorkersSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# Workers detail view to handle retrieving, updating, and deleting workers
class WorkersDetailView(APIView):

    # Retrieve a specific worker (GET)
    def get(self, request, pk, format=None):
        try:
            worker = Workers.objects.get(pk=pk)
        except Workers.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        serializer = WorkersSerializer(worker)
        return Response(serializer.data)

    # Update a worker (PUT)
    def put(self, request, pk, format=None):
        try:
            worker = Workers.objects.get(pk=pk)
        except Workers.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        serializer = WorkersSerializer(worker, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # Delete a worker (DELETE)
    def delete(self, request, pk, format=None):
        try:
            worker = Workers.objects.get(pk=pk)
        except Workers.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        worker.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class OrderAPIView(APIView):
    def get(self, request, order_id=None):
        if order_id:
            try:
                order = Order.objects.get(id=order_id)
                serializer = OrderSerializer(order)
                return Response(serializer.data)
            except Order.DoesNotExist:
                return Response({"error": "Order not found"}, status=status.HTTP_404_NOT_FOUND)
        else:
            orders = Order.objects.all()
            serializer = OrderSerializer(orders, many=True)
            return Response(serializer.data)

    # Handle POST request (create a new order)
    def post(self, request):
        serializer = OrderSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # Handle PUT request (update an existing order)
    def put(self, request, order_id):
        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            return Response({"error": "Order not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = OrderSerializer(order, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # Handle DELETE request (delete an order)
    def delete(self, request, order_id):
        try:
            order = Order.objects.get(id=order_id)
            order.delete()
            return Response({"message": "Order deleted successfully"}, status=status.HTTP_204_NO_CONTENT)
        except Order.DoesNotExist:
            return Response({"error": "Order not found"}, status=status.HTTP_404_NOT_FOUND)


class SMSCreateAPIView(APIView):
    def post(self, request, *args, **kwargs):
        serializer = SMSSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(APIView):
    def post(self, request):
        try:
            refresh_token = request.data["refresh"]
            token = RefreshToken(refresh_token)
            token.blacklist()

            return Response(status=status.HTTP_205_RESET_CONTENT)
        except Exception as e:
            return Response(status=status.HTTP_400_BAD_REQUEST)
