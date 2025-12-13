from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework import status as drf_status

from .models import Delivery
from .serializers import DeliverySerializer
from impactrecord.models import ImpactRecord
from fooditem.models import FoodItem
import uuid


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
        donation = delivery.donation_id
        if not donation:
            return
        items = FoodItem.objects.filter(donation=donation)
        for item in items:
            if hasattr(item, "impact"):
                continue
            ImpactRecord.objects.create(
                impact_id=uuid.uuid4().hex[:10].upper(),
                meals_saved=item.quantity,
                weight_saved_kg=item.quantity,
                co2_reduced_kg=0.0,
                food=item,
            )
