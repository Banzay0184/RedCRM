# Generated by Django 5.0.6 on 2024-11-16 16:41

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0014_alter_user_role_alter_user_options_and_more"),
    ]

    operations = [
        migrations.DeleteModel(
            name="User",
        ),
        migrations.AddField(
            model_name="event",
            name="advance_money",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="event",
            name="amount_money",
            field=models.BooleanField(default=False),
        ),
    ]
