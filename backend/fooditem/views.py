from rest_framework import viewsets
from .models import FoodItem
from .serializers import FoodItemSerializer

class FoodItemViewSet(viewsets.ModelViewSet):
    serializer_class = FoodItemSerializer

    def get_queryset(self):
        queryset = FoodItem.objects.all()
        params = self.request.query_params

        # Filter by donation
        donation_id = params.get("donation")
        if donation_id:
            queryset = queryset.filter(donation__donation_id=donation_id)

        # Filter by is_expired=true/false
        is_expired = params.get("is_expired")
        if is_expired is not None:
            if is_expired.lower() == "true":
                queryset = queryset.filter(is_expired=True)
            elif is_expired.lower() == "false":
                queryset = queryset.filter(is_expired=False)

        # Filter by is_claimed=true/false
        is_claimed = params.get("is_claimed")
        if is_claimed is not None:
            if is_claimed.lower() == "true":
                queryset = queryset.filter(is_claimed=True)
            elif is_claimed.lower() == "false":
                queryset = queryset.filter(is_claimed=False)

        # Filter by is_distributed=true/false
        is_distributed = params.get("is_distributed")
        if is_distributed is not None:
            if is_distributed.lower() == "true":
                queryset = queryset.filter(is_distributed=True)
            elif is_distributed.lower() == "false":
                queryset = queryset.filter(is_distributed=False)

        return queryset
    
    def update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return super().partial_update(request, *args, **kwargs)