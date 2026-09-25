from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/redloc/', include('redloc.urls')),
    path('api/', include('core.urls')),
]

# Локальная раздача загруженных файлов REDLOC в режиме разработки (в проде — nginx или S3)
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
