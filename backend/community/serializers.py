from rest_framework import serializers

from .models import Community
from warehouse.models import Warehouse
        
class CommunitySerializer(serializers.ModelSerializer):
    warehouse_id = serializers.SlugRelatedField(
        queryset=Warehouse.objects.all(),
        slug_field="warehouse_id",
    )
    class Meta:
        model = Community
        fields = [
            "community_id",
            "name",
            "address",
            "received_time",
            "population",
            "warehouse_id",
        ]
