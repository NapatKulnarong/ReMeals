from datetime import datetime, time, timedelta

from django.db import models
from django.utils import timezone as django_timezone
from warehouse.models import Warehouse
from community.models import Community
from donation.models import Donation
from users.models import User
from fooditem.models import FoodItem
from re_meals_api.id_utils import generate_prefixed_id


class Delivery(models.Model):
    PREFIX = "DLV"

    DELIVERY_TYPE_CHOICES = [
        ("donation", "Donation"),
        ("distribution", "Distribution"),
    ]
    PICKUP_LOCATION_CHOICES = [
        ("restaurant", "Restaurant"),
        ("warehouse", "Warehouse"),
    ]
    DROPOFF_LOCATION_CHOICES = [
        ("warehouse", "Warehouse"),
        ("community", "Community"),
    ]

    delivery_id = models.CharField(max_length=10, primary_key=True)
    delivery_type = models.CharField(max_length=20, choices=DELIVERY_TYPE_CHOICES)
    pickup_time = models.DateTimeField()
    dropoff_time = models.DateTimeField()
    pickup_location_type = models.CharField(max_length=20, choices=PICKUP_LOCATION_CHOICES)
    dropoff_location_type = models.CharField(max_length=20, choices=DROPOFF_LOCATION_CHOICES)
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("in_transit", "In transit"),
        ("delivered", "Delivered"),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    notes = models.TextField(blank=True, default="")

    warehouse_id = models.ForeignKey(
        Warehouse,
        on_delete=models.PROTECT,
        related_name="deliveries",
        null=True,
        blank=True,
    )

    user_id = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="deliveries",
        null=True,
        blank=True,
    )

    donation_id = models.ForeignKey(
        Donation,
        on_delete=models.SET_NULL,
        related_name="deliveries",
        null=True,
        blank=True,
    )

    community_id = models.ForeignKey(
        Community,
        on_delete=models.PROTECT,
        related_name="deliveries",
        null=True,
        blank=True,
    )
    
    # Food item being delivered and its quantity
    food_item = models.ForeignKey(
        FoodItem,
        on_delete=models.PROTECT,
        related_name="deliveries",
        null=True,
        blank=True,
        db_column="food_id",
        help_text="Food item being delivered"
    )
    delivery_quantity = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        help_text="Quantity of food item being delivered (e.g., '15 kg', '8 bucket')"
    )

    def __str__(self):
        return f"Delivery {self.delivery_id} ({self.delivery_type})"
    
    def update_food_item_quantity(self):
        """Update food item quantity when delivery is created"""
        if not self.food_item or not self.delivery_quantity:
            return
        
        # Extract numeric quantity from string (e.g., "25.67 กรัม" -> 25.67, "15 kg" -> 15)
        # Support both integer and float values
        try:
            import re
            # Match number (integer or float) at the start of the string
            quantity_match = re.search(r'^(\d+(?:\.\d+)?)', str(self.delivery_quantity).strip())
            if not quantity_match:
                raise ValueError(f"Could not extract quantity from '{self.delivery_quantity}'")
            quantity = float(quantity_match.group(1))
            # Round to integer for FoodItem.quantity (which is IntegerField)
            quantity_int = int(round(quantity))
        except (ValueError, AttributeError) as e:
            raise ValueError(f"Invalid delivery quantity format: '{self.delivery_quantity}'") from e
        
        if quantity_int > self.food_item.quantity:
            raise ValueError(
                f"Delivery quantity ({quantity_int}) exceeds available quantity ({self.food_item.quantity}) for {self.food_item.name}"
            )
        
        self.food_item.quantity -= quantity_int
        self.food_item.save()

    def save(self, *args, **kwargs):
        if not self.delivery_id:
            self.delivery_id = generate_prefixed_id(
                self.__class__,
                "delivery_id",
                self.PREFIX,
                padding=7,
            )
        # Convert timedelta to datetime if needed (for backward compatibility)
        if isinstance(self.dropoff_time, timedelta):
            # Convert timedelta to datetime by adding it to pickup_time or current time
            if hasattr(self, 'pickup_time') and self.pickup_time:
                self.dropoff_time = self.pickup_time + self.dropoff_time
            else:
                base_time = django_timezone.now()
                self.dropoff_time = base_time + self.dropoff_time
        # Convert time to datetime if needed (for backward compatibility)
        elif isinstance(self.dropoff_time, time):
            # If pickup_time exists, use its date; otherwise use today
            if hasattr(self, 'pickup_time') and self.pickup_time:
                if isinstance(self.pickup_time, datetime):
                    base_date = self.pickup_time.date()
                else:
                    base_date = django_timezone.now().date()
            else:
                base_date = django_timezone.now().date()
            combined = datetime.combine(base_date, self.dropoff_time)
            # Make timezone-aware
            self.dropoff_time = django_timezone.make_aware(combined)
        
        # Handle quantity updates for existing deliveries
        is_update = self.pk is not None
        if is_update:
            # Get the old instance from database before save
            try:
                old_instance = Delivery.objects.get(pk=self.pk)
                old_food_item = old_instance.food_item
                old_delivery_quantity = old_instance.delivery_quantity
                new_food_item = self.food_item
                new_delivery_quantity = self.delivery_quantity
                
                # If food item changed, return old quantity to old food item
                # (Note: This is also handled in views.py, but we do it here as a safety net)
                if old_food_item and old_delivery_quantity and new_food_item and old_food_item != new_food_item:
                    # Old quantity was already returned in views.py, just deduct new quantity
                    if new_delivery_quantity:
                        self.update_food_item_quantity()
                # If same food item but quantity changed, adjust the quantity
                elif old_food_item and new_food_item and old_food_item == new_food_item:
                    if old_delivery_quantity != new_delivery_quantity and new_delivery_quantity:
                        try:
                            import re
                            old_match = re.search(r'^(\d+(?:\.\d+)?)', str(old_delivery_quantity).strip())
                            new_match = re.search(r'^(\d+(?:\.\d+)?)', str(new_delivery_quantity).strip())
                            if old_match and new_match:
                                old_quantity = float(old_match.group(1))
                                new_quantity = float(new_match.group(1))
                                old_quantity_int = int(round(old_quantity))
                                new_quantity_int = int(round(new_quantity))
                                # Return old quantity and deduct new quantity
                                new_food_item.quantity += old_quantity_int - new_quantity_int
                                new_food_item.save()
                        except (ValueError, AttributeError):
                            pass
                    # If quantity didn't change, no update needed
                elif new_food_item and new_delivery_quantity:
                    # New food item assigned (old was None), deduct quantity
                    self.update_food_item_quantity()
            except Delivery.DoesNotExist:
                # New delivery, just deduct quantity
                pass
        
        super().save(*args, **kwargs)
        
        # Update food item quantity if this is a new delivery (after save to ensure pk exists)
        if not is_update and not hasattr(self, '_quantity_updated') and self.food_item and self.delivery_quantity:
            self.update_food_item_quantity()
            self._quantity_updated = True
