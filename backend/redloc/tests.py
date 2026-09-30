import shutil
import tempfile
from io import BytesIO

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from PIL import Image
from rest_framework.test import APITestCase

from datetime import timedelta
from unittest.mock import AsyncMock, patch

from django.utils import timezone

from core.models import Client

from .models import AccessLink, Category, City, Location, LocationPhoto

TMP_MEDIA = tempfile.mkdtemp()


def jpeg(name="p.jpg", size=(3000, 2000)):
    buf = BytesIO()
    Image.new("RGB", size, (200, 40, 40)).save(buf, "JPEG")
    return SimpleUploadedFile(name, buf.getvalue(), content_type="image/jpeg")


@override_settings(MEDIA_ROOT=TMP_MEDIA)
class RedlocApiTests(APITestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(TMP_MEDIA, ignore_errors=True)

    def setUp(self):
        self.staff = User.objects.create_user("admin", password="x", is_staff=True)
        self.user = User.objects.create_user("user", password="x")
        self.city = City.objects.get(slug="tashkent")
        self.interior = Category.objects.get(slug="interior")
        self.studio = Category.objects.get(slug="studio")
        # Каталог закрыт: анонимные запросы в тестах идут по действующей ссылке-доступу
        self.link = AccessLink.objects.create()
        self.as_guest()

    def as_guest(self):
        # force_authenticate(None) в DRF сбрасывает и credentials — выставляем ссылку заново
        self.client.force_authenticate(None)
        self.client.credentials(HTTP_X_REDLOC_ACCESS=self.link.token)

    def create_location(self, **extra):
        self.client.force_authenticate(self.staff)
        payload = {"title": "Модерн Апартамент", "city": self.city.id, "categories": [self.interior.id],
                   "tags": ["Премиум", " премиум ", "#Минимализм"]}
        payload.update(extra)
        res = self.client.post("/api/redloc/locations/", payload, format="json")
        self.assertEqual(res.status_code, 201, res.data)
        self.as_guest()
        return Location.objects.get(pk=res.data["id"])

    def test_create_location_translit_slug_and_dedup_tags(self):
        loc = self.create_location()
        self.assertEqual(loc.slug, "modern-apartament")
        self.assertEqual(sorted(t.name for t in loc.tags.all()), ["Минимализм", "Премиум"])
        loc2 = self.create_location()
        self.assertEqual(loc2.slug, "modern-apartament-2")

    def test_category_required(self):
        self.client.force_authenticate(self.staff)
        res = self.client.post("/api/redloc/locations/", {"title": "X"}, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("categories", res.data)

    def test_public_catalog_read_only_and_hides_unpublished(self):
        self.create_location()
        self.create_location(title="Hidden", is_published=False)
        res = self.client.get("/api/redloc/locations/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual([r["title"] for r in res.data["results"]], ["Модерн Апартамент"])
        self.assertEqual(self.client.get("/api/redloc/locations/hidden/").status_code, 404)
        self.assertEqual(self.client.post("/api/redloc/locations/", {"title": "Y"}).status_code, 403)
        self.client.force_authenticate(self.user)
        self.assertEqual(self.client.post("/api/redloc/locations/", {"title": "Y"}).status_code, 403)

    def test_filters(self):
        self.create_location(title="A")
        self.create_location(title="B", categories=[self.studio.id])
        self.create_location(title="C", city=City.objects.get(slug="bukhara").id,
                             categories=[self.interior.id, self.studio.id])
        titles = lambda qs: sorted(r["title"] for r in self.client.get(f"/api/redloc/locations/?{qs}").data["results"])
        self.assertEqual(titles("category=studio"), ["B", "C"])
        self.assertEqual(titles("category=studio,interior"), ["C"])
        self.assertEqual(titles("city=tashkent"), ["A", "B"])
        self.assertEqual(titles("q=Бухар"), ["C"])
        self.assertEqual(titles("tag=minimalizm"), ["A", "B", "C"])

    def test_photo_upload_resizes_and_cover(self):
        loc = self.create_location()
        self.client.force_authenticate(self.staff)
        res = self.client.post("/api/redloc/photos/", {"location": loc.id, "images": [jpeg(), jpeg("b.jpg")]},
                               format="multipart")
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(len(res.data["created"]), 2)
        photo = LocationPhoto.objects.filter(location=loc).first()
        self.assertEqual((photo.width, photo.height), (2000, 1333))
        self.assertTrue(photo.image.name.endswith(".webp"))

        bad = SimpleUploadedFile("x.jpg", b"not an image", content_type="image/jpeg")
        res = self.client.post("/api/redloc/photos/", {"location": loc.id, "images": [bad]}, format="multipart")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(len(res.data["errors"]), 1)

        ids = list(loc.photos.values_list("id", flat=True))[::-1]
        self.client.post("/api/redloc/photos/reorder/", {"ids": ids, "location": loc.id}, format="json")
        self.as_guest()
        item = self.client.get("/api/redloc/locations/").data["results"][0]
        self.assertEqual(item["photos_count"], 2)
        self.assertEqual(item["cover"]["id"], ids[0])

    def test_youtube_video(self):
        loc = self.create_location()
        self.client.force_authenticate(self.staff)
        res = self.client.post("/api/redloc/videos/", {"location": loc.id, "youtube_url": "https://youtu.be/dQw4w9WgXcQ"},
                               format="json")
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data["youtube_id"], "dQw4w9WgXcQ")
        self.assertIn("i.ytimg.com", res.data["poster_url"])
        res = self.client.post("/api/redloc/videos/", {"location": loc.id, "youtube_url": "https://example.com"},
                               format="json")
        self.assertEqual(res.status_code, 400)
        res = self.client.post("/api/redloc/videos/", {"location": loc.id}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_detail_counts_views(self):
        loc = self.create_location()
        self.as_guest()
        self.client.get(f"/api/redloc/locations/{loc.slug}/")
        self.client.get(f"/api/redloc/locations/{loc.slug}/")
        loc.refresh_from_db()
        self.assertEqual(loc.views_count, 2)

    def test_portfolio_crud_and_media(self):
        loc = self.create_location()
        self.client.force_authenticate(self.staff)
        res = self.client.post("/api/redloc/portfolios/", {"kind": "love_story", "title": "Азиз и Малика", "location": loc.id},
                               format="json")
        self.assertEqual(res.status_code, 201, res.data)
        slug, pid = res.data["slug"], res.data["id"]
        up = self.client.post("/api/redloc/portfolio-photos/", {"portfolio": pid, "images": [jpeg("a.jpg"), jpeg("b.jpg")]},
                              format="multipart")
        self.assertEqual(up.status_code, 201, up.data)
        ids = [p["id"] for p in up.data["created"]]
        self.client.post("/api/redloc/portfolio-photos/reorder/", {"portfolio": pid, "ids": ids[::-1]}, format="json")
        yt = self.client.post("/api/redloc/portfolio-videos/", {"portfolio": pid, "youtube_url": "https://youtu.be/dQw4w9WgXcQ"},
                              format="json")
        self.assertEqual(yt.data["youtube_id"], "dQw4w9WgXcQ")
        detail = self.client.get(f"/api/redloc/portfolios/{slug}/").data
        self.assertEqual([p["id"] for p in detail["photos"]], ids[::-1])
        self.assertEqual(detail["location"]["slug"], loc.slug)
        # скрытая съёмка не видна клиенту; менять может только staff
        self.client.patch(f"/api/redloc/portfolios/{slug}/", {"is_published": False}, format="json")
        self.as_guest()
        self.assertEqual(self.client.get("/api/redloc/portfolios/?kind=love_story").data["count"], 0)
        self.assertEqual(self.client.post("/api/redloc/portfolios/", {"kind": "album", "title": "x"}, format="json").status_code, 403)
        self.assertEqual(self.client.delete(f"/api/redloc/portfolio-photos/{ids[0]}/").status_code, 403)
        self.client.force_authenticate(self.staff)
        self.assertEqual(self.client.delete(f"/api/redloc/portfolios/{slug}/").status_code, 204)

    def test_site_settings_hero(self):
        self.as_guest()
        self.assertEqual(self.client.get("/api/redloc/meta/").data["site"]["hero_image_url"], None)
        self.assertEqual(self.client.patch("/api/redloc/site/", {"hero_title_ru": "x"}, format="json").status_code, 403)
        self.client.force_authenticate(self.staff)
        res = self.client.patch("/api/redloc/site/", {"hero_title_ru": "Новый заголовок", "hero_image": jpeg()}, format="multipart")
        self.assertEqual(res.status_code, 200, res.data)
        self.assertTrue(res.data["hero_image_url"].endswith(".webp"))
        self.as_guest()
        site = self.client.get("/api/redloc/meta/").data["site"]
        self.assertEqual(site["hero_title_ru"], "Новый заголовок")
        self.client.force_authenticate(self.staff)
        res = self.client.patch("/api/redloc/site/", {"remove_hero_image": "1"}, format="multipart")
        self.assertIsNone(res.data["hero_image_url"])

    def test_badge_ordering_top_first_off_season_last(self):
        off = self.create_location(title="Не сезон", badge="off_season")
        plain = self.create_location(title="Обычная")
        top = self.create_location(title="Топовая", badge="top")
        Location.objects.filter(pk=off.pk).update(views_count=999)  # просмотры не поднимают «не сезон» наверх
        ids = [x["id"] for x in self.client.get("/api/redloc/locations/?ordering=popular").data["results"]]
        self.assertEqual(ids, [top.id, plain.id, off.id])

    def test_manual_order_within_badge_groups(self):
        a = self.create_location(title="А")
        b = self.create_location(title="Б")
        top = self.create_location(title="Топ", badge="top")
        self.assertEqual(self.client.post("/api/redloc/locations/reorder/", {"ids": [b.id, a.id]}, format="json").status_code, 403)
        self.client.force_authenticate(self.staff)
        self.client.post("/api/redloc/locations/reorder/", {"ids": [b.id, a.id, top.id]}, format="json")
        self.as_guest()
        ids = [x["id"] for x in self.client.get("/api/redloc/locations/?ordering=popular").data["results"]]
        self.assertEqual(ids, [top.id, b.id, a.id])  # ТОП всё равно первым, дальше — порядок сотрудника

    def test_meta(self):
        self.create_location()
        data = self.client.get("/api/redloc/meta/").data
        self.assertEqual(data["stats"]["locations"], 1)
        interior = next(c for c in data["categories"] if c["slug"] == "interior")
        self.assertEqual(interior["locations_count"], 1)


class AccessLinkTests(APITestCase):
    def setUp(self):
        self.staff = User.objects.create_user("admin", password="x", is_staff=True)
        self.crm_client = Client.objects.create(name="Coca-Cola")

    def get(self, token=None, url="/api/redloc/locations/"):
        self.client.credentials(**({"HTTP_X_REDLOC_ACCESS": token} if token else {}))
        return self.client.get(url)

    def test_catalog_closed_without_link(self):
        res = self.get()
        self.assertEqual(res.status_code, 401)
        self.assertEqual(res.data["code"], "access_no_access")
        self.assertEqual(self.get(url="/api/redloc/meta/").status_code, 401)

    def test_active_expired_revoked_invalid(self):
        link = AccessLink.objects.create(client=self.crm_client)
        self.assertEqual(self.get(link.token).status_code, 200)

        link.expires_at = timezone.now() - timedelta(seconds=1)
        link.save()
        res = self.get(link.token)
        self.assertEqual((res.status_code, res.data["code"]), (401, "access_expired"))

        link2 = AccessLink.objects.create(revoked_at=timezone.now())
        self.assertEqual(self.get(link2.token).data["code"], "access_revoked")
        self.assertEqual(self.get("nope").data["code"], "access_invalid")

    @override_settings(REDLOC_LINK_TTL_MINUTES=5)
    def test_ttl_from_settings(self):
        link = AccessLink.objects.create()
        delta = link.expires_at - timezone.now()
        self.assertTrue(timedelta(minutes=4) < delta <= timedelta(minutes=5))

    def test_staff_jwt_has_access(self):
        self.client.force_authenticate(self.staff)
        self.assertEqual(self.client.get("/api/redloc/locations/").status_code, 200)

    def test_check_endpoint_counts_opens(self):
        link = AccessLink.objects.create(client=self.crm_client)
        res = self.client.get(f"/api/redloc/access/{link.token}/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["client_name"], "Coca-Cola")
        self.client.get(f"/api/redloc/access/{link.token}/")
        link.refresh_from_db()
        self.assertEqual(link.open_count, 2)
        self.assertIsNotNone(link.first_opened_at)
        link.expires_at = timezone.now() - timedelta(minutes=1)
        link.save()
        res = self.client.get(f"/api/redloc/access/{link.token}/")
        self.assertEqual((res.status_code, res.data["code"]), (410, "access_expired"))
        self.assertEqual(self.client.get("/api/redloc/access/bad/").status_code, 404)

    @override_settings(REDLOC_FRONTEND_URL="https://redloc.test")
    def test_send_link_via_telegram(self):
        self.client.force_authenticate(self.staff)
        with patch("core.telegram_service.TelegramService.send_message",
                   new=AsyncMock(return_value={"ok": True, "telegram_user_id": 42})) as send:
            res = self.client.post("/api/redloc/access-links/send/",
                                   {"client": self.crm_client.id, "phone": "998901234567"}, format="json")
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data["send_status"], "success")
        self.assertTrue(res.data["url"].startswith("https://redloc.test/a/"))
        phone, text = send.await_args.args
        self.assertEqual(phone, "+998901234567")
        self.assertIn(res.data["url"], text)

        with patch("core.telegram_service.TelegramService.send_message",
                   new=AsyncMock(return_value={"ok": False, "error": "Пользователь не найден"})):
            res = self.client.post("/api/redloc/access-links/send/",
                                   {"client": self.crm_client.id, "phone": "+998901234567"}, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data["send_status"], "error")
        self.assertIn("url", res.data)  # ссылку можно отправить вручную

        self.client.force_authenticate(None)
        self.assertEqual(self.client.post("/api/redloc/access-links/send/", {}).status_code, 401)

    def test_revoke(self):
        link = AccessLink.objects.create()
        self.client.force_authenticate(self.staff)
        self.assertEqual(self.client.post(f"/api/redloc/access-links/{link.id}/revoke/").data["state"], "revoked")
