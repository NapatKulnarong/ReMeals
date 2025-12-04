from rest_framework import viewsets, permissions

from .models import Delivery
from .serializers import DeliverySerializer

class DeliveryViewSet(viewsets.ModelViewSet):
    queryset = Delivery.objects.select_related(
        "warehouse_id",
        "user_id",
        "donation_id",
        "community_id",
    ).all()
    serializer_class = DeliverySerializer
    permission_classes = [permissions.IsAuthenticated]
