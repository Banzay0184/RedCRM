import threading

from django.db.models.signals import pre_save, pre_delete, post_save, post_delete
from django.dispatch import receiver

from .middleware import get_current_user
from .models import Client, ClientHistory, Event, EventHistory, PhoneClient

TRACKED_EVENT_FIELDS = ["amount", "amount_money", "computer_numbers", "comment"]
TRACKED_CLIENT_FIELDS = ["name"]

# Клиенты, которые прямо сейчас удаляются в текущем потоке (см. mark_client_deleting ниже).
# pre_delete гарантированно срабатывает раньше любых DELETE в каскаде, поэтому к моменту,
# когда post_delete PhoneClient решает, писать ли историю, здесь уже точно есть нужный id.
_deleting_client_ids = threading.local()


def _is_client_being_deleted(client_id):
    ids = getattr(_deleting_client_ids, "ids", None)
    return bool(ids) and client_id in ids


@receiver(pre_delete, sender=Client)
def mark_client_deleting(sender, instance, **kwargs):
    ids = getattr(_deleting_client_ids, "ids", None)
    if ids is None:
        ids = set()
        _deleting_client_ids.ids = ids
    ids.add(instance.pk)


@receiver(post_delete, sender=Client)
def unmark_client_deleting(sender, instance, **kwargs):
    ids = getattr(_deleting_client_ids, "ids", None)
    if ids:
        ids.discard(instance.pk)


@receiver(pre_save, sender=Event)
def stash_event_changes(sender, instance, **kwargs):
    """Сравнивает instance со свежей копией из БД и запоминает изменения для post_save."""
    if instance.pk is None:
        return

    try:
        old = Event.objects.get(pk=instance.pk)
    except Event.DoesNotExist:
        return

    changes = []
    for field in TRACKED_EVENT_FIELDS:
        old_value = getattr(old, field)
        new_value = getattr(instance, field)
        if old_value != new_value:
            changes.append(("__event__", field, old_value, new_value))

    if old.client_id != instance.client_id:
        changes.append(("__event__", "client", old.client_id, instance.client_id))

    if changes:
        instance._pending_history = changes


@receiver(post_save, sender=Event)
def write_event_history(sender, instance, **kwargs):
    changes = getattr(instance, "_pending_history", None)
    if not changes:
        return

    user = get_current_user()
    EventHistory.objects.bulk_create([
        EventHistory(
            event=instance,
            field_name=field,
            old_value=old_value,
            new_value=new_value,
            changed_by=user,
        )
        for _, field, old_value, new_value in changes
    ])
    del instance._pending_history


@receiver(pre_save, sender=Client)
def stash_client_changes(sender, instance, **kwargs):
    if instance.pk is None:
        return

    try:
        old = Client.objects.get(pk=instance.pk)
    except Client.DoesNotExist:
        return

    changes = []
    for field in TRACKED_CLIENT_FIELDS:
        old_value = getattr(old, field)
        new_value = getattr(instance, field)
        if old_value != new_value:
            changes.append((field, old_value, new_value))

    if changes:
        instance._pending_history = changes


@receiver(post_save, sender=Client)
def write_client_history(sender, instance, **kwargs):
    changes = getattr(instance, "_pending_history", None)
    if not changes:
        return

    user = get_current_user()
    ClientHistory.objects.bulk_create([
        ClientHistory(
            client=instance,
            field_name=field,
            old_value=old_value,
            new_value=new_value,
            changed_by=user,
        )
        for field, old_value, new_value in changes
    ])
    del instance._pending_history


@receiver(pre_save, sender=PhoneClient)
def stash_phone_change(sender, instance, **kwargs):
    if instance.pk is None:
        return

    try:
        old = PhoneClient.objects.get(pk=instance.pk)
    except PhoneClient.DoesNotExist:
        return

    if old.phone_number != instance.phone_number:
        instance._pending_phone_change = (old.phone_number, instance.phone_number)


@receiver(post_save, sender=PhoneClient)
def write_phone_history(sender, instance, created, **kwargs):
    user = get_current_user()

    if created:
        ClientHistory.objects.create(
            client=instance.client,
            field_name="phone_number",
            old_value=None,
            new_value=instance.phone_number,
            changed_by=user,
        )
        return

    change = getattr(instance, "_pending_phone_change", None)
    if not change:
        return

    old_value, new_value = change
    ClientHistory.objects.create(
        client=instance.client,
        field_name="phone_number",
        old_value=old_value,
        new_value=new_value,
        changed_by=user,
    )
    del instance._pending_phone_change


@receiver(post_delete, sender=PhoneClient)
def write_phone_deletion_history(sender, instance, **kwargs):
    # Если телефон удалился как часть каскадного удаления самого клиента,
    # клиента (и вместе с ним этой записи истории) уже не будет — не пишем.
    if _is_client_being_deleted(instance.client_id):
        return
    if not Client.objects.filter(pk=instance.client_id).exists():
        return

    ClientHistory.objects.create(
        client=instance.client,
        field_name="phone_number",
        old_value=instance.phone_number,
        new_value=None,
        changed_by=get_current_user(),
    )
