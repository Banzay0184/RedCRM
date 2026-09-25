from django.db import transaction
from rest_framework import serializers

from .models import (
    AccessLink, Amenity, Category, City, Favorite, Location, LocationPhoto, LocationRequest, LocationVideo, LocationZone,
    ShootType, Tag,
)


def file_url(request, field):
    """Абсолютный URL файла (для локального хранилища build_absolute_uri, для S3 URL уже полный)."""
    if not field:
        return None
    url = field.url
    if request is not None and url.startswith("/"):
        return request.build_absolute_uri(url)
    return url


class DictionarySerializer(serializers.ModelSerializer):
    locations_count = serializers.IntegerField(read_only=True, required=False)

    class Meta:
        fields = ["id", "name_ru", "name_uz", "slug", "icon", "order", "locations_count"]
        read_only_fields = ["slug"]


class CitySerializer(DictionarySerializer):
    class Meta(DictionarySerializer.Meta):
        model = City


class CategorySerializer(DictionarySerializer):
    class Meta(DictionarySerializer.Meta):
        model = Category


class ShootTypeSerializer(DictionarySerializer):
    class Meta(DictionarySerializer.Meta):
        model = ShootType


class AmenitySerializer(DictionarySerializer):
    class Meta(DictionarySerializer.Meta):
        model = Amenity


class TagSerializer(serializers.ModelSerializer):
    locations_count = serializers.IntegerField(read_only=True, required=False)

    class Meta:
        model = Tag
        fields = ["id", "name", "slug", "locations_count"]
        read_only_fields = ["slug"]


class PhotoSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()
    thumbnail = serializers.SerializerMethodField()
    location_slug = serializers.CharField(source="location.slug", read_only=True)
    location_title = serializers.CharField(source="location.title", read_only=True)

    class Meta:
        model = LocationPhoto
        fields = [
            "id", "location", "location_slug", "location_title", "image", "thumbnail", "width", "height",
            "caption", "zone", "order", "created_at",
        ]
        read_only_fields = ["location", "width", "height", "order"]

    def get_image(self, obj):
        return file_url(self.context.get("request"), obj.image)

    def get_thumbnail(self, obj):
        return file_url(self.context.get("request"), obj.thumbnail or obj.image)

    def validate_zone(self, zone):
        if zone and self.instance and zone.location_id != self.instance.location_id:
            raise serializers.ValidationError("Зона принадлежит другой локации")
        return zone


class VideoSerializer(serializers.ModelSerializer):
    file = serializers.FileField(write_only=True, required=False)
    poster = serializers.ImageField(write_only=True, required=False)
    file_url = serializers.SerializerMethodField()
    poster_url = serializers.SerializerMethodField()
    youtube_id = serializers.CharField(read_only=True)
    location_slug = serializers.CharField(source="location.slug", read_only=True)
    location_title = serializers.CharField(source="location.title", read_only=True)

    class Meta:
        model = LocationVideo
        fields = [
            "id", "location", "location_slug", "location_title", "title", "file", "file_url", "youtube_url",
            "youtube_id", "poster", "poster_url", "duration", "order", "created_at",
        ]
        read_only_fields = ["order"]

    def get_file_url(self, obj):
        return file_url(self.context.get("request"), obj.file)

    def get_poster_url(self, obj):
        if obj.poster:
            return file_url(self.context.get("request"), obj.poster)
        if obj.youtube_id:
            return f"https://i.ytimg.com/vi/{obj.youtube_id}/hqdefault.jpg"
        return None

    def validate_file(self, f):
        if f and not (f.content_type or "").startswith("video/"):
            raise serializers.ValidationError("Нужен видеофайл (mp4, mov, webm)")
        return f

    def validate(self, attrs):
        youtube_url = attrs.get("youtube_url", getattr(self.instance, "youtube_url", ""))
        has_file = attrs.get("file") or getattr(self.instance, "file", None)
        if not youtube_url and not has_file:
            raise serializers.ValidationError("Загрузите видеофайл или укажите ссылку на YouTube")
        if youtube_url and not LocationVideo(youtube_url=youtube_url).youtube_id:
            raise serializers.ValidationError({"youtube_url": "Не удалось распознать ссылку YouTube"})
        if self.instance and "location" in attrs and attrs["location"] != self.instance.location:
            raise serializers.ValidationError({"location": "Нельзя перенести видео в другую локацию"})
        return attrs


class ZoneSerializer(serializers.ModelSerializer):
    photos_count = serializers.IntegerField(read_only=True, required=False)

    class Meta:
        model = LocationZone
        fields = ["id", "location", "name", "description", "icon", "order", "photos_count"]


class CityShortSerializer(serializers.ModelSerializer):
    class Meta:
        model = City
        fields = ["id", "name_ru", "name_uz", "slug"]


class DictShortSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name_ru = serializers.CharField()
    name_uz = serializers.CharField()
    slug = serializers.CharField()
    icon = serializers.CharField()


class LocationListSerializer(serializers.ModelSerializer):
    city = CityShortSerializer(read_only=True)
    categories = DictShortSerializer(many=True, read_only=True)
    tags = serializers.SerializerMethodField()
    cover = serializers.SerializerMethodField()
    photos_count = serializers.IntegerField(read_only=True)
    videos_count = serializers.IntegerField(read_only=True)
    is_favorite = serializers.SerializerMethodField()

    class Meta:
        model = Location
        fields = [
            "id", "slug", "title", "city", "address_hint", "categories", "tags", "badge", "is_featured",
            "is_published", "cover", "photos_count", "videos_count", "views_count", "is_favorite", "created_at",
        ]

    def get_tags(self, obj):
        return [t.name for t in obj.tags.all()]

    def get_cover(self, obj):
        # cover_photos — prefetch только первого фото (см. LocationViewSet.get_queryset)
        photos = getattr(obj, "cover_photos", None)
        if photos is None:
            photos = list(obj.photos.order_by("order", "id")[:1])
        if not photos:
            return None
        return PhotoSerializer(photos[0], context=self.context).data

    def get_is_favorite(self, obj):
        fav_ids = self.context.get("favorite_ids")
        return obj.id in fav_ids if fav_ids is not None else False


class LocationDetailSerializer(LocationListSerializer):
    shoot_types = DictShortSerializer(many=True, read_only=True)
    amenities = DictShortSerializer(many=True, read_only=True)
    photos = PhotoSerializer(many=True, read_only=True)
    videos = VideoSerializer(many=True, read_only=True)
    zones = serializers.SerializerMethodField()

    class Meta(LocationListSerializer.Meta):
        fields = LocationListSerializer.Meta.fields + [
            "description_ru", "description_uz", "shoot_types", "amenities", "photos", "videos", "zones",
            "updated_at",
        ]

    def get_zones(self, obj):
        counts = {}
        for p in obj.photos.all():
            if p.zone_id:
                counts[p.zone_id] = counts.get(p.zone_id, 0) + 1
        data = ZoneSerializer(obj.zones.all(), many=True).data
        for z in data:
            z["photos_count"] = counts.get(z["id"], 0)
        return data


class LocationWriteSerializer(serializers.ModelSerializer):
    """Создание/редактирование локации. Теги приходят списком строк и создаются на лету."""

    tags = serializers.ListField(child=serializers.CharField(max_length=50), required=False, write_only=True)
    categories = serializers.PrimaryKeyRelatedField(queryset=Category.objects.all(), many=True, required=False)
    shoot_types = serializers.PrimaryKeyRelatedField(queryset=ShootType.objects.all(), many=True, required=False)
    amenities = serializers.PrimaryKeyRelatedField(queryset=Amenity.objects.all(), many=True, required=False)

    class Meta:
        model = Location
        fields = [
            "id", "slug", "title", "city", "address_hint", "description_ru", "description_uz", "categories",
            "tags", "shoot_types", "amenities", "badge", "is_featured", "is_published",
        ]
        read_only_fields = ["slug"]

    def validate(self, attrs):
        creating_without = not self.instance and not attrs.get("categories")
        clearing = "categories" in attrs and not attrs["categories"]
        if creating_without or clearing:
            raise serializers.ValidationError({"categories": "Выберите хотя бы одну категорию"})
        return attrs

    @staticmethod
    def _tags(names):
        result = []
        seen = set()
        for raw in names:
            name = " ".join(raw.strip().lstrip("#").split())
            if not name or name.lower() in seen:
                continue
            seen.add(name.lower())
            tag = Tag.objects.filter(name__iexact=name).first() or Tag.objects.create(name=name)
            result.append(tag)
        return result

    @transaction.atomic
    def create(self, validated_data):
        m2m = {k: validated_data.pop(k) for k in ("categories", "shoot_types", "amenities") if k in validated_data}
        tags = validated_data.pop("tags", None)
        location = Location.objects.create(**validated_data)
        for key, value in m2m.items():
            getattr(location, key).set(value)
        if tags is not None:
            location.tags.set(self._tags(tags))
        return location

    @transaction.atomic
    def update(self, instance, validated_data):
        m2m = {k: validated_data.pop(k) for k in ("categories", "shoot_types", "amenities") if k in validated_data}
        tags = validated_data.pop("tags", None)
        for key, value in validated_data.items():
            setattr(instance, key, value)
        instance.save()
        for key, value in m2m.items():
            getattr(instance, key).set(value)
        if tags is not None:
            instance.tags.set(self._tags(tags))
        return instance

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["tags"] = [t.name for t in instance.tags.all()]
        return data


class FavoriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Favorite
        fields = ["id", "location", "created_at"]


class RequestSerializer(serializers.ModelSerializer):
    location_title = serializers.CharField(source="location.title", read_only=True, default=None)
    location_slug = serializers.CharField(source="location.slug", read_only=True, default=None)
    shoot_type_name = serializers.CharField(source="shoot_type.name_ru", read_only=True, default=None)
    phone = serializers.RegexField(r"^\+?\d[\d\s\-()]{7,18}$", error_messages={"invalid": "Некорректный номер телефона"})

    class Meta:
        model = LocationRequest
        fields = [
            "id", "location", "location_title", "location_slug", "name", "phone", "shoot_type", "shoot_type_name",
            "shooting_date", "message", "status", "admin_note", "created_at", "updated_at",
        ]
        read_only_fields = ["status", "admin_note"]


class RequestAdminSerializer(RequestSerializer):
    # Клиент RedCRM, которому отправляли ссылку (если заявка пришла по ней)
    crm_client_id = serializers.IntegerField(source="access_link.client_id", read_only=True, default=None)
    crm_client_name = serializers.CharField(source="access_link.client.name", read_only=True, default=None)

    class Meta(RequestSerializer.Meta):
        fields = RequestSerializer.Meta.fields + ["crm_client_id", "crm_client_name"]
        read_only_fields = ["crm_client_id", "crm_client_name"]


class AccessLinkSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()
    state = serializers.CharField(read_only=True)
    client_name = serializers.CharField(source="client.name", read_only=True, default=None)

    class Meta:
        model = AccessLink
        fields = [
            "id", "token", "url", "state", "client", "client_name", "phone", "expires_at", "revoked_at",
            "first_opened_at", "last_opened_at", "open_count", "send_status", "send_error", "created_at",
        ]
        read_only_fields = [f for f in fields if f not in ("client", "phone")]

    def get_url(self, obj):
        return access_link_url(obj)


def access_link_url(link):
    from django.conf import settings

    return f"{settings.REDLOC_FRONTEND_URL.rstrip('/')}/a/{link.token}"
