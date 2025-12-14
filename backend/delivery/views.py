from django.db.models import Q
from rest_framework import status as drf_status, viewsets
from rest_framework.response import Response
import uuid

from impactrecord.models import ImpactRecord
from fooditem.models import FoodItem
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
            return qs.filter(donation_filter | community_filter)
        return qs.none()

    def create(self, request, *args, **kwargs):
        if not _str_to_bool(request.headers.get("X-USER-IS-ADMIN")):
            return Response({"detail": "Admin privileges required."}, status=403)
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        if not _str_to_bool(request.headers.get("X-USER-IS-ADMIN")):
            return Response({"detail": "Admin privileges required."}, status=403)
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
        else:
            allowed_fields = {"status", "notes", "dropoff_time"}

        data = {k: v for k, v in request.data.items() if k in allowed_fields}
        if not data:
            return Response(
                {"detail": "No updatable fields provided."},
                status=drf_status.HTTP_400_BAD_REQUEST,
            )
        serializer = self.get_serializer(instance, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        updated = serializer.instance
        if updated.status == "delivered":
            self._create_impact_records(updated)

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
