# REDLOC — локации для фото и видео съёмок

Отдельный фронтенд (React 18 + Vite + Tailwind) поверх общего бэкенда RedCRM.
API живёт в Django-приложении `backend/redloc` под префиксом `/api/redloc/`,
пользователи и JWT — общие с RedCRM (вход по логину/паролю REDCRM).

## Запуск локально

```bash
# бэкенд
cd backend && venv/bin/python manage.py migrate && venv/bin/python manage.py runserver
# фронт (порт 5174)
cd redloc && npm install && npm run dev
```

`redloc/.env.development.local` → `VITE_API_URL=http://127.0.0.1:8000/api`.
В проде: `VITE_API_URL=https://api.redcrm.uz/api` (значение по умолчанию).

## Доступ

Каталог закрыт. Смотреть его могут:
- сотрудники RedCRM — после входа (логин/пароль REDCRM);
- клиенты — по временной ссылке `/a/<token>`, которую менеджер отправляет из RedCRM
  (карточка мероприятия → у телефона клиента кнопка «REDLOC»). Ссылка уходит в Telegram,
  срок считается с момента отправки, после истечения сайт закрывается сам.

Настройки в `backend/.env`:

```
REDLOC_FRONTEND_URL=https://redloc.uz   # домен, который попадает в ссылку
REDLOC_LINK_TTL_MINUTES=5               # для теста; 10 дней = 14400
```

Заявки «Связаться», пришедшие по ссылке, показывают клиента RedCRM.
Добавление/редактирование локаций, заявки, настройки справочников — только `is_staff`.

## Хранилище медиа (backend/.env)

Без `REDLOC_S3_BUCKET` файлы пишутся в `backend/media/` (нужен nginx `location /media/`).
Для S3 / Cloudflare R2 / Yandex Object Storage:

```
REDLOC_S3_BUCKET=redloc
REDLOC_S3_ACCESS_KEY=...
REDLOC_S3_SECRET_KEY=...
REDLOC_S3_ENDPOINT_URL=https://<account>.r2.cloudflarestorage.com   # для AWS не нужен
REDLOC_S3_REGION=auto
REDLOC_S3_CUSTOM_DOMAIN=cdn.redloc.uz      # публичный домен бакета
REDLOC_S3_ACL=                             # public-read для AWS, пусто для R2
```

Фото при загрузке поворачиваются по EXIF, ужимаются до 2000px и конвертируются в WebP
(+ превью 720px). Видео — файлом (≤ 500 МБ) или ссылкой YouTube.

## Деплой

- Фронт: отдельный проект Vercel с root directory `redloc/` (есть `vercel.json` для SPA).
- Бэкенд: `migrate` (создаст таблицы и справочники), в nginx поднять
  `client_max_body_size` (например, `600M`) для загрузки видео.
- Домен фронта должен быть в `CORS_ALLOWED_ORIGINS` (сейчас: `redloc.uz`, `www.redloc.uz`, `localhost:5174`).
