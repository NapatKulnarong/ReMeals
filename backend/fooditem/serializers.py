from rest_framework import serializers
from .models import FoodItem
from datetime import date


class FoodItemSerializer(serializers.ModelSerializer):

    def validate(self, attrs):
        instance = getattr(self, "instance", None)
        expire_date = attrs.get("expire_date", instance.expire_date if instance else None)
        is_expired = attrs.get("is_expired", instance.is_expired if instance else None)

        # CASE 1: CREATE
        if instance is None:

            # rule: expire_date in past but is_expired=False
            if expire_date and expire_date < date.today():
                if is_expired is False:
                    raise serializers.ValidationError(
                        "Expired items must have is_expired=True."
                    )

            return attrs

        # CASE 2: UPDATE
        # rule: cannot distribute before claimed
        if "is_distributed" in attrs:
            new_distributed = attrs["is_distributed"]
            claimed_state = (
                attrs["is_claimed"] if "is_claimed" in attrs else instance.is_claimed
            )

            if new_distributed and not claimed_state:
                raise serializers.ValidationError(
                    "Cannot distribute item before it is claimed."
                )

        # rule: cannot unclaim distributed item
        if "is_claimed" in attrs:
            new_claimed = attrs["is_claimed"]

            if instance.is_distributed and new_claimed is False:
                raise serializers.ValidationError(
                    "Cannot unclaim an item that has already been distributed."
                )

        # rule: expire mismatch
        if "expire_date" in attrs or "is_expired" in attrs:
            new_expire_date = expire_date
            new_is_expired = (
                attrs["is_expired"] if "is_expired" in attrs else instance.is_expired
            )

            if new_expire_date and new_expire_date < date.today():
                if new_is_expired is False:
                    raise serializers.ValidationError(
                        "Expired items must have is_expired=True."
                    )

        return attrs

    def validate_quantity(self, value):
        if value < 0:
            raise serializers.ValidationError("Quantity must not be negative.")
        return value

    class Meta:
        model = FoodItem
        fields = "__all__"
