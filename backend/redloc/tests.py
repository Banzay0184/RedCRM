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

from .models import AccessLink, Category, City, Favorite, Location, LocationPhoto, LocationRequest, ShootType

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

    def test_detail_counts_views_and_zones(self):
        loc = self.create_location()
        self.client.force_authenticate(self.staff)
        zone = self.client.post("/api/redloc/zones/", {"location": loc.id, "name": "Окно в пол"}, format="json").data
        self.client.post("/api/redloc/photos/", {"location": loc.id, "images": [jpeg()]}, format="multipart")
        photo = loc.photos.first()
        res = self.client.patch(f"/api/redloc/photos/{photo.id}/", {"zone": zone["id"]}, format="json")
        self.assertEqual(res.status_code, 200, res.data)
        self.as_guest()
        data = self.client.get(f"/api/redloc/locations/{loc.slug}/").data
        self.assertEqual(data["zones"][0]["photos_count"], 1)
        self.client.get(f"/api/redloc/locations/{loc.slug}/")
        loc.refresh_from_db()
        self.assertEqual(loc.views_count, 2)

    def test_favorites(self):
        loc = self.create_location()
        self.assertEqual(self.client.post(f"/api/redloc/locations/{loc.slug}/favorite/").status_code, 403)
        self.client.force_authenticate(self.user)
        self.client.post(f"/api/redloc/locations/{loc.slug}/favorite/")
        self.client.post(f"/api/redloc/locations/{loc.slug}/favorite/")
        self.assertEqual(Favorite.objects.filter(user=self.user).count(), 1)
        res = self.client.get("/api/redloc/locations/?favorites=1")
        self.assertTrue(res.data["results"][0]["is_favorite"])
        self.client.delete(f"/api/redloc/locations/{loc.slug}/favorite/")
        self.assertEqual(self.client.post("/api/redloc/favorites/sync/", {"ids": [loc.id, 9999]}, format="json").data,
                         {"ids": [loc.id]})

    def test_requests(self):
        loc = self.create_location()
        res = self.client.post("/api/redloc/requests/", {
            "location": loc.id, "name": "Ali", "phone": "+998 90 123-45-67",
            "shoot_type": ShootType.objects.first().id, "status": "done",
        }, format="json")
        self.assertEqual(res.status_code, 201, res.data)
        req = LocationRequest.objects.get()
        self.assertEqual(req.status, "new")  # статус с публичной формы игнорируется
        self.assertEqual(req.access_link, self.link)
        self.assertEqual(self.client.get("/api/redloc/requests/").status_code, 403)
        self.client.force_authenticate(self.staff)
        self.assertEqual(self.client.patch(f"/api/redloc/requests/{req.id}/", {"status": "done"}).data["status"], "done")
        self.assertEqual(self.client.get("/api/redloc/requests/counts/").data, {"done": 1})

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
