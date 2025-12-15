# Generated manually to set created_by for existing requests

from django.db import migrations


def set_created_by_from_recipient(apps, schema_editor):
    """Set created_by for existing donation requests based on Recipient relationship."""
    DonationRequest = apps.get_model('donation_request', 'DonationRequest')
    Recipient = apps.get_model('users', 'Recipient')
    
    # For each request without created_by, try to find the recipient linked to it
    requests_without_creator = DonationRequest.objects.filter(created_by__isnull=True)
    
    for request in requests_without_creator:
        # Find recipient linked to this request
        recipient = Recipient.objects.filter(donation_request=request).first()
        if recipient:
            request.created_by = recipient.user
            request.save(update_fields=['created_by'])


def reverse_set_created_by(apps, schema_editor):
    """Reverse migration - set created_by back to NULL (optional)"""
    DonationRequest = apps.get_model('donation_request', 'DonationRequest')
    # Don't reverse - keep the created_by values


class Migration(migrations.Migration):

    dependencies = [
        ('donation_request', '0007_donationrequest_status'),
        ('users', '0011_add_user_role_flags'),
    ]

    operations = [
        migrations.RunPython(set_created_by_from_recipient, reverse_set_created_by),
    ]

