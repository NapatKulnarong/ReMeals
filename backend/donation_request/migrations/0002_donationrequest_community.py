from django.db import migrations, models


def forwards_set_community(apps, schema_editor):
    DonationRequest = apps.get_model("donation_request", "DonationRequest")
    Community = apps.get_model("community", "Community")

    name_to_pk = {c.name: c.pk for c in Community.objects.all()}

    for request in DonationRequest.objects.filter(community__isnull=True):
        community_pk = name_to_pk.get(request.community_name)
        if community_pk:
            request.community_id = community_pk
            request.save(update_fields=["community_id"])


def backwards_clear_community(apps, schema_editor):
    DonationRequest = apps.get_model("donation_request", "DonationRequest")
    DonationRequest.objects.update(community=None)


class Migration(migrations.Migration):
    dependencies = [
        ("community", "0001_initial"),
        ("donation_request", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="donationrequest",
            name="community",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.CASCADE,
                related_name="donation_requests",
                db_column="community_id",
                to="community.community",
            ),
        ),
        migrations.RunPython(
            forwards_set_community,
            backwards_clear_community,
        ),
        migrations.AlterField(
            model_name="donationrequest",
            name="community",
            field=models.ForeignKey(
                on_delete=models.CASCADE,
                related_name="donation_requests",
                db_column="community_id",
                to="community.community",
            ),
        ),
    ]
