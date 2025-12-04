from django.db import models

class Warehouse(models.Model):
    warehouse_id = models.CharField(max_length=10, primary_key=True)
    address = models.CharField(max_length=100)
    capacity = models.FloatField()
    stored_date = models.DateField()
    exp_date = models.DateField()

    def __str__(self):
        return f"{self.warehouse_id} - {self.address}"
    

class Community(models.Model):
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

    def __str__(self):
        return f"{self.name} ({self.community_id})"
