"""Обработка загружаемых изображений: поворот по EXIF, ресайз, конвертация в WebP."""

from io import BytesIO

from django.core.files.base import ContentFile
from PIL import Image, ImageOps

FULL_MAX_SIDE = 2000
THUMB_MAX_SIDE = 720
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP", "HEIF", "MPO"}


class InvalidImage(ValueError):
    pass


def _open(uploaded):
    try:
        img = Image.open(uploaded)
        img_format = img.format
        img.load()
    except Exception as exc:
        raise InvalidImage("Файл не является изображением") from exc
    if img_format not in ALLOWED_FORMATS:
        raise InvalidImage(f"Неподдерживаемый формат: {img_format}")
    img = ImageOps.exif_transpose(img)
    if img.mode not in ("RGB", "RGBA"):
        img = img.convert("RGB")
    return img


def _to_webp(img, max_side, quality):
    img = img.copy()
    img.thumbnail((max_side, max_side), Image.LANCZOS)
    buf = BytesIO()
    img.save(buf, "WEBP", quality=quality, method=4)
    return ContentFile(buf.getvalue(), name="image.webp")


def process_photo(uploaded):
    """Возвращает (полноразмерное, превью) как ContentFile в WebP."""
    img = _open(uploaded)
    return _to_webp(img, FULL_MAX_SIDE, 85), _to_webp(img, THUMB_MAX_SIDE, 78)


def process_poster(uploaded):
    return _to_webp(_open(uploaded), 1280, 80)
