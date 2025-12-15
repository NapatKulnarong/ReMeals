from django.db.models import Q
from rest_framework import status as drf_status, viewsets
from rest_framework.response import Response
import uuid

from impactrecord.models import ImpactRecord
from fooditem.models import FoodItem
from donation.models import Donation
from .models import Delivery
from .serializers import DeliverySerializer
from users.models import Donor, Recipient


def _str_to_bool(value):
    return str(value).lower() in ["true", "1", "yes"]


class DeliveryViewSet(viewsets.ModelViewSet):
    queryset = Delivery.objects.select_related(
        "warehouse_id",
        "user_id",
        "donation_id",
        "community_id",
    ).all()
    serializer_class = DeliverySerializer

    def get_queryset(self):
        qs = super().get_queryset()
        is_admin = _str_to_bool(self.request.headers.get("X-USER-IS-ADMIN"))
        is_driver = _str_to_bool(self.request.headers.get("X-USER-IS-DELIVERY"))
        user_id = self.request.headers.get("X-USER-ID")

        delivery_type = self.request.query_params.get("delivery_type")
        if delivery_type:
            qs = qs.filter(delivery_type=delivery_type)

        if is_admin:
            return qs
        if is_driver and user_id:
            return qs.filter(user_id__user_id=user_id)
        if user_id:
            donor_restaurant_ids = list(
                Donor.objects.filter(user__user_id=user_id)
                .values_list("restaurant_id__restaurant_id", flat=True)
                .distinct()
            )
            donation_filter = Q(delivery_type="donation")
            if donor_restaurant_ids:
                donation_filter &= Q(
                    donation_id__restaurant__restaurant_id__in=donor_restaurant_ids
                )
            else:
                donation_filter &= Q(pk__isnull=True)

            requested_communities = list(
                Recipient.objects.filter(
                    user__user_id=user_id,
                    donation_request__community__isnull=False,
                )
                .values_list("donation_request__community__community_id", flat=True)
                .distinct()
            )
            community_filter = Q()
            if requested_communities:
                community_filter = Q(
                    delivery_type="distribution",
                    community_id__community_id__in=requested_communities,
                )
            
            # Allow read access to delivered distribution deliveries for impact visualization
            # This is public impact data that should be visible to all authenticated users
            public_impact_filter = Q(
                delivery_type="distribution",
                status="delivered",
                food_item__isnull=False
            )
            
            return qs.filter(donation_filter | community_filter | public_impact_filter)
        
        # For unauthenticated users, allow read access to delivered distribution deliveries
        # This enables the public heatmap to work
        return qs.filter(
            delivery_type="distribution",
            status="delivered",
            food_item__isnull=False
        )

    def create(self, request, *args, **kwargs):
        if not _str_to_bool(request.headers.get("X-USER-IS-ADMIN")):
            return Response({"detail": "Admin privileges required."}, status=403)
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        if not _str_to_bool(request.headers.get("X-USER-IS-ADMIN")):
            return Response({"detail": "Admin privileges required."}, status=403)
        instance = self.get_object()
        
        # Before updating, return old quantity to old food item if food_item is being changed
        old_food_item = instance.food_item
        old_delivery_quantity = instance.delivery_quantity
        new_food_item_id = request.data.get("food_item")
        
        if old_food_item and old_delivery_quantity and new_food_item_id:
            # Check if food item is actually changing
            if str(old_food_item.food_id) != str(new_food_item_id):
                # Return old quantity to old food item
                try:
                    import re
                    quantity_match = re.search(r'^(\d+(?:\.\d+)?)', str(old_delivery_quantity).strip())
                    if quantity_match:
                        old_quantity = float(quantity_match.group(1))
                        old_quantity_int = int(round(old_quantity))
                        old_food_item.quantity += old_quantity_int
                        old_food_item.save()
                except (ValueError, AttributeError):
                    pass
        
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if not _str_to_bool(request.headers.get("X-USER-IS-ADMIN")):
            return Response({"detail": "Admin privileges required."}, status=403)
        return super().destroy(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        is_admin = _str_to_bool(request.headers.get("X-USER-IS-ADMIN"))
        is_driver = _str_to_bool(request.headers.get("X-USER-IS-DELIVERY"))
        user_id = request.headers.get("X-USER-ID")

        if not is_admin:
            if not (is_driver and user_id and instance.user_id and instance.user_id.user_id == user_id):
                return Response({"detail": "Not permitted."}, status=403)
            allowed_fields = {"status", "notes", "dropoff_time"}
            data = {k: v for k, v in request.data.items() if k in allowed_fields}
            if not data:
                return Response(
                    {"detail": "No updatable fields provided."},
                    status=drf_status.HTTP_400_BAD_REQUEST,
                )
        else:
            # Admin can update all fields including food_item and delivery_quantity
            data = request.data
            
            # Before updating, return old quantity to old food item if food_item is being changed
            if "food_item" in data:
                old_food_item = instance.food_item
                old_delivery_quantity = instance.delivery_quantity
                new_food_item_id = data.get("food_item")
                
                if old_food_item and old_delivery_quantity and new_food_item_id:
                    # Check if food item is actually changing
                    if str(old_food_item.food_id) != str(new_food_item_id):
                        # Return old quantity to old food item
                        try:
                            import re
                            quantity_match = re.search(r'^(\d+(?:\.\d+)?)', str(old_delivery_quantity).strip())
                            if quantity_match:
                                old_quantity = float(quantity_match.group(1))
                                old_quantity_int = int(round(old_quantity))
                                old_food_item.quantity += old_quantity_int
                                old_food_item.save()
                        except (ValueError, AttributeError):
                            pass
        
        serializer = self.get_serializer(instance, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        updated = serializer.instance
        if updated.status == "delivered":
            self._create_impact_records(updated)
            # Automatically update donation status to "accepted" when delivery is marked as "delivered"
            if updated.delivery_type == "donation" and updated.donation_id:
                donation = updated.donation_id
                if donation.status == "pending":
                    donation.status = "accepted"
                    donation.save(update_fields=["status"])

        return Response(serializer.data)

    def _create_impact_records(self, delivery: Delivery):
        """
        Create impact records for all food items in a delivered donation.
        Uses the same calculation logic as FoodItemViewSet for consistency.
        """
        donation = delivery.donation_id
        if not donation:
            return
        
        from impactrecord.models import ImpactRecord
        
        items = FoodItem.objects.filter(donation=donation, is_distributed=True)
        for item in items:
            # Check if impact record already exists for this food item
            if ImpactRecord.objects.filter(food=item).exists():
                continue  # Skip if already exists
            
            # Use same calculation as FoodItemViewSet for consistency
            MEAL_FACTOR = 0.5
            WEIGHT_FACTOR = 0.2
            CO2_FACTOR = 2.5

            meals_saved = item.quantity * MEAL_FACTOR
            weight_saved = item.quantity * WEIGHT_FACTOR
            co2_saved = weight_saved * CO2_FACTOR

            # Don't set impact_id - let the model generate it automatically
            ImpactRecord.objects.create(
                meals_saved=meals_saved,
                weight_saved_kg=weight_saved,
                co2_reduced_kg=co2_saved,
                food=item,
            )
