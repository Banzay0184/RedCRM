from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAdminOrReadOnly(BasePermission):
    """Чтение (GET/HEAD/OPTIONS) — любому авторизованному пользователю.

    Изменение (POST/PUT/PATCH/DELETE) — только сотрудникам с is_staff=True.
    """

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if request.method in SAFE_METHODS:
            return True
        return bool(user.is_staff)
