# Generated by Django 5.0.6 on 2024-11-11 19:45

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0006_alter_device_event_service_date"),
    ]

    operations = [
        migrations.AddField(
            model_name="service",
            name="is_active_date",
            field=models.BooleanField(default=False),
        ),
        migrations.AlterField(
            model_name="device",
            name="event_service_date",
            field=models.DateField(blank=True, null=True),
        ),
    ]
