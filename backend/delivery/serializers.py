from rest_framework import serializers

from .models import Delivery
from users.models import User
from warehouse.models import Warehouse
from community.models import Community
from donation.models import Donation
        
class DeliverySerializer(serializers.ModelSerializer):
    user_id = serializers.SlugRelatedField(
        slug_field="user_id",
        queryset=User.objects.all(),
        allow_null=True,
        required=False,
    )
    warehouse_id = serializers.SlugRelatedField(
        slug_field="warehouse_id",
        queryset=Warehouse.objects.all(),
        allow_null=True,
        required=False,
    )
    community_id = serializers.SlugRelatedField(
        slug_field="community_id",
        queryset=Community.objects.all(),
        allow_null=True,
        required=False,
    )
    donation_id = serializers.SlugRelatedField(
        slug_field="donation_id",
        queryset=Donation.objects.all(),
        allow_null=True,
        required=False,
    )
    
    class Meta:
        model = Delivery
        fields = [
            "delivery_id",
            "delivery_type",
            "pickup_time",
            "dropoff_time",
            "pickup_location_type",
            "dropoff_location_type",
            "warehouse_id",
            "user_id",
            "donation_id",
            "community_id",
        ]
