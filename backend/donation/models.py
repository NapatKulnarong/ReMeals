from django.db import models
from restaurants.models import Restaurant


class Donation(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('declined', 'Declined'),
    ]

    donation_id = models.CharField(max_length=10, primary_key=True)
    donated_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="donations",
    )

    class Meta:
        db_table = "donation"
        ordering = ["donation_id"]

    def __str__(self):
        return f"Donation {self.donation_id}"
