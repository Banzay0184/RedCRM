# Generated by Django 5.0.6 on 2024-11-10 15:37

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0002_remove_event_restaurant_name_device_restaurant_name"),
    ]

    operations = [
        migrations.AlterField(
            model_name="device",
            name="restaurant_name",
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
    ]