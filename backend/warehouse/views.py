from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Warehouse
from .serializers import WarehouseSerializer
from fooditem.models import FoodItem
from fooditem.serializers import FoodItemSerializer
from delivery.models import Delivery


class WarehouseViewSet(viewsets.ModelViewSet):
    queryset = Warehouse.objects.all()
    serializer_class = WarehouseSerializer
    permission_classes = [permissions.AllowAny]

    @action(detail=True, methods=['get'], url_path='inventory')
    def inventory(self, request, pk=None):
        """
        Get all food items currently in this warehouse.
        Returns items that are:
        - Delivered to this warehouse (via completed deliveries)
        - Not expired
        - Not distributed to community
        """
        warehouse = self.get_object()
        today = timezone.now().date()

        # Find all deliveries that brought food to this warehouse and are completed
        delivered_to_warehouse = Delivery.objects.filter(
            warehouse_id=warehouse,
            dropoff_location_type='warehouse',
            status='delivered'
        ).values_list('donation_id', flat=True)

        # Get food items from those donations that are:
        # - Not expired
        # - Not distributed to community
        food_items = FoodItem.objects.filter(
            donation__donation_id__in=delivered_to_warehouse,
            is_distributed=False,
            expire_date__gte=today
        ).select_related('donation', 'donation__restaurant')

        # Also update expired items
        expired_items = FoodItem.objects.filter(
            donation__donation_id__in=delivered_to_warehouse,
            is_distributed=False,
            expire_date__lt=today,
            is_expired=False
        )
        expired_items.update(is_expired=True)

        serializer = FoodItemSerializer(food_items, many=True)

        return Response({
            'warehouse_id': warehouse.warehouse_id,
            'warehouse_address': warehouse.address,
            'total_items': food_items.count(),
            'inventory': serializer.data
        })
