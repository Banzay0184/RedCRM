from django.db import migrations

SEASONS = [
    ("Весна", "Bahor", "vesna"),
    ("Лето", "Yoz", "leto"),
    ("Осень", "Kuz", "osen"),
    ("Зима", "Qish", "zima"),
]


def seed(apps, schema_editor):
    Collection = apps.get_model("redloc", "Collection")
    for i, (ru, uz, slug) in enumerate(SEASONS):
        Collection.objects.get_or_create(slug=slug, defaults={"name_ru": ru, "name_uz": uz, "order": i})


class Migration(migrations.Migration):
    dependencies = [("redloc", "0007_collections")]
    operations = [migrations.RunPython(seed, migrations.RunPython.noop)]
