# Generated by Django 5.0.6 on 2024-11-11 20:31

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0007_service_is_active_date_and_more"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="service",
            name="is_active_date",
        ),
    ]