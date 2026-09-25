from rest_framework.permissions import BasePermission
from rest_framework.throttling import AnonRateThrottle


class IsStaff(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.is_staff)


class RequestCreateThrottle(AnonRateThrottle):
    """Ограничение публичных заявок: 10 в час с одного IP.

    Если кэш (Redis) недоступен — не роняем запрос, а пропускаем без лимита.
    """

    scope = "redloc_request"
    rate = "10/hour"

    def allow_request(self, request, view):
        try:
            return super().allow_request(request, view)
        except Exception:
            return True
