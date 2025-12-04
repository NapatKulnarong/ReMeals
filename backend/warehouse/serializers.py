from rest_framework import serializers
from .models import Warehouse

class WarehouseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Warehouse
        fields = [
            "warehouse_id",
            "address",
            "capacity",
            "stored_date",
            "exp_date",
        ]
        