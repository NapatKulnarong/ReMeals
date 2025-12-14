from django.db import models
from warehouse.models import Warehouse
from community.models import Community
from donation.models import Donation
from users.models import User
from re_meals_api.id_utils import generate_prefixed_id


class Delivery(models.Model):
    PREFIX = "DLV"

    DELIVERY_TYPE_CHOICES = [
        ("donation", "Donation"),
        ("distribution", "Distribution"),
    ]
    PICKUP_LOCATION_CHOICES = [
        ("restaurant", "Restaurant"),
        ("warehouse", "Warehouse"),
    ]
    DROPOFF_LOCATION_CHOICES = [
        ("warehouse", "Warehouse"),
        ("community", "Community"),
    ]

    delivery_id = models.CharField(max_length=10, primary_key=True)
    delivery_type = models.CharField(max_length=20, choices=DELIVERY_TYPE_CHOICES)
    pickup_time = models.DateTimeField()
    dropoff_time = models.DurationField()
    pickup_location_type = models.CharField(max_length=20, choices=PICKUP_LOCATION_CHOICES)
    dropoff_location_type = models.CharField(max_length=20, choices=DROPOFF_LOCATION_CHOICES)
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("in_transit", "In transit"),
        ("delivered", "Delivered"),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    notes = models.TextField(blank=True, default="")

    warehouse_id = models.ForeignKey(
        Warehouse,
        on_delete=models.PROTECT,
        related_name="deliveries",
        null=True,
        blank=True,
    )

    user_id = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="deliveries",
        null=True,
        blank=True,
    )

    donation_id = models.ForeignKey(
        Donation,
        on_delete=models.SET_NULL,
        related_name="deliveries",
        null=True,
        blank=True,
    )

    community_id = models.ForeignKey(
        Community,
        on_delete=models.PROTECT,
        related_name="deliveries",
        null=True,
        blank=True,
    )

    def __str__(self):
        return f"Delivery {self.delivery_id} ({self.delivery_type})"

    def save(self, *args, **kwargs):
        if not self.delivery_id:
            self.delivery_id = generate_prefixed_id(
                self.__class__,
                "delivery_id",
                self.PREFIX,
                padding=7,
            )
        super().save(*args, **kwargs)
