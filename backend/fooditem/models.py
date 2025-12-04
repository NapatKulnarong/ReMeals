from django.db import models

# Create your models here.
from donation.models import Donation  

class FoodItem(models.Model):
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

    def __str__(self):
        return f"{self.name} ({self.quantity} {self.unit})"