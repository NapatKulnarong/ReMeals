from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("donation", "0003_donation_created_by"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="donation",
            name="created_by",
        ),
    ]
