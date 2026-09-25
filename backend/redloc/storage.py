"""Хранилище медиафайлов REDLOC.

Если в окружении задан REDLOC_S3_BUCKET — фото/видео уходят в S3-совместимое
хранилище (AWS S3, Cloudflare R2, Yandex Object Storage и т.п.).
Иначе используется обычное локальное хранилище (MEDIA_ROOT) — удобно для разработки.

Функция передаётся в поля моделей как callable (storage=redloc_storage), поэтому
в миграциях не фиксируются ключи/бакет и хранилище можно переключать через .env.
"""

import os
from functools import lru_cache

from django.core.files.storage import default_storage


@lru_cache(maxsize=1)
def _build_storage():
    bucket = os.getenv("REDLOC_S3_BUCKET")
    if not bucket:
        return default_storage

    from storages.backends.s3 import S3Storage

    return S3Storage(
        bucket_name=bucket,
        access_key=os.getenv("REDLOC_S3_ACCESS_KEY"),
        secret_key=os.getenv("REDLOC_S3_SECRET_KEY"),
        endpoint_url=os.getenv("REDLOC_S3_ENDPOINT_URL") or None,
        region_name=os.getenv("REDLOC_S3_REGION") or None,
        # Публичный домен/CDN бакета, например "cdn.redloc.uz" или "<id>.r2.dev"
        custom_domain=os.getenv("REDLOC_S3_CUSTOM_DOMAIN") or None,
        # Для R2 ACL не поддерживаются — оставляем пустым и делаем бакет публичным
        default_acl=os.getenv("REDLOC_S3_ACL") or None,
        querystring_auth=os.getenv("REDLOC_S3_SIGNED_URLS", "False") == "True",
        file_overwrite=False,
        object_parameters={"CacheControl": "public, max-age=31536000, immutable"},
        location=os.getenv("REDLOC_S3_PREFIX", "redloc"),
    )


def redloc_storage():
    return _build_storage()
