from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0005_alter_admin_user_alter_deliverystaff_user_and_more"),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name="donor",
            unique_together=set(),
        ),
        migrations.AddConstraint(
            model_name="donor",
            constraint=models.UniqueConstraint(
                fields=("user",), name="unique_donor_user"
            ),
        ),
        migrations.AddConstraint(
            model_name="recipient",
            constraint=models.UniqueConstraint(
                fields=("user",), name="unique_recipient_user"
            ),
        ),
    ]
