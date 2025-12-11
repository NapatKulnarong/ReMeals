from django.db import models

from re_meals_api.id_utils import generate_prefixed_id


class Warehouse(models.Model):
    PREFIX = "WAR"

    warehouse_id = models.CharField(max_length=10, primary_key=True)
    address = models.CharField(max_length=300)
    capacity = models.FloatField()
    stored_date = models.DateField()
    exp_date = models.DateField()

    def save(self, *args, **kwargs):
        if not self.warehouse_id:
            self.warehouse_id = generate_prefixed_id(
                self.__class__,
                "warehouse_id",
                self.PREFIX,
            )
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.warehouse_id} - {self.address}"
