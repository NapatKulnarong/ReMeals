from rest_framework import viewsets, permissions
from .models import Community
from .serializers import CommunitySerializer

class CommunityViewSet(viewsets.ModelViewSet):
    queryset = Community.objects.all()
    serializer_class = CommunitySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        warehouse_id = self.request.query_params.get("warehouse_id")
        if warehouse_id:
            queryset = queryset.filter(warehouse_id__warehouse_id=warehouse_id)
        return queryset
