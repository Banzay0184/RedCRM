from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView, TokenVerifyView, TokenBlacklistView

from .views import (
    ProtectedView,
    ClientAPIView,
    WorkerAPIView,
    ServiceAPIView,
    EventAPIView,
    UserListView,
    UserDetailView,
    ServiceDetailView,
    WorkerDetailView,
    update_workers_order,
    update_services_order,
    update_advance,
    send_event_contract,
    get_contract_logs,
    send_advance_notification,
    get_advance_notification_logs,
    worker_notification_settings,
    get_worker_notification_logs,
    send_worker_notifications_manual
)

urlpatterns = [
    path("token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("token/verify/", TokenVerifyView.as_view(), name="token_verify"),
    path("protected/", ProtectedView.as_view(), name="protected"),
    path("token/blacklist/", TokenBlacklistView.as_view(), name="token_blacklist"),
    path("users/", UserListView.as_view(), name="user-list"),  # Список всех пользователей
    path("users/<int:pk>/", UserDetailView.as_view(), name="user-detail"),  # Детали и обновление пользователя
    path("clients/", ClientAPIView.as_view(), name="client-list"),
    path("clients/<int:pk>/", ClientAPIView.as_view(), name="client-detail"),
    path("workers/", WorkerAPIView.as_view(), name="worker-list"),
    path("workers/<int:pk>/", WorkerDetailView.as_view(), name="worker-detail"),
    path('workers/update_order/', update_workers_order, name='update_workers_order'),
    path('services/update_order/', update_services_order, name='update_services_order'),
    path("services/", ServiceAPIView.as_view(), name="service-list"),
    path("service/<int:pk>/", ServiceDetailView.as_view(), name="service-detail"),
    path("events/", EventAPIView.as_view(), name="event-list"),
    path("events/<int:pk>/", EventAPIView.as_view(), name="event-detail"),
    path("events/<int:pk>/update_advance/", update_advance, name="update_advance"),
    path("events/<int:pk>/send_contract/", send_event_contract, name="send_contract"),
    path("events/<int:pk>/contract_logs/", get_contract_logs, name="contract_logs"),
    path("events/<int:pk>/send_advance_notification/", send_advance_notification, name="send_advance_notification"),
    path("events/<int:pk>/advance_notification_logs/", get_advance_notification_logs, name="advance_notification_logs"),
    path("worker-notification-settings/", worker_notification_settings, name="worker_notification_settings"),
    path("worker-notification-logs/", get_worker_notification_logs, name="worker_notification_logs"),
    path("worker-notifications/send-manual/", send_worker_notifications_manual, name="send_worker_notifications_manual"),
]
