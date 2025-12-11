from django.db import models

from re_meals_api.id_utils import generate_prefixed_id
from restaurant_chain.models import RestaurantChain


class Restaurant(models.Model):
    PREFIX = "RES"

    restaurant_id = models.CharField(max_length=10, primary_key=True)
    address = models.CharField(max_length=300)
    name = models.CharField(max_length=100)
    branch_name = models.CharField(max_length=100)
    is_chain = models.BooleanField(default=False)

    chain = models.ForeignKey(
        RestaurantChain,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column="chain_id",
        related_name="restaurants",
    )

    class Meta:
        db_table = "restaurant"
        ordering = ["restaurant_id"]

    def save(self, *args, **kwargs):
        if not self.restaurant_id:
            self.restaurant_id = generate_prefixed_id(
                self.__class__,
                "restaurant_id",
                self.PREFIX,
            )
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.branch_name})"
