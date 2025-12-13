from django.db import models

from donation.models import Donation
from re_meals_api.id_utils import generate_prefixed_id


class FoodItem(models.Model):
    PREFIX = "FOO"

    food_id = models.CharField(max_length=10, primary_key=True)
    name = models.CharField(max_length=100)
    quantity = models.IntegerField()
    unit = models.CharField(max_length=20)
    expire_date = models.DateField()

    is_expired = models.BooleanField(default=False)
    is_claimed = models.BooleanField(default=False)
    is_distributed = models.BooleanField(default=False)

    donation = models.ForeignKey(
        Donation,
        on_delete=models.CASCADE,
        related_name="food_items",
        db_column="donation_id"
    )

    class Meta:
        db_table = "fooditem"
        ordering = ["food_id"]

    def save(self, *args, **kwargs):
        if not self.food_id:
            self.food_id = generate_prefixed_id(
                self.__class__,
                "food_id",
                self.PREFIX,
                padding=7,
            )
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.quantity} {self.unit})"

