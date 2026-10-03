from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("locations", views.LocationViewSet, basename="redloc-location")
router.register("photos", views.PhotoViewSet, basename="redloc-photo")
router.register("videos", views.VideoViewSet, basename="redloc-video")
router.register("cities", views.CityViewSet, basename="redloc-city")
router.register("shoot-types", views.ShootTypeViewSet, basename="redloc-shoot-type")
router.register("amenities", views.AmenityViewSet, basename="redloc-amenity")
router.register("tags", views.TagViewSet, basename="redloc-tag")
router.register("portfolios", views.PortfolioViewSet, basename="redloc-portfolio")
router.register("portfolio-photos", views.PortfolioPhotoViewSet, basename="redloc-portfolio-photo")
router.register("portfolio-videos", views.PortfolioVideoViewSet, basename="redloc-portfolio-video")
router.register("access-links", views.AccessLinkViewSet, basename="redloc-access-link")

urlpatterns = [
    path("meta/", views.meta, name="redloc-meta"),
    path("site/", views.site_settings, name="redloc-site-settings"),
    path("access/<str:token>/", views.check_access, name="redloc-access-check"),
    path("me/", views.me, name="redloc-me"),
    path("", include(router.urls)),
]
