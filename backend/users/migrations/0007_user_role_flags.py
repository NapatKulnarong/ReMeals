from django.db import migrations, models


def forwards_populate_role_flags(apps, schema_editor):
    User = apps.get_model("users", "User")
    Donor = apps.get_model("users", "Donor")
    Recipient = apps.get_model("users", "Recipient")

    donor_user_ids = set(Donor.objects.values_list("user_id", flat=True))
    recipient_user_ids = set(Recipient.objects.values_list("user_id", flat=True))

    if donor_user_ids:
        User.objects.filter(user_id__in=donor_user_ids).update(is_donor=True)
    if recipient_user_ids:
        User.objects.filter(user_id__in=recipient_user_ids).update(is_recipient=True)


def backwards_reset_role_flags(apps, schema_editor):
    User = apps.get_model("users", "User")
    User.objects.update(
        is_donor=False,
        is_recipient=False,
    )


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0006_unique_role_constraints"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="is_donor",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="user",
            name="is_recipient",
            field=models.BooleanField(default=False),
        ),
        migrations.RunPython(
            forwards_populate_role_flags,
            backwards_reset_role_flags,
        ),
    ]
