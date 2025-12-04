from django.db import models


class Restaurant(models.Model):
    restaurant_id = models.CharField(max_length=10, primary_key=True)
    address = models.CharField(max_length=300)
    name = models.CharField(max_length=100)
    branch_name = models.CharField(max_length=100)
    is_chain = models.BooleanField(default=False)

    chain = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column="chain_id",
        related_name="branches",
    )

    class Meta:
        db_table = "restaurant"
        ordering = ["restaurant_id"]

    def __str__(self):
        return f"{self.name} ({self.branch_name})"
