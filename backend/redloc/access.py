"""Доступ к каталогу REDLOC по временной ссылке.

Клиент открывает ссылку /a/<token>, фронт сохраняет токен и шлёт его в заголовке
X-Redloc-Access. Сотрудники RedCRM входят обычным JWT.
"""

from django.contrib.auth.models import AnonymousUser
from django.utils import timezone
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed, NotAuthenticated
from rest_framework.permissions import SAFE_METHODS, BasePermission
from rest_framework_simplejwt.authentication import JWTAuthentication

from .models import AccessLink

HEADER = "HTTP_X_REDLOC_ACCESS"

MESSAGES = {
    "no_access": "Доступ к каталогу только по ссылке от менеджера",
    "expired": "Срок действия ссылки истёк",
    "revoked": "Ссылка отозвана",
    "invalid": "Ссылка недействительна",
}


def access_error(code):
    return {"detail": MESSAGES[code], "code": f"access_{code}"}


def find_link(token):
    if not token or len(token) > 64:
        return None
    return AccessLink.objects.select_related("client").filter(token=token).first()


class AccessLinkAuthentication(BaseAuthentication):
    """request.user = AnonymousUser, request.auth = AccessLink."""

    def authenticate(self, request):
        token = request.META.get(HEADER)
        if not token:
            return None
        link = find_link(token)
        if link is None:
            raise AuthenticationFailed(access_error("invalid"))
        if not link.is_active:
            raise AuthenticationFailed(access_error(link.state))
        return AnonymousUser(), link

    def authenticate_header(self, request):
        return "RedlocAccess"


class LenientJWTAuthentication(JWTAuthentication):
    """Протухший JWT не должен закрывать каталог клиенту с действующей ссылкой."""

    def authenticate(self, request):
        if request.META.get(HEADER):
            try:
                return super().authenticate(request)
            except Exception:
                return None
        return super().authenticate(request)


AUTHENTICATION = [LenientJWTAuthentication, AccessLinkAuthentication]


def has_catalog_access(request):
    user = request.user
    return bool(user and user.is_authenticated) or isinstance(request.auth, AccessLink)


class CatalogAccess(BasePermission):
    """Чтение каталога — сотрудник (JWT) или клиент с действующей ссылкой."""

    def has_permission(self, request, view):
        if has_catalog_access(request):
            return True
        raise NotAuthenticated(access_error("no_access"))


class CatalogReadStaffWrite(CatalogAccess):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return super().has_permission(request, view)
        user = request.user
        return bool(user and user.is_authenticated and user.is_staff)


def touch_link(link):
    now = timezone.now()
    AccessLink.objects.filter(pk=link.pk).update(
        first_opened_at=link.first_opened_at or now, last_opened_at=now, open_count=link.open_count + 1
    )
