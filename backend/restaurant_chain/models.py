from django.db import models

from re_meals_api.id_utils import generate_prefixed_id


class RestaurantChain(models.Model):
    PREFIX = "CHA"

    chain_id = models.CharField(max_length=10, primary_key=True)
    chain_name = models.CharField(max_length=100)

    def save(self, *args, **kwargs):
        if not self.chain_id:
            self.chain_id = generate_prefixed_id(
                self.__class__,
                "chain_id",
                self.PREFIX,
            )
        super().save(*args, **kwargs)

    def __str__(self):
        return self.chain_name
