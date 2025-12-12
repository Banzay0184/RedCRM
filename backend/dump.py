from django.core.management import call_command
import io
import codecs
import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

with io.open("data.json", "w", encoding="utf-8") as f:
    call_command(
        "dumpdata",
        natural_foreign=True,
        natural_primary=True,
        indent=4,
        stdout=f
    )
