from django.db import models

class Warehouse(models.Model):
    warehouse_id = models.CharField(max_length=10, primary_key=True)
    address = models.CharField(max_length=100)
    capacity = models.FloatField()
    stored_date = models.DateField()
    exp_date = models.DateField()

    def __str__(self):
        return f"{self.warehouse_id} - {self.address}"