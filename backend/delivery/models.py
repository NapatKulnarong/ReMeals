from datetime import datetime, time, timedelta

from django.db import models
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
                base_time = datetime.now()
                self.dropoff_time = base_time + self.dropoff_time
        # Convert time to datetime if needed (for backward compatibility)
        elif isinstance(self.dropoff_time, time):
            # If pickup_time exists, use its date; otherwise use today
            if hasattr(self, 'pickup_time') and self.pickup_time:
                base_date = self.pickup_time.date() if isinstance(self.pickup_time, datetime) else datetime.now().date()
            else:
                base_date = datetime.now().date()
            self.dropoff_time = datetime.combine(base_date, self.dropoff_time)
        
        super().save(*args, **kwargs)
        
        # Update food item quantity if this is a new delivery (after save to ensure pk exists)
        if not hasattr(self, '_quantity_updated') and self.food_item and self.delivery_quantity:
            self.update_food_item_quantity()
            self._quantity_updated = True
