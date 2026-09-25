from django.contrib import admin

from .models import (
    AccessLink, Amenity, Category, City, Favorite, Location, LocationPhoto, LocationRequest, LocationVideo, LocationZone,
    ShootType, Tag,
)


@admin.register(City, Category, ShootType, Amenity)
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
    list_filter = ["is_published", "is_featured", "badge", "city", "categories"]
    search_fields = ["title", "description_ru", "description_uz"]
    filter_horizontal = ["categories", "tags", "shoot_types", "amenities"]
    inlines = [ZoneInline, PhotoInline, VideoInline]


@admin.register(LocationRequest)
class LocationRequestAdmin(admin.ModelAdmin):
    list_display = ["name", "phone", "location", "shooting_date", "status", "created_at"]
    list_filter = ["status"]
    search_fields = ["name", "phone"]


admin.site.register(Favorite)


@admin.register(AccessLink)
class AccessLinkAdmin(admin.ModelAdmin):
    list_display = ["client", "phone", "expires_at", "revoked_at", "open_count", "send_status", "created_at"]
    list_filter = ["send_status"]
    search_fields = ["phone", "client__name", "token"]
    readonly_fields = ["token", "first_opened_at", "last_opened_at", "open_count", "telegram_user_id"]
