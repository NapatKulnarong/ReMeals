from django.db import models

from re_meals_api.id_utils import generate_prefixed_id
from warehouse.models import Warehouse

class Community(models.Model):
    PREFIX = "COM"

    community_id = models.CharField(max_length=10, primary_key=True)
    name = models.CharField(max_length=100)
    address = models.CharField(max_length=300)
    received_time = models.DateTimeField()
    population = models.IntegerField()

    warehouse_id = models.ForeignKey(
        Warehouse,
        on_delete=models.PROTECT,
        related_name='communities',
    )

    def save(self, *args, **kwargs):
        if not self.community_id:
            self.community_id = generate_prefixed_id(
                self.__class__,
                "community_id",
                self.PREFIX,
            )
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.community_id})"
