from django.db import models

from fooditem.models import FoodItem
from re_meals_api.id_utils import generate_prefixed_id


class ImpactRecord(models.Model):
    PREFIX = "IMP"

    impact_id = models.CharField(max_length=10, primary_key=True)

    meals_saved = models.FloatField()
    weight_saved_kg = models.FloatField()
    co2_reduced_kg = models.FloatField()

    impact_date = models.DateField(auto_now_add=True)

    food = models.OneToOneField(
        FoodItem,
        on_delete=models.CASCADE,
        related_name="impact"
    )

    class Meta:
        db_table = "impact_record"

    def save(self, *args, **kwargs):
        if not self.impact_id:
            self.impact_id = generate_prefixed_id(
                self.__class__,
                "impact_id",
                self.PREFIX,
            )
        super().save(*args, **kwargs)

    def __str__(self):
        return f"ImpactRecord {self.impact_id}"
