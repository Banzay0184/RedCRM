from django.db import transaction
from django.db.models import Count, F, Max, Prefetch, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action, api_view, authentication_classes, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .images import InvalidImage, process_photo, process_poster
from .models import (
    Amenity, Category, City, Favorite, Location, LocationPhoto, LocationRequest, LocationVideo, LocationZone,
    ShootType, Tag,
)
from .access import AUTHENTICATION, CatalogAccess, CatalogReadStaffWrite, access_error, find_link, touch_link
from .messages import access_link_message
from .models import AccessLink
from .permissions import IsStaff, RequestCreateThrottle
from .serializers import (
    AccessLinkSerializer, access_link_url, AmenitySerializer, CategorySerializer, CitySerializer, LocationDetailSerializer, LocationListSerializer,
    LocationWriteSerializer, PhotoSerializer, RequestAdminSerializer, RequestSerializer, ShootTypeSerializer,
    TagSerializer, VideoSerializer, ZoneSerializer,
)

MAX_PHOTOS_PER_UPLOAD = 30
MAX_PHOTO_SIZE = 25 * 1024 * 1024
MAX_VIDEO_SIZE = 500 * 1024 * 1024


class CatalogPagination(PageNumberPagination):
    page_size = 12
    page_size_query_param = "page_size"
    max_page_size = 60


def is_staff(request):
    return bool(request.user and request.user.is_authenticated and request.user.is_staff)


def _csv(value):
    return [v for v in (value or "").split(",") if v]


def _next_order(qs):
    return (qs.aggregate(m=Max("order"))["m"] or 0) + 1


def _reorder(model, ids, location_id=None):
    if not isinstance(ids, list) or not all(isinstance(i, int) for i in ids):
        raise ValidationError({"ids": "Ожидается список id"})
    qs = model.objects.filter(id__in=ids)
    if location_id is not None:
        qs = qs.filter(location_id=location_id)
    objs = {o.id: o for o in qs}
    with transaction.atomic():
        for idx, obj_id in enumerate(ids):
            if obj_id in objs:
                objs[obj_id].order = idx
        model.objects.bulk_update(objs.values(), ["order"])


# ---------------------------------------------------------------- справочники


class DictionaryViewSet(viewsets.ModelViewSet):
    """Города / категории / типы съёмки / удобства: читать всем, менять — staff."""

    authentication_classes = AUTHENTICATION
    permission_classes = [CatalogReadStaffWrite]
    pagination_class = None
    model = None

    def get_queryset(self):
        published = Q(locations__is_published=True)
        return self.model.objects.annotate(
            locations_count=Count("locations", filter=published, distinct=True)
        ).order_by("order", "id")

    def perform_create(self, serializer):
        serializer.save(order=_next_order(self.model.objects))

    @action(detail=False, methods=["post"], permission_classes=[IsStaff])
    def reorder(self, request):
        _reorder(self.model, request.data.get("ids"))
        return Response({"ok": True})

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        if isinstance(obj, City) and obj.locations.exists():
            return Response(
                {"detail": "Нельзя удалить город, к которому привязаны локации"}, status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)


class CityViewSet(DictionaryViewSet):
    model = City
    serializer_class = CitySerializer


class CategoryViewSet(DictionaryViewSet):
    model = Category
    serializer_class = CategorySerializer


class ShootTypeViewSet(DictionaryViewSet):
    model = ShootType
    serializer_class = ShootTypeSerializer


class AmenityViewSet(DictionaryViewSet):
    model = Amenity
    serializer_class = AmenitySerializer


class TagViewSet(viewsets.ModelViewSet):
    authentication_classes = AUTHENTICATION
    permission_classes = [CatalogReadStaffWrite]
    serializer_class = TagSerializer
    pagination_class = None

    def get_queryset(self):
        qs = Tag.objects.annotate(
            locations_count=Count("locations", filter=Q(locations__is_published=True), distinct=True)
        )
        q = self.request.query_params.get("q")
        if q:
            qs = qs.filter(name__icontains=q)
        if self.request.query_params.get("used") == "1":
            qs = qs.filter(locations_count__gt=0)
        return qs.order_by("-locations_count", "name")


@api_view(["GET"])
@authentication_classes(AUTHENTICATION)
@permission_classes([CatalogAccess])
def meta(request):
    """Всё для фильтров одним запросом + общая статистика каталога."""

    def dicts(model, serializer):
        qs = model.objects.annotate(
            locations_count=Count("locations", filter=Q(locations__is_published=True), distinct=True)
        ).order_by("order", "id")
        return serializer(qs, many=True).data

    published = Location.objects.filter(is_published=True)
    return Response({
        "cities": dicts(City, CitySerializer),
        "categories": dicts(Category, CategorySerializer),
        "shoot_types": dicts(ShootType, ShootTypeSerializer),
        "amenities": dicts(Amenity, AmenitySerializer),
        "badges": [{"value": v, "label": label} for v, label in Location.BADGE_CHOICES if v],
        "stats": {
            "locations": published.count(),
            "photos": LocationPhoto.objects.filter(location__is_published=True).count(),
            "videos": LocationVideo.objects.filter(location__is_published=True).count(),
            "cities": published.exclude(city=None).values("city").distinct().count(),
        },
    })


@api_view(["GET"])
@authentication_classes(AUTHENTICATION)
@permission_classes([IsAuthenticated])
def me(request):
    u = request.user
    return Response({
        "id": u.id, "username": u.username, "first_name": u.first_name, "last_name": u.last_name,
        "is_staff": u.is_staff,
    })


# ---------------------------------------------------------------- локации


class LocationViewSet(viewsets.ModelViewSet):
    """Каталог локаций. Публичный доступ по slug; изменение — только staff."""

    authentication_classes = AUTHENTICATION
    permission_classes = [CatalogReadStaffWrite]
    pagination_class = CatalogPagination
    lookup_field = "slug"
    lookup_value_regex = "[-a-zA-Z0-9_]+"

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return LocationWriteSerializer
        if self.action == "retrieve":
            return LocationDetailSerializer
        return LocationListSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        user = self.request.user
        if user and user.is_authenticated:
            ctx["favorite_ids"] = set(Favorite.objects.filter(user=user).values_list("location_id", flat=True))
        return ctx

    def get_queryset(self):
        p = self.request.query_params
        photos_qs = LocationPhoto.objects.order_by("order", "id")
        qs = (
            Location.objects.select_related("city")
            .prefetch_related("categories", "tags", Prefetch("photos", queryset=photos_qs[:1], to_attr="cover_photos"))
            .annotate(
                photos_count=Count("photos", distinct=True),
                videos_count=Count("videos", distinct=True),
            )
        )
        if self.action == "retrieve":
            qs = qs.prefetch_related(
                "shoot_types", "amenities", "zones",
                Prefetch("photos", queryset=photos_qs),
                Prefetch("videos", queryset=LocationVideo.objects.order_by("order", "id")),
            )

        # Неопубликованные видит только staff (и то — по запросу ?all=1 в списке)
        if not is_staff(self.request):
            qs = qs.filter(is_published=True)
        elif self.action == "list" and p.get("all") != "1":
            qs = qs.filter(is_published=True)
        if self.action != "list":
            return qs

        if p.get("city"):
            qs = qs.filter(city__slug__in=_csv(p["city"]))
        for param, field in (
            ("category", "categories__slug"),
            ("tag", "tags__slug"),
            ("shoot_type", "shoot_types__slug"),
            ("amenity", "amenities__slug"),
        ):
            for value in _csv(p.get(param)):
                # Каждое значение — отдельный filter(): локация должна подходить под ВСЕ выбранные
                qs = qs.filter(**{field: value})
        if p.get("badge"):
            qs = qs.filter(badge__in=_csv(p["badge"]))
        if p.get("featured") == "1":
            qs = qs.filter(is_featured=True)
        if p.get("has_video") == "1":
            qs = qs.filter(videos_count__gt=0)
        if p.get("ids"):
            ids = [int(i) for i in _csv(p["ids"]) if i.isdigit()]
            qs = qs.filter(id__in=ids)
        if p.get("favorites") == "1":
            user = self.request.user
            qs = qs.filter(favorites__user=user) if user.is_authenticated else qs.none()
        q = (p.get("q") or "").strip()
        if q:
            qs = qs.filter(
                Q(title__icontains=q)
                | Q(description_ru__icontains=q)
                | Q(description_uz__icontains=q)
                | Q(address_hint__icontains=q)
                | Q(tags__name__icontains=q)
                | Q(city__name_ru__icontains=q)
                | Q(city__name_uz__icontains=q)
                | Q(categories__name_ru__icontains=q)
                | Q(categories__name_uz__icontains=q)
            ).distinct()

        ordering = {
            "new": ["-created_at"],
            "popular": ["-is_featured", "-views_count", "-created_at"],
            "views": ["-views_count"],
            "photos": ["-photos_count", "-created_at"],
            "title": ["title"],
        }.get(p.get("ordering"), ["-is_featured", "-created_at"])
        return qs.order_by(*ordering)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if not is_staff(request):
            Location.objects.filter(pk=instance.pk).update(views_count=F("views_count") + 1)
        return Response(self.get_serializer(instance).data)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["get"], permission_classes=[CatalogAccess])
    def similar(self, request, slug=None):
        location = self.get_object()
        cat_ids = list(location.categories.values_list("id", flat=True))
        qs = (
            Location.objects.filter(is_published=True)
            .exclude(pk=location.pk)
            .filter(Q(categories__in=cat_ids) | Q(city=location.city_id))
            .select_related("city")
            .prefetch_related(
                "categories", "tags",
                Prefetch("photos", queryset=LocationPhoto.objects.order_by("order", "id")[:1], to_attr="cover_photos"),
            )
            .annotate(photos_count=Count("photos", distinct=True), videos_count=Count("videos", distinct=True))
            .distinct()
            .order_by("-is_featured", "-views_count")[:8]
        )
        return Response(LocationListSerializer(qs, many=True, context=self.get_serializer_context()).data)

    @action(detail=True, methods=["post", "delete"], permission_classes=[IsAuthenticated])
    def favorite(self, request, slug=None):
        location = self.get_object()
        if request.method == "POST":
            Favorite.objects.get_or_create(user=request.user, location=location)
            return Response({"is_favorite": True})
        Favorite.objects.filter(user=request.user, location=location).delete()
        return Response({"is_favorite": False})


@api_view(["POST"])
@authentication_classes(AUTHENTICATION)
@permission_classes([IsAuthenticated])
def sync_favorites(request):
    """Переносит «гостевое» избранное (из localStorage) в аккаунт после входа."""
    ids = [i for i in request.data.get("ids", []) if isinstance(i, int)][:500]
    existing = set(Favorite.objects.filter(user=request.user).values_list("location_id", flat=True))
    valid = Location.objects.filter(id__in=ids, is_published=True).exclude(id__in=existing).values_list("id", flat=True)
    Favorite.objects.bulk_create([Favorite(user=request.user, location_id=i) for i in valid])
    return Response({"ids": list(Favorite.objects.filter(user=request.user).values_list("location_id", flat=True))})


@api_view(["GET"])
@authentication_classes(AUTHENTICATION)
@permission_classes([IsAuthenticated])
def favorite_ids(request):
    return Response({"ids": list(Favorite.objects.filter(user=request.user).values_list("location_id", flat=True))})


# ---------------------------------------------------------------- медиа


class PhotoViewSet(mixins.ListModelMixin, mixins.UpdateModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet):
    """Фото всех локаций (страница «Фото») + загрузка/сортировка/удаление для staff."""

    authentication_classes = AUTHENTICATION
    permission_classes = [CatalogReadStaffWrite]
    serializer_class = PhotoSerializer
    pagination_class = CatalogPagination

    def get_queryset(self):
        qs = LocationPhoto.objects.select_related("location")
        if not is_staff(self.request):
            qs = qs.filter(location__is_published=True)
        p = self.request.query_params
        if p.get("location"):
            qs = qs.filter(location__slug=p["location"]) if not p["location"].isdigit() else qs.filter(location_id=p["location"])
        if p.get("zone"):
            qs = qs.filter(zone_id=p["zone"])
        if p.get("category"):
            qs = qs.filter(location__categories__slug=p["category"])
        if p.get("city"):
            qs = qs.filter(location__city__slug=p["city"])
        if self.action == "list" and not p.get("location"):
            return qs.order_by("-created_at", "-id")
        return qs.order_by("order", "id")

    def create(self, request, *args, **kwargs):
        location = get_object_or_404(Location, pk=request.data.get("location"))
        files = request.FILES.getlist("images")
        if not files:
            raise ValidationError({"images": "Выберите хотя бы одно фото"})
        if len(files) > MAX_PHOTOS_PER_UPLOAD:
            raise ValidationError({"images": f"Не больше {MAX_PHOTOS_PER_UPLOAD} фото за раз"})

        created, errors = [], []
        order = _next_order(location.photos)
        for f in files:
            if f.size > MAX_PHOTO_SIZE:
                errors.append({"file": f.name, "error": "Файл больше 25 МБ"})
                continue
            try:
                full, thumb = process_photo(f)
            except InvalidImage as exc:
                errors.append({"file": f.name, "error": str(exc)})
                continue
            photo = LocationPhoto(location=location, order=order)
            photo.image.save("photo.webp", full, save=False)
            photo.thumbnail.save("thumb.webp", thumb, save=False)
            photo.save()
            created.append(photo)
            order += 1
        data = PhotoSerializer(created, many=True, context={"request": request}).data
        code = status.HTTP_201_CREATED if created else status.HTTP_400_BAD_REQUEST
        return Response({"created": data, "errors": errors}, status=code)

    @action(detail=False, methods=["post"], permission_classes=[IsStaff])
    def reorder(self, request):
        _reorder(LocationPhoto, request.data.get("ids"), request.data.get("location"))
        return Response({"ok": True})

    def perform_destroy(self, instance):
        image, thumb = instance.image, instance.thumbnail
        instance.delete()
        for f in (image, thumb):
            if f:
                f.delete(save=False)


class VideoViewSet(viewsets.ModelViewSet):
    authentication_classes = AUTHENTICATION
    permission_classes = [CatalogReadStaffWrite]
    serializer_class = VideoSerializer
    pagination_class = CatalogPagination

    def get_queryset(self):
        qs = LocationVideo.objects.select_related("location")
        if not is_staff(self.request):
            qs = qs.filter(location__is_published=True)
        p = self.request.query_params
        if p.get("location"):
            qs = qs.filter(location__slug=p["location"]) if not p["location"].isdigit() else qs.filter(location_id=p["location"])
        if self.action == "list" and not p.get("location"):
            return qs.order_by("-created_at", "-id")
        return qs.order_by("order", "id")

    def _save(self, serializer, **extra):
        f = serializer.validated_data.get("file")
        if f and f.size > MAX_VIDEO_SIZE:
            raise ValidationError({"file": "Видео больше 500 МБ — загрузите на YouTube и вставьте ссылку"})
        poster = serializer.validated_data.pop("poster", None)
        if poster:
            try:
                extra["poster"] = process_poster(poster)
            except InvalidImage as exc:
                raise ValidationError({"poster": str(exc)})
        instance = serializer.save(**{k: v for k, v in extra.items() if k != "poster"})
        if "poster" in extra:
            if instance.poster:
                instance.poster.delete(save=False)
            instance.poster.save("poster.webp", extra["poster"])

    def perform_create(self, serializer):
        location = serializer.validated_data["location"]
        self._save(serializer, order=_next_order(location.videos))

    def perform_update(self, serializer):
        self._save(serializer)

    @action(detail=False, methods=["post"], permission_classes=[IsStaff])
    def reorder(self, request):
        _reorder(LocationVideo, request.data.get("ids"), request.data.get("location"))
        return Response({"ok": True})

    def perform_destroy(self, instance):
        files = [instance.file, instance.poster]
        instance.delete()
        for f in files:
            if f:
                f.delete(save=False)


class ZoneViewSet(viewsets.ModelViewSet):
    authentication_classes = AUTHENTICATION
    permission_classes = [CatalogReadStaffWrite]
    serializer_class = ZoneSerializer
    pagination_class = None

    def get_queryset(self):
        qs = LocationZone.objects.annotate(photos_count=Count("photos"))
        if self.request.query_params.get("location"):
            qs = qs.filter(location_id=self.request.query_params["location"])
        if not is_staff(self.request):
            qs = qs.filter(location__is_published=True)
        return qs.order_by("order", "id")

    def perform_create(self, serializer):
        serializer.save(order=_next_order(serializer.validated_data["location"].zones))


# ---------------------------------------------------------------- заявки


class RequestViewSet(viewsets.ModelViewSet):
    """Заявки: создать может любой (с лимитом), просматривать и обрабатывать — staff."""

    pagination_class = CatalogPagination
    authentication_classes = AUTHENTICATION

    def get_permissions(self):
        if self.action == "create":
            return [CatalogAccess()]
        return [IsStaff()]

    def get_throttles(self):
        if self.action == "create":
            return [RequestCreateThrottle()]
        return []

    def get_serializer_class(self):
        return RequestSerializer if self.action == "create" else RequestAdminSerializer

    def get_queryset(self):
        qs = LocationRequest.objects.select_related("location", "shoot_type", "access_link__client")
        p = self.request.query_params
        if p.get("status"):
            qs = qs.filter(status=p["status"])
        if p.get("location"):
            qs = qs.filter(location_id=p["location"])
        q = (p.get("q") or "").strip()
        if q:
            qs = qs.filter(Q(name__icontains=q) | Q(phone__icontains=q) | Q(location__title__icontains=q))
        return qs.order_by("-created_at")

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        link = self.request.auth if isinstance(self.request.auth, AccessLink) else None
        serializer.save(user=user, access_link=link)

    @action(detail=False, methods=["get"])
    def counts(self, request):
        rows = LocationRequest.objects.values("status").annotate(n=Count("id"))
        return Response({r["status"]: r["n"] for r in rows})


# ---------------------------------------------------------------- ссылки-доступ для клиентов


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def check_access(request, token):
    """Клиент открыл ссылку /a/<token>: проверяем срок и отмечаем открытие."""
    link = find_link(token)
    if link is None:
        return Response(access_error("invalid"), status=status.HTTP_404_NOT_FOUND)
    if not link.is_active:
        return Response(access_error(link.state), status=status.HTTP_410_GONE)
    touch_link(link)
    return Response({
        "expires_at": link.expires_at,
        "client_name": link.client.name if link.client else None,
    })


class AccessLinkViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    """Ссылки-доступ: создаются и отправляются из RedCRM (только сотрудники)."""

    permission_classes = [IsStaff]
    serializer_class = AccessLinkSerializer
    pagination_class = CatalogPagination

    def get_queryset(self):
        qs = AccessLink.objects.select_related("client")
        if self.request.query_params.get("client"):
            qs = qs.filter(client_id=self.request.query_params["client"])
        return qs.order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"])
    def revoke(self, request, pk=None):
        link = self.get_object()
        if not link.revoked_at:
            link.revoked_at = timezone.now()
            link.save(update_fields=["revoked_at", "updated_at"])
        return Response(AccessLinkSerializer(link).data)

    @action(detail=False, methods=["post"])
    def send(self, request):
        """Создать ссылку для клиента RedCRM и отправить её в Telegram на указанный номер."""
        from core.models import Client
        from core.telegram_service import TelegramService
        from core.views import run_async_telegram

        client = get_object_or_404(Client, pk=request.data.get("client"))
        phone = TelegramService.normalize_phone(str(request.data.get("phone") or ""))
        if not TelegramService.validate_phone_number(phone):
            raise ValidationError({"phone": "Неверный формат номера. Ожидается +998XXXXXXXXX"})

        link = AccessLink.objects.create(client=client, phone=phone, created_by=request.user)
        url = access_link_url(link)
        try:
            result = run_async_telegram(TelegramService.send_message(phone, access_link_message(link, url)))
        except Exception as exc:
            result = {"ok": False, "error": str(exc)}
        link.send_status = AccessLink.SEND_OK if result.get("ok") else AccessLink.SEND_ERROR
        link.send_error = "" if result.get("ok") else str(result.get("error") or "Неизвестная ошибка")
        link.telegram_user_id = result.get("telegram_user_id")
        link.save(update_fields=["send_status", "send_error", "telegram_user_id", "updated_at"])

        data = AccessLinkSerializer(link).data
        if not result.get("ok"):
            # Ссылка всё равно создана — менеджер может скопировать её и отправить вручную
            return Response({**data, "detail": link.send_error}, status=status.HTTP_400_BAD_REQUEST)
        return Response(data, status=status.HTTP_201_CREATED)
