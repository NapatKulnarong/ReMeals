from rest_framework import serializers

from restaurant_chain.models import RestaurantChain
from restaurants.models import Restaurant

from .models import Donation


class DonationSerializer(serializers.ModelSerializer):
    restaurant_name = serializers.SerializerMethodField()
    restaurant_branch = serializers.SerializerMethodField()
    restaurant_address = serializers.SerializerMethodField()
    created_by_user_id = serializers.SerializerMethodField()
    manual_restaurant_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    manual_branch_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    manual_restaurant_address = serializers.CharField(write_only=True, required=False, allow_blank=True)
    
    def get_restaurant_name(self, obj):
        return obj.restaurant.name if obj.restaurant else None
    
    def get_restaurant_branch(self, obj):
        return obj.restaurant.branch_name if obj.restaurant else None
    
    def get_restaurant_address(self, obj):
        return obj.restaurant.address if obj.restaurant else None
    
    def get_created_by_user_id(self, obj):
        try:
            # Check if created_by field exists and has a value
            if hasattr(obj, 'created_by'):
                created_by = getattr(obj, 'created_by', None)
                if created_by:
                    return getattr(created_by, 'user_id', None)
        except (AttributeError, Exception):
            # Field doesn't exist in database or other error
            pass
        return None
    
    class Meta:
        model = Donation
        fields = [
            "donation_id",
            "donated_at",
            "status",
            "restaurant",
            "restaurant_name",
            "restaurant_branch",
            "restaurant_address",
            "created_by_user_id",
            "manual_restaurant_name",
            "manual_branch_name",
            "manual_restaurant_address",
        ]
        extra_kwargs = {
            "restaurant": {"required": False, "allow_null": True},
        }
        read_only_fields = (
            "donation_id",
            "donated_at",
            "restaurant_name",
            "restaurant_branch",
            "restaurant_address",
        )

    def validate(self, attrs):
        # Only enforce restaurant/manual info on create. Partial updates without those
        # fields should remain valid.
        if self.instance is not None:
            return attrs

        restaurant = attrs.get("restaurant")
        manual_name = attrs.get("manual_restaurant_name", "")
        if not restaurant and not manual_name:
            raise serializers.ValidationError(
                "Provide either an existing restaurant ID or a manual restaurant name."
            )
        return attrs

    def create(self, validated_data):
        manual_name = validated_data.pop("manual_restaurant_name", "").strip()
        manual_branch = validated_data.pop("manual_branch_name", "").strip()
        manual_address = validated_data.pop("manual_restaurant_address", "").strip()

        if manual_name:
            chain = (
                RestaurantChain.objects.filter(chain_name__iexact=manual_name).first()
            )
            if chain is None:
                chain = RestaurantChain(chain_name=manual_name)
                chain.save()

            branch_name = manual_branch or "Main Location"
            address = manual_address or manual_branch or manual_name
            restaurant = (
                Restaurant.objects.filter(
                    name__iexact=manual_name,
                    branch_name__iexact=branch_name,
                ).first()
            )
            if restaurant is None:
                restaurant = Restaurant.objects.create(
                    name=manual_name,
                    branch_name=branch_name,
                    address=address,
                    is_chain=bool(manual_branch),
                    chain=chain,
                )
            validated_data["restaurant"] = restaurant

        return super().create(validated_data)
 
