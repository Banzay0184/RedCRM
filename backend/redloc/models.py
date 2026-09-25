import re
import secrets
import uuid
from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.text import slugify

from .storage import redloc_storage


# Транслитерация кириллицы (рус + узб) для slug'ов: slugify() сам кириллицу выкидывает.
_TRANSLIT = {
    "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "yo", "ж": "j", "з": "z",
    "и": "i", "й": "y", "к": "k", "л": "l", "м": "m", "н": "n", "о": "o", "п": "p", "р": "r",
    "с": "s", "т": "t", "у": "u", "ф": "f", "х": "x", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "sh",
    "ъ": "", "ы": "i", "ь": "", "э": "e", "ю": "yu", "я": "ya",
    "ў": "o", "қ": "q", "ғ": "g", "ҳ": "h",
}


def make_slug(text, model, instance_pk=None, max_length=80):
    """Уникальный slug из произвольного (в т.ч. кириллического) текста."""
    text = "".join(_TRANSLIT.get(ch, ch) for ch in (text or "").lower())
    text = re.sub(r"[ʻʼ'`’]", "", text)
    base = slugify(text)[:max_length].strip("-") or uuid.uuid4().hex[:8]
    slug, n = base, 2
    qs = model.objects.all()
    if instance_pk:
        qs = qs.exclude(pk=instance_pk)
    while qs.filter(slug=slug).exists():
        slug = f"{base[: max_length - 5]}-{n}"
        n += 1
    return slug


class BaseModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Dictionary(BaseModel):
    """Двуязычный справочник (города, категории, типы съёмки, удобства)."""

    name_ru = models.CharField(max_length=100)
    name_uz = models.CharField(max_length=100, blank=True)
    slug = models.SlugField(max_length=100, unique=True, blank=True)
    # Ключ иконки из фиксированного набора на фронте (например "sofa", "camera")
    icon = models.CharField(max_length=40, blank=True)
    order = models.PositiveIntegerField(default=0, db_index=True)

    class Meta:
        abstract = True
        ordering = ["order", "id"]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = make_slug(self.name_ru, type(self), self.pk)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name_ru


class City(Dictionary):
    class Meta(Dictionary.Meta):
        verbose_name = "Город"
        verbose_name_plural = "Города"


class Category(Dictionary):
    class Meta(Dictionary.Meta):
        verbose_name = "Категория"
        verbose_name_plural = "Категории"


class ShootType(Dictionary):
    """Для чего подходит локация: фотосессия, клип, свадьба, реклама..."""

    class Meta(Dictionary.Meta):
        verbose_name = "Тип съёмки"
        verbose_name_plural = "Типы съёмки"


class Amenity(Dictionary):
    """Удобства: парковка, Wi-Fi, кондиционер, гримёрка..."""

    class Meta(Dictionary.Meta):
        verbose_name = "Удобство"
        verbose_name_plural = "Удобства"


class Tag(BaseModel):
    name = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(max_length=60, unique=True, blank=True)

    class Meta:
        ordering = ["name"]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = make_slug(self.name, Tag, self.pk, max_length=55)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Location(BaseModel):
    BADGE_NONE = ""
    BADGE_PREMIUM = "premium"
    BADGE_HIT = "hit"
    BADGE_NEW = "new"
    BADGE_CHOICES = [
        (BADGE_NONE, "—"),
        (BADGE_PREMIUM, "Премиум"),
        (BADGE_HIT, "Хит"),
        (BADGE_NEW, "Новинка"),
    ]

    title = models.CharField(max_length=150, db_index=True)
    slug = models.SlugField(max_length=90, unique=True, blank=True)
    city = models.ForeignKey(City, on_delete=models.PROTECT, related_name="locations", null=True, blank=True)
    # Без карты и координат — только текстовая подсказка («Мирабадский район», «Старый город»)
    address_hint = models.CharField(max_length=200, blank=True)
    description_ru = models.TextField(blank=True)
    description_uz = models.TextField(blank=True)
    categories = models.ManyToManyField(Category, related_name="locations", blank=True)
    tags = models.ManyToManyField(Tag, related_name="locations", blank=True)
    shoot_types = models.ManyToManyField(ShootType, related_name="locations", blank=True)
    amenities = models.ManyToManyField(Amenity, related_name="locations", blank=True)
    badge = models.CharField(max_length=10, choices=BADGE_CHOICES, blank=True, default=BADGE_NONE)
    is_featured = models.BooleanField("Популярная", default=False, db_index=True)
    is_published = models.BooleanField(default=True, db_index=True)
    views_count = models.PositiveIntegerField(default=0)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Локация"
        verbose_name_plural = "Локации"
        indexes = [models.Index(fields=["is_published", "-created_at"])]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = make_slug(self.title, Location, self.pk)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title


class LocationZone(BaseModel):
    """Зона/кадр внутри локации: «Диван», «Окно в пол», «Кирпичная стена», «Зеркало»."""

    location = models.ForeignKey(Location, on_delete=models.CASCADE, related_name="zones")
    name = models.CharField(max_length=100)
    description = models.CharField(max_length=300, blank=True)
    icon = models.CharField(max_length=40, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return f"{self.location} — {self.name}"


def _photo_path(instance, filename):
    return f"locations/{instance.location_id}/photos/{uuid.uuid4().hex}.webp"


def _thumb_path(instance, filename):
    return f"locations/{instance.location_id}/thumbs/{uuid.uuid4().hex}.webp"


def _video_path(instance, filename):
    ext = (filename.rsplit(".", 1)[-1] if "." in filename else "mp4").lower()[:5]
    return f"locations/{instance.location_id}/videos/{uuid.uuid4().hex}.{ext}"


def _poster_path(instance, filename):
    return f"locations/{instance.location_id}/posters/{uuid.uuid4().hex}.webp"


class LocationPhoto(BaseModel):
    """Фото локации. Первое по order — обложка."""

    location = models.ForeignKey(Location, on_delete=models.CASCADE, related_name="photos")
    image = models.ImageField(upload_to=_photo_path, storage=redloc_storage, width_field="width", height_field="height")
    thumbnail = models.ImageField(upload_to=_thumb_path, storage=redloc_storage, blank=True)
    width = models.PositiveIntegerField(null=True, blank=True)
    height = models.PositiveIntegerField(null=True, blank=True)
    caption = models.CharField(max_length=200, blank=True)
    zone = models.ForeignKey(LocationZone, on_delete=models.SET_NULL, null=True, blank=True, related_name="photos")
    order = models.PositiveIntegerField(default=0, db_index=True)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return f"Фото #{self.pk} ({self.location})"


class LocationVideo(BaseModel):
    """Видео локации: либо загруженный файл, либо ссылка на YouTube."""

    location = models.ForeignKey(Location, on_delete=models.CASCADE, related_name="videos")
    title = models.CharField(max_length=150, blank=True)
    file = models.FileField(upload_to=_video_path, storage=redloc_storage, blank=True)
    youtube_url = models.URLField(blank=True)
    poster = models.ImageField(upload_to=_poster_path, storage=redloc_storage, blank=True)
    duration = models.PositiveIntegerField("Длительность, сек", null=True, blank=True)
    order = models.PositiveIntegerField(default=0, db_index=True)

    class Meta:
        ordering = ["order", "id"]

    @property
    def youtube_id(self):
        if not self.youtube_url:
            return None
        m = re.search(r"(?:v=|youtu\.be/|shorts/|embed/|live/)([A-Za-z0-9_-]{11})", self.youtube_url)
        return m.group(1) if m else None

    def __str__(self):
        return self.title or f"Видео #{self.pk}"


class Favorite(BaseModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="redloc_favorites")
    location = models.ForeignKey(Location, on_delete=models.CASCADE, related_name="favorites")

    class Meta:
        ordering = ["-created_at"]
        constraints = [models.UniqueConstraint(fields=["user", "location"], name="redloc_unique_favorite")]


def _access_token():
    return secrets.token_urlsafe(24)


def access_link_ttl():
    return timedelta(minutes=getattr(settings, "REDLOC_LINK_TTL_MINUTES", 60 * 24 * 10))


class AccessLink(BaseModel):
    """Временная ссылка-доступ к каталогу, которую менеджер отправляет клиенту в Telegram.

    Каталог закрыт: без входа сотрудника смотреть его можно только по действующей ссылке.
    Срок считается с момента создания (отправки) ссылки.
    """

    token = models.CharField(max_length=64, unique=True, default=_access_token, editable=False)
    client = models.ForeignKey(
        "core.Client", on_delete=models.SET_NULL, null=True, blank=True, related_name="redloc_links"
    )
    phone = models.CharField(max_length=20, blank=True)
    expires_at = models.DateTimeField(db_index=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    # Статистика открытий
    first_opened_at = models.DateTimeField(null=True, blank=True)
    last_opened_at = models.DateTimeField(null=True, blank=True)
    open_count = models.PositiveIntegerField(default=0)
    # Результат отправки в Telegram
    SEND_NONE, SEND_OK, SEND_ERROR = "", "success", "error"
    send_status = models.CharField(
        max_length=10, blank=True, choices=[(SEND_NONE, "—"), (SEND_OK, "Отправлено"), (SEND_ERROR, "Ошибка")]
    )
    send_error = models.TextField(blank=True)
    telegram_user_id = models.BigIntegerField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Ссылка-доступ"
        verbose_name_plural = "Ссылки-доступ"

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + access_link_ttl()
        super().save(*args, **kwargs)

    @property
    def state(self):
        if self.revoked_at:
            return "revoked"
        if timezone.now() >= self.expires_at:
            return "expired"
        return "active"

    @property
    def is_active(self):
        return self.state == "active"

    def __str__(self):
        return f"{self.client or self.phone or 'ссылка'} до {self.expires_at:%d.%m.%Y %H:%M}"


class LocationRequest(BaseModel):
    """Заявка на съёмку с публичной страницы локации («Связаться»)."""

    STATUS_NEW = "new"
    STATUS_IN_PROGRESS = "in_progress"
    STATUS_DONE = "done"
    STATUS_REJECTED = "rejected"
    STATUS_CHOICES = [
        (STATUS_NEW, "Новая"),
        (STATUS_IN_PROGRESS, "В работе"),
        (STATUS_DONE, "Завершена"),
        (STATUS_REJECTED, "Отклонена"),
    ]

    location = models.ForeignKey(Location, on_delete=models.SET_NULL, null=True, blank=True, related_name="requests")
    name = models.CharField(max_length=120)
    phone = models.CharField(max_length=20)
    shoot_type = models.ForeignKey(ShootType, on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    shooting_date = models.DateField(null=True, blank=True)
    message = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_NEW, db_index=True)
    admin_note = models.TextField(blank=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    # Через какую ссылку пришёл клиент — связывает заявку с клиентом RedCRM
    access_link = models.ForeignKey(
        AccessLink, on_delete=models.SET_NULL, null=True, blank=True, related_name="requests"
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} — {self.location or 'без локации'}"
