from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("locations", views.LocationViewSet, basename="redloc-location")
router.register("photos", views.PhotoViewSet, basename="redloc-photo")
router.register("videos", views.VideoViewSet, basename="redloc-video")
router.register("zones", views.ZoneViewSet, basename="redloc-zone")
router.register("cities", views.CityViewSet, basename="redloc-city")
router.register("categories", views.CategoryViewSet, basename="redloc-category")
router.register("shoot-types", views.ShootTypeViewSet, basename="redloc-shoot-type")
router.register("amenities", views.AmenityViewSet, basename="redloc-amenity")
router.register("tags", views.TagViewSet, basename="redloc-tag")
router.register("requests", views.RequestViewSet, basename="redloc-request")
router.register("access-links", views.AccessLinkViewSet, basename="redloc-access-link")

urlpatterns = [
    path("meta/", views.meta, name="redloc-meta"),
    path("access/<str:token>/", views.check_access, name="redloc-access-check"),
    path("me/", views.me, name="redloc-me"),
    path("favorites/ids/", views.favorite_ids, name="redloc-favorite-ids"),
    path("favorites/sync/", views.sync_favorites, name="redloc-favorite-sync"),
    path("", include(router.urls)),
]
