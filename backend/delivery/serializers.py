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
            "status",
            "notes",
        ]
        read_only_fields = ["delivery_id"]

    def validate_status(self, value):
        allowed = {"pending", "in_transit", "delivered", "cancelled"}
        if value not in allowed:
            raise serializers.ValidationError("Invalid status value")
        return value

    def validate(self, attrs):
        instance = getattr(self, "instance", None)
        delivery_type = attrs.get("delivery_type") or getattr(instance, "delivery_type", None)
        warehouse = attrs.get("warehouse_id")
        user = attrs.get("user_id")
        donation = attrs.get("donation_id")
        community = attrs.get("community_id")

        if warehouse is None and instance is not None:
            warehouse = instance.warehouse_id
        if user is None and instance is not None:
            user = instance.user_id
        if donation is None and instance is not None:
            donation = instance.donation_id
        if community is None and instance is not None:
            community = instance.community_id

        errors = {}

        if delivery_type == "donation":
            if not donation:
                errors["donation_id"] = "Donation is required for pickup deliveries."
            if not warehouse:
                errors["warehouse_id"] = "Warehouse is required."
            if not user:
                errors["user_id"] = "Delivery staff is required."
        elif delivery_type == "distribution":
            if not community:
                errors["community_id"] = "Community is required for distribution deliveries."
            if not warehouse:
                errors["warehouse_id"] = "Warehouse is required."
            if not user:
                errors["user_id"] = "Delivery staff is required."
        else:
            errors["delivery_type"] = "Unknown delivery type."

        if errors:
            raise serializers.ValidationError(errors)

        return attrs
