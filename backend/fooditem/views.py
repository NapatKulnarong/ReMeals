from django.http import QueryDict
from django.http import QueryDict
from rest_framework import viewsets
from rest_framework.response import Response

from .models import FoodItem
from .serializers import FoodItemSerializer
from impactrecord.models import ImpactRecord


class FoodItemViewSet(viewsets.ModelViewSet):
    serializer_class = FoodItemSerializer

    def get_queryset(self):
        """
        Returns a filtered queryset based on query parameters.
        Supports filtering by donation, is_expired, is_claimed, is_distributed.
        """
        queryset = FoodItem.objects.all()
        params = self.request.query_params

        # Filter by donation ID
        donation_id = params.get("donation")
        if donation_id:
            queryset = queryset.filter(donation__donation_id=donation_id)

        # Filter by expiration status
        is_expired = params.get("is_expired")
        if is_expired is not None:
            queryset = queryset.filter(is_expired=(is_expired.lower() == "true"))

        # Filter by claimed status
        is_claimed = params.get("is_claimed")
        if is_claimed is not None:
            queryset = queryset.filter(is_claimed=(is_claimed.lower() == "true"))

        # Filter by distributed status
        is_distributed = params.get("is_distributed")
        if is_distributed is not None:
            queryset = queryset.filter(is_distributed=(is_distributed.lower() == "true"))

        return queryset

    #   UPDATE METHODS
    #   Always perform partial updates, and detect when an item is
    #   distributed for the first time in order to create an ImpactRecord.
    def update(self, request, *args, **kwargs):
        """
        Override update() to always use partial updates and to detect
        the moment when an item becomes distributed for the first time.
        """
        kwargs["partial"] = True
        instance = self.get_object()
        was_distributed = instance.is_distributed

        data = self._prepare_payload(request.data, instance)
        serializer = self.get_serializer(instance, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        response = Response(serializer.data)

        # Reload the updated instance
        instance.refresh_from_db()

        # If item has just been distributed for the first time → create impact record
        if instance.is_distributed and not was_distributed:
            self._create_impact_record(instance)

        return response


    def partial_update(self, request, *args, **kwargs):
        """
        Redirect PATCH to our custom update() so distribution logic runs.
        """
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    def _prepare_payload(self, data, instance):
        """
        Make request data mutable and auto-claim when distributing.
        """
        if isinstance(data, QueryDict):
            payload = data.copy()
        else:
            payload = data.copy() if hasattr(data, "copy") else dict(data)

        if "is_distributed" in payload and "is_claimed" not in payload:
            raw_value = payload["is_distributed"]
            if isinstance(raw_value, str):
                desired = raw_value.lower() in ("true", "1", "yes")
            else:
                desired = bool(raw_value)

            if desired and not instance.is_claimed:
                payload["is_claimed"] = True

        return payload

    #   INTERNAL HELPER — Create ImpactRecord
    #   Generates a historical snapshot of impact when an item is distributed.
    def _create_impact_record(self, item):
        """
        Create an ImpactRecord the first time the food item becomes distributed.
        Impact values are constant based on quantity — not on food attributes.
        """
        from impactrecord.models import ImpactRecord
        
        # Check if impact record already exists for this food item
        if ImpactRecord.objects.filter(food=item).exists():
            return  # Don't create duplicate

        # Constants (fixed coefficients)
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
            food=item
        )
