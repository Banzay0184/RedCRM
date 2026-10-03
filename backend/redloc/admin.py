from django.contrib import admin

from .models import (
    AccessLink, Amenity, City, Location, LocationPhoto, LocationVideo, LocationZone,
    Portfolio, PortfolioPhoto, PortfolioVideo, ShootType, Tag,
)
from .images import process_photo


@admin.register(City, ShootType, Amenity)
class DictionaryAdmin(admin.ModelAdmin):
    list_display = ["name_ru", "name_uz", "slug", "icon", "order"]
    list_editable = ["order"]
    search_fields = ["name_ru", "name_uz"]


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ["name", "slug"]
    search_fields = ["name"]


class PhotoInline(admin.TabularInline):
    model = LocationPhoto
    extra = 0
    fields = ["image", "caption", "zone", "order"]


class VideoInline(admin.TabularInline):
    model = LocationVideo
    extra = 0
    fields = ["title", "file", "youtube_url", "duration", "order"]


class ZoneInline(admin.TabularInline):
    model = LocationZone
    extra = 0


@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    list_display = ["title", "city", "badge", "is_featured", "is_published", "views_count", "created_at"]
    list_filter = ["is_published", "badge", "city"]
    search_fields = ["title", "description_ru", "description_uz"]
    filter_horizontal = ["tags", "shoot_types", "amenities"]
    inlines = [ZoneInline, PhotoInline, VideoInline]


@admin.register(AccessLink)
class AccessLinkAdmin(admin.ModelAdmin):
    list_display = ["client", "phone", "expires_at", "revoked_at", "open_count", "send_status", "created_at"]
    list_filter = ["send_status"]
    search_fields = ["phone", "client__name", "token"]
    readonly_fields = ["token", "first_opened_at", "last_opened_at", "open_count", "telegram_user_id"]


class PortfolioPhotoInline(admin.TabularInline):
    model = PortfolioPhoto
    extra = 3
    fields = ["image", "order"]


class PortfolioVideoInline(admin.TabularInline):
    model = PortfolioVideo
    extra = 0
    fields = ["title", "file", "youtube_url", "poster", "duration", "order"]


@admin.register(Portfolio)
class PortfolioAdmin(admin.ModelAdmin):
    list_display = ["title", "kind", "location", "shot_at", "is_published", "order"]
    list_filter = ["kind", "is_published"]
    list_editable = ["order", "is_published"]
    search_fields = ["title"]
    autocomplete_fields = ["location"]
    inlines = [PortfolioPhotoInline, PortfolioVideoInline]

    def save_formset(self, request, form, formset, change):
        # Фото из админки прогоняем через ту же обработку, что и загрузку в каталоге (WebP + превью)
        for obj in formset.save(commit=False):
            if isinstance(obj, PortfolioPhoto) and obj.image and not obj.image._committed:
                full, thumb = process_photo(obj.image)
                obj.image.save("image.webp", full, save=False)
                obj.thumbnail.save("thumb.webp", thumb, save=False)
            obj.save()
        for obj in formset.deleted_objects:
            obj.delete()
        formset.save_m2m()
