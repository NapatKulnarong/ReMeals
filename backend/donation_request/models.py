from django.db import models

from re_meals_api.id_utils import generate_prefixed_id
from community.models import Community


class DonationRequest(models.Model):
    PREFIX = "REQ"

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('declined', 'Declined'),
    ]

    request_id = models.CharField(max_length=10, primary_key=True)
    title = models.CharField(max_length=120)
    community_name = models.CharField(max_length=120)
    recipient_address = models.CharField(max_length=300)
    expected_delivery = models.DateTimeField()
    people_count = models.PositiveIntegerField()
    contact_phone = models.CharField(max_length=30, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    community = models.ForeignKey(
        Community,
        on_delete=models.CASCADE,
        related_name="donation_requests",
        db_column="community_id",
    )
    created_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='created_by',
        related_name='donation_requests',
    )

    class Meta:
        db_table = "donation_request"
        ordering = ["-created_at"]

    def __str__(self):
        return f"DonationRequest {self.request_id}"

    def save(self, *args, **kwargs):
        if not self.request_id:
            self.request_id = generate_prefixed_id(
                self.__class__,
                "request_id",
                self.PREFIX,
                padding=7,
            )
        super().save(*args, **kwargs)
