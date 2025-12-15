from datetime import datetime, time

from django.utils import timezone as django_timezone
from rest_framework import serializers
from rest_framework.fields import DateTimeField

from .models import Delivery
from users.models import User
from warehouse.models import Warehouse
from community.models import Community
from donation.models import Donation
from fooditem.models import FoodItem


class FlexibleDateTimeField(DateTimeField):
    """DateTimeField that can handle both datetime and time objects"""
    def to_internal_value(self, data):
        """Convert time string to datetime for backward compatibility"""
        if isinstance(data, str):
            # Check if it's a time-only string (HH:MM:SS format)
            if len(data) == 8 and data.count(':') == 2 and not ('T' in data or 'Z' in data or '+' in data or '-' in data[-6:]):
                try:
                    # Parse as time
                    time_obj = time.fromisoformat(data)
                    # Try to get pickup_time from parent serializer
                    base_date = datetime.now().date()
                    if hasattr(self, 'parent') and self.parent:
                        # Check if we're in a serializer context with initial_data
                        if hasattr(self.parent, 'initial_data'):
                            pickup_time_str = self.parent.initial_data.get('pickup_time')
                            if pickup_time_str:
                                try:
                                    if isinstance(pickup_time_str, str):
                                        pickup_dt = datetime.fromisoformat(pickup_time_str.replace('Z', '+00:00'))
                                    else:
                                        pickup_dt = pickup_time_str
                                    base_date = pickup_dt.date() if isinstance(pickup_dt, datetime) else datetime.now().date()
                                except (ValueError, AttributeError):
                                    pass
                    # Combine date with time and add timezone
                    combined = datetime.combine(base_date, time_obj)
                    # Make timezone-aware using Django's current timezone
                    combined = django_timezone.make_aware(combined)
                    # Convert to ISO format string
                    return combined.isoformat()
                except (ValueError, AttributeError):
                    # If parsing fails, let parent handle it
                    pass
        return super().to_internal_value(data)
    
    def to_representation(self, value):
        if value is None:
            return None
        # If it's a time object, convert it to datetime
        if isinstance(value, time):
            # Try to get pickup_time from the parent serializer's instance
            base_date = datetime.now().date()
            try:
                if hasattr(self, 'parent') and self.parent:
                    if hasattr(self.parent, 'instance') and self.parent.instance:
                        instance = self.parent.instance
                        if hasattr(instance, 'pickup_time') and instance.pickup_time:
                            if isinstance(instance.pickup_time, datetime):
                                base_date = instance.pickup_time.date()
                            elif hasattr(instance.pickup_time, 'date'):
                                base_date = instance.pickup_time.date()
            except (AttributeError, TypeError):
                pass
            value = datetime.combine(base_date, value)
        # Now handle as normal datetime
        return super().to_representation(value)


class DeliverySerializer(serializers.ModelSerializer):
    dropoff_time = FlexibleDateTimeField()
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
    food_item = serializers.SlugRelatedField(
        slug_field="food_id",
        queryset=FoodItem.objects.all(),
        allow_null=True,
        required=False,
    )
    delivery_quantity = serializers.CharField(required=False, allow_null=True, max_length=50)

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
            "food_item",
            "delivery_quantity",
        ]
        read_only_fields = ["delivery_id"]

    def to_representation(self, instance):
        """Convert time objects to datetime for backward compatibility"""
        # Get the base representation
        ret = super().to_representation(instance)
        
        # Handle dropoff_time if it's still a time object (for backward compatibility)
        # This can happen if the instance hasn't been refreshed from DB after migration
        if hasattr(instance, 'dropoff_time'):
            dropoff_value = instance.dropoff_time
            if isinstance(dropoff_value, time):
                # Convert time to datetime using pickup_time date
                if hasattr(instance, 'pickup_time') and instance.pickup_time:
                    if isinstance(instance.pickup_time, datetime):
                        base_date = instance.pickup_time.date()
                    else:
                        base_date = datetime.now().date()
                else:
                    base_date = datetime.now().date()
                combined_datetime = datetime.combine(base_date, dropoff_value)
                ret['dropoff_time'] = combined_datetime.isoformat()
        
        return ret

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

    def validate_delivery_quantity(self, value):
        """Validate delivery quantity"""
        if value is not None and value.strip() == "":
            raise serializers.ValidationError("Delivery quantity cannot be empty")
        return value

    def validate(self, attrs):
        """Validate food_item and delivery_quantity together"""
        instance = getattr(self, "instance", None)
        delivery_type = attrs.get("delivery_type") or getattr(instance, "delivery_type", None)
        warehouse = attrs.get("warehouse_id")
        user = attrs.get("user_id")
        donation = attrs.get("donation_id")
        community = attrs.get("community_id")
        food_item = attrs.get("food_item")
        delivery_quantity = attrs.get("delivery_quantity")

        if warehouse is None and instance is not None:
            warehouse = instance.warehouse_id
        if user is None and instance is not None:
            user = instance.user_id
        if donation is None and instance is not None:
            donation = instance.donation_id
        if community is None and instance is not None:
            community = instance.community_id
        if food_item is None and instance is not None:
            food_item = instance.food_item
        if delivery_quantity is None and instance is not None:
            delivery_quantity = instance.delivery_quantity

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
            
            # Validate food item and quantity for distribution (only if provided)
            # Note: food_item and delivery_quantity are optional for backward compatibility
            if food_item and delivery_quantity:
                # Extract numeric quantity from string (e.g., "25.67 กรัม" -> 25.67, "15 kg" -> 15)
                try:
                    import re
                    # Match number (integer or float) at the start of the string
                    quantity_match = re.search(r'^(\d+(?:\.\d+)?)', str(delivery_quantity).strip())
                    if not quantity_match:
                        errors["delivery_quantity"] = f"Invalid quantity format: '{delivery_quantity}'. Please include a number."
                    else:
                        quantity = float(quantity_match.group(1))
                        quantity_int = int(round(quantity))
                        if quantity_int > food_item.quantity:
                            errors["delivery_quantity"] = f"Quantity ({quantity_int}) exceeds available quantity ({food_item.quantity}) for {food_item.name}"
                except (ValueError, AttributeError):
                    errors["delivery_quantity"] = f"Invalid quantity format: '{delivery_quantity}'"
        else:
            errors["delivery_type"] = "Unknown delivery type."

        if errors:
            raise serializers.ValidationError(errors)

        return attrs

    def to_representation(self, instance):
        """Convert time objects to datetime for backward compatibility"""
        data = super().to_representation(instance)
        
        # Handle dropoff_time if it's still a time object (for backward compatibility)
        if hasattr(instance, 'dropoff_time'):
            dropoff_value = instance.dropoff_time
            if isinstance(dropoff_value, time):
                # Convert time to datetime using pickup_time date
                if hasattr(instance, 'pickup_time') and instance.pickup_time:
                    base_date = instance.pickup_time.date() if isinstance(instance.pickup_time, datetime) else datetime.now().date()
                else:
                    base_date = datetime.now().date()
                combined_datetime = datetime.combine(base_date, dropoff_value)
                data['dropoff_time'] = combined_datetime.isoformat()
        
        return data
