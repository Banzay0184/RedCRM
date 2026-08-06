import uuid

from django.db import migrations


def populate_contract_token(apps, schema_editor):
    """Проставляем уникальный токен каждому уже существующему событию."""
    Event = apps.get_model("core", "Event")
    for event in Event.objects.filter(contract_token__isnull=True).only("id"):
        event.contract_token = uuid.uuid4()
        event.save(update_fields=["contract_token"])


def reverse_noop(apps, schema_editor):
    # Откатывать нечего - поле в предыдущей миграции просто станет NULL обратно.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0009_add_contract_token"),
    ]

    operations = [
        migrations.RunPython(populate_contract_token, reverse_noop),
    ]
