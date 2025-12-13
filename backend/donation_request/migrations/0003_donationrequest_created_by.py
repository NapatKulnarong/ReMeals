from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0005_alter_admin_user_alter_deliverystaff_user_and_more"),
        ("donation_request", "0002_delete_requestitem"),
    ]

    operations = [
        migrations.AddField(
            model_name="donationrequest",
            name="created_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="donation_requests",
                to="users.user",
            ),
        ),
    ]
