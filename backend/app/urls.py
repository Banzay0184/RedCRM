from django.urls import path
from .views import OrderAPIView, ClientListCreateView, WorkersDetailView, ClientDetailView, EventDetailView, \
    WorkersListCreateView, EventListCreateView, SMSCreateAPIView, LogoutView, ServiceListCreateView, ServiceDetailView
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    # URL для получения JWT токена
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('logout/', LogoutView.as_view(), name='logout'),

    # URL для обновления токена
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Service related paths
    path('services/', ServiceListCreateView.as_view(), name='service-list-create'),
    path('services/<int:pk>/', ServiceDetailView.as_view(), name='service-detail'),

    path('orders/', OrderAPIView.as_view(), name='order-list'),  # For listing and creating orders
    path('orders/<int:order_id>/', OrderAPIView.as_view(), name='order-detail'),
    path('clients/', ClientListCreateView.as_view(), name='client-list-create'),
    path('clients/<int:pk>/', ClientDetailView.as_view(), name='client-detail'),
    path('events/', EventListCreateView.as_view(), name='event-list-create'),
    path('events/<int:pk>/', EventDetailView.as_view(), name='event-detail'),
    path('workers/', WorkersListCreateView.as_view(), name='workers-list-create'),
    path('workers/<int:pk>/', WorkersDetailView.as_view(), name='workers-detail'),
    path('sms/', SMSCreateAPIView.as_view(), name='sms-create'),
]
# For retrieving, updating, or deleting a specific order
