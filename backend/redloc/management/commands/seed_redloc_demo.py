"""Демо-наполнение REDLOC: локации с реальными фото (Openverse: Flickr/Wikimedia) и видео (Mixkit).

Все демо-локации получают тег `demo-seed`.
    python manage.py seed_redloc_demo            # создать (уже созданные по title пропускаются)
    python manage.py seed_redloc_demo --delete   # удалить всё демо вместе с файлами
Медиа в манифесте — прямые URL; для видео нужен ffmpeg (кадр-постер и длительность).
"""

import json
import random
import subprocess
import tempfile
from datetime import timedelta
from pathlib import Path

import requests
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.db.models import Count
from django.utils import timezone

from redloc.images import process_photo, process_poster
from redloc.models import (
    Amenity, Category, City, Location, LocationPhoto, LocationVideo, Portfolio,
    PortfolioPhoto, PortfolioVideo, ShootType, Tag,
)

DEMO_TAG = "demo-seed"
MANIFEST = Path(__file__).resolve().parents[2] / "fixtures" / "demo_manifest.json"


class Command(BaseCommand):
    help = "Заполнить REDLOC демо-локациями с фото/видео Pexels (или удалить их: --delete)"

    def add_arguments(self, parser):
        parser.add_argument("--delete", action="store_true", help="Удалить все демо-данные")
        parser.add_argument("--only", nargs="*", help="Создать только локации с этими title")
        parser.add_argument("--add-videos", action="store_true", help="Дозалить видео в уже созданные демо-локации")

    def handle(self, *args, **opts):
        if opts["delete"]:
            return self.delete()
        self.http = requests.Session()
        self.http.headers["User-Agent"] = "Mozilla/5.0 (redloc demo seed)"
        data = json.loads(MANIFEST.read_text(encoding="utf-8"))
        demo_tag, _ = Tag.objects.get_or_create(name=DEMO_TAG)
        rnd = random.Random(42)
        if opts["add_videos"]:
            self.add_missing_videos(data, demo_tag)
        created = []
        for i, item in enumerate(data["locations"]):
            if opts["only"] and item["title"] not in opts["only"]:
                continue
            if Location.objects.filter(title=item["title"], tags=demo_tag).exists():
                continue
            loc = self.create_location(item, demo_tag)
            # Разнести даты создания на ~3 месяца назад
            days = rnd.randint(1, 95)
            Location.objects.filter(pk=loc.pk).update(
                created_at=timezone.now() - timedelta(days=days, hours=rnd.randint(0, 23)),
                views_count=item.get("views") or rnd.randint(50, 3000),
            )
            created.append(loc)
            self.stdout.write(self.style.SUCCESS(f"+ {loc.title}: {loc.photos.count()} фото, {loc.videos.count()} видео"))
        if not opts["only"]:
            self.create_portfolios(data.get("portfolios", []))
        self.stdout.write(self.style.SUCCESS(f"Готово: создано локаций {len(created)}"))

    # --- создание ---

    def create_location(self, item, demo_tag):
        loc = Location.objects.create(
            title=item["title"],
            city=City.objects.get(slug=item["city"]),
            address_hint=item.get("address_hint", ""),
            description_ru=item.get("description_ru", ""),
            description_uz=item.get("description_uz", ""),
            badge=item.get("badge", ""),
            is_featured=item.get("featured", False),
        )
        loc.categories.set(Category.objects.filter(slug__in=item.get("categories", [])))
        loc.shoot_types.set(ShootType.objects.filter(slug__in=item.get("shoot_types", [])))
        loc.amenities.set(Amenity.objects.filter(slug__in=item.get("amenities", [])))
        tags = [demo_tag] + [Tag.objects.get_or_create(name=t)[0] for t in item.get("tags", [])]
        loc.tags.set(tags)
        for n, photo_id in enumerate(item.get("photos", [])):
            self.add_photo(loc, photo_id, n)
        for n, video in enumerate(item.get("videos", [])):
            self.add_video(loc, video, n)
        return loc

    def download(self, url):
        r = self.http.get(url, timeout=180)
        r.raise_for_status()
        return r.content

    def add_photo(self, loc, url, order):
        full, thumb = process_photo(ContentFile(self.download(url)))
        photo = LocationPhoto(location=loc, order=order)
        photo.image.save("image.webp", full, save=False)
        photo.thumbnail.save("thumb.webp", thumb, save=False)
        photo.save()

    def add_missing_videos(self, data, demo_tag):
        for item in data["locations"]:
            loc = Location.objects.filter(title=item["title"], tags=demo_tag).first()
            if loc and not loc.videos.exists():
                for n, video in enumerate(item.get("videos", [])):
                    self.add_video(loc, video, n)
                self.stdout.write(f"+ видео: {loc.title} ({loc.videos.count()})")

    def create_portfolios(self, rows):
        for n, row in enumerate(rows):
            if Portfolio.objects.filter(title=row["title"]).exists():
                continue
            pf = Portfolio.objects.create(
                kind=row["kind"], title=row["title"], order=n, shot_at=row.get("shot_at"),
                description_ru=row.get("description_ru", ""), description_uz=row.get("description_uz", ""),
                location=Location.objects.filter(title=row.get("location"), tags__name=DEMO_TAG).first(),
            )
            for i, url in enumerate(row.get("photos", [])):
                full, thumb = process_photo(ContentFile(self.download(url)))
                photo = PortfolioPhoto(portfolio=pf, order=i)
                photo.image.save("image.webp", full, save=False)
                photo.thumbnail.save("thumb.webp", thumb, save=False)
                photo.save()
            for i, video in enumerate(row.get("videos", [])):
                self.add_video(pf, video, i, model=PortfolioVideo, fk="portfolio")
            self.stdout.write(self.style.SUCCESS(f"+ {pf.get_kind_display()}: {pf.title} ({pf.photos.count()} фото)"))

    def add_video(self, loc, video, order, model=LocationVideo, fk="location"):
        raw = self.download(video["url"])
        with tempfile.NamedTemporaryFile(suffix=".mp4") as tmp:
            tmp.write(raw)
            tmp.flush()
            duration = subprocess.run(
                ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", tmp.name],
                capture_output=True, text=True, check=True,
            ).stdout.strip()
            frame = subprocess.run(
                ["ffmpeg", "-v", "error", "-ss", "1", "-i", tmp.name, "-frames:v", "1", "-f", "image2", "-c:v", "png", "-"],
                capture_output=True, check=True,
            ).stdout
        obj = model(**{fk: loc}, title=video.get("title", ""), order=order, duration=round(float(duration)))
        obj.file.save("video.mp4", ContentFile(raw), save=False)
        obj.poster.save("poster.webp", process_poster(ContentFile(frame)), save=False)
        obj.save()

    # --- удаление ---

    def delete(self):
        locs = Location.objects.filter(tags__name=DEMO_TAG).distinct()
        files = 0
        for loc in locs:
            for p in loc.photos.all():
                for f in (p.image, p.thumbnail):
                    if f:
                        f.delete(save=False)
                        files += 1
            for v in loc.videos.all():
                for f in (v.file, v.poster):
                    if f:
                        f.delete(save=False)
                        files += 1
        titles = [r["title"] for r in json.loads(MANIFEST.read_text(encoding="utf-8")).get("portfolios", [])]
        for pf in Portfolio.objects.filter(title__in=titles):
            for f in [x for p in pf.photos.all() for x in (p.image, p.thumbnail)] + [x for v in pf.videos.all() for x in (v.file, v.poster)]:
                if f:
                    f.delete(save=False)
                    files += 1
            pf.delete()
        n_loc = locs.count()
        tag_ids = list(Tag.objects.filter(locations__in=locs).values_list("pk", flat=True).distinct())
        Location.objects.filter(pk__in=list(locs.values_list("pk", flat=True))).delete()
        n_tags, _ = Tag.objects.filter(pk__in=tag_ids).annotate(n=Count("locations")).filter(n=0).delete()
        self.stdout.write(self.style.SUCCESS(
            f"Удалено: локаций {n_loc}, файлов {files}, осиротевших тегов {n_tags}"
        ))
