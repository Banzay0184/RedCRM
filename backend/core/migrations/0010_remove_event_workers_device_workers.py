# Generated by Django 5.0.6 on 2024-11-13 05:11

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0009_event_computer_numbers"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="event",
            name="workers",
        ),
        migrations.AddField(
            model_name="device",
            name="workers",
            field=models.ManyToManyField(related_name="devices", to="core.workers"),
        ),
    ]