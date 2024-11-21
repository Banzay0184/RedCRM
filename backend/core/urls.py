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
    path("services/", ServiceAPIView.as_view(), name="service-list"),
    path("service/<int:pk>/", ServiceDetailView.as_view(), name="service-detail"),
    path("events/", EventAPIView.as_view(), name="event-list"),
    path("events/<int:pk>/", EventAPIView.as_view(), name="event-detail"),
]
