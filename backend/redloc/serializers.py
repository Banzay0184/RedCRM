from django.db import transaction
from rest_framework import serializers

from .models import (
    AccessLink, Amenity, Category, City, Location, LocationPhoto, LocationVideo,
    Portfolio, PortfolioPhoto, PortfolioVideo, ShootType, SiteSettings, Tag,
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
            "caption", "order", "created_at",
        ]
        read_only_fields = ["location", "width", "height", "order"]

    def get_image(self, obj):
        return file_url(self.context.get("request"), obj.image)

    def get_thumbnail(self, obj):
        return file_url(self.context.get("request"), obj.thumbnail or obj.image)


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

    class Meta:
        model = Location
        fields = [
            "id", "slug", "title", "city", "address_hint", "categories", "tags", "badge", "is_featured",
            "is_published", "cover", "photos_count", "videos_count", "views_count", "created_at",
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


class LocationDetailSerializer(LocationListSerializer):
    shoot_types = DictShortSerializer(many=True, read_only=True)
    amenities = DictShortSerializer(many=True, read_only=True)
    photos = PhotoSerializer(many=True, read_only=True)
    videos = VideoSerializer(many=True, read_only=True)

    class Meta(LocationListSerializer.Meta):
        fields = LocationListSerializer.Meta.fields + [
            "description_ru", "description_uz", "shoot_types", "amenities", "photos", "videos",
            "updated_at",
        ]


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


# ---------------------------------------------------------------- портфолио (готовые съёмки)


class PortfolioPhotoSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()
    thumbnail = serializers.SerializerMethodField()

    class Meta:
        model = PortfolioPhoto
        fields = ["id", "image", "thumbnail", "width", "height", "order"]

    def get_image(self, obj):
        return file_url(self.context.get("request"), obj.image)

    def get_thumbnail(self, obj):
        return file_url(self.context.get("request"), obj.thumbnail or obj.image)


class PortfolioVideoSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    poster_url = serializers.SerializerMethodField()
    youtube_id = serializers.CharField(read_only=True)

    class Meta:
        model = PortfolioVideo
        fields = ["id", "title", "file_url", "youtube_url", "youtube_id", "poster_url", "duration", "order"]

    def get_file_url(self, obj):
        return file_url(self.context.get("request"), obj.file)

    def get_poster_url(self, obj):
        if obj.poster:
            return file_url(self.context.get("request"), obj.poster)
        if obj.youtube_id:
            return f"https://i.ytimg.com/vi/{obj.youtube_id}/hqdefault.jpg"
        return None


class PortfolioLocationSerializer(serializers.ModelSerializer):
    city = CityShortSerializer(read_only=True)

    class Meta:
        model = Location
        fields = ["id", "slug", "title", "city"]


class PortfolioListSerializer(serializers.ModelSerializer):
    location = PortfolioLocationSerializer(read_only=True)
    cover = serializers.SerializerMethodField()
    photos_count = serializers.IntegerField(read_only=True)
    videos_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Portfolio
        fields = [
            "id", "slug", "kind", "title", "location", "shot_at", "is_published", "cover", "photos_count", "videos_count",
        ]

    def get_cover(self, obj):
        photos = getattr(obj, "cover_photos", None)
        if photos is None:
            photos = list(obj.photos.order_by("order", "id")[:1])
        return PortfolioPhotoSerializer(photos[0], context=self.context).data if photos else None


class PortfolioDetailSerializer(PortfolioListSerializer):
    photos = PortfolioPhotoSerializer(many=True, read_only=True)
    videos = PortfolioVideoSerializer(many=True, read_only=True)

    class Meta(PortfolioListSerializer.Meta):
        fields = PortfolioListSerializer.Meta.fields + ["description_ru", "description_uz", "photos", "videos"]


class PortfolioWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Portfolio
        fields = ["id", "slug", "kind", "title", "location", "shot_at", "description_ru", "description_uz", "is_published"]
        read_only_fields = ["slug"]

    def update(self, instance, validated_data):
        # slug пересобираем при смене названия
        if "title" in validated_data and validated_data["title"] != instance.title:
            instance.slug = ""
        return super().update(instance, validated_data)


class PortfolioVideoWriteSerializer(serializers.ModelSerializer):
    file = serializers.FileField(write_only=True, required=False)
    poster = serializers.ImageField(write_only=True, required=False)

    class Meta:
        model = PortfolioVideo
        fields = ["id", "portfolio", "title", "file", "youtube_url", "poster", "duration"]

    def validate_file(self, f):
        if f and not (f.content_type or "").startswith("video/"):
            raise serializers.ValidationError("Нужен видеофайл (mp4, mov, webm)")
        return f

    def validate(self, attrs):
        if not attrs.get("file") and not attrs.get("youtube_url"):
            raise serializers.ValidationError("Загрузите файл или вставьте ссылку YouTube")
        return attrs


class SiteSettingsSerializer(serializers.ModelSerializer):
    hero_image = serializers.ImageField(write_only=True, required=False)
    hero_image_url = serializers.SerializerMethodField()

    class Meta:
        model = SiteSettings
        fields = [
            "hero_title_ru", "hero_title_uz", "hero_subtitle_ru", "hero_subtitle_uz", "hero_image", "hero_image_url",
        ]

    def get_hero_image_url(self, obj):
        return file_url(self.context.get("request"), obj.hero_image)
