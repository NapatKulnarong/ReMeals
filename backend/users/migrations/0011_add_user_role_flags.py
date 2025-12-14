from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0010_merge_20251215_0010"),
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
    ]
