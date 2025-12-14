from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("donation_request", "0003_donationrequest_created_by"),
        ("users", "0007_user_role_flags"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="recipient",
            name="community_id",
        ),
        migrations.AddField(
            model_name="recipient",
            name="donation_request",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.SET_NULL,
                related_name="recipients",
                db_column="request_id",
                to="donation_request.donationrequest",
            ),
        ),
    ]
