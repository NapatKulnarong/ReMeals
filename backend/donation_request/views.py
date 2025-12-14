from rest_framework import permissions, viewsets

from .models import DonationRequest
from .serializers import DonationRequestSerializer


class DonationRequestViewSet(viewsets.ModelViewSet):
    queryset = DonationRequest.objects.select_related("community").all()
    serializer_class = DonationRequestSerializer
    permission_classes = [permissions.AllowAny]
