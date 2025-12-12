from rest_framework import viewsets, permissions

from .models import DonationRequest
from .serializers import DonationRequestSerializer


class DonationRequestViewSet(viewsets.ModelViewSet):
    queryset = DonationRequest.objects.all()
    serializer_class = DonationRequestSerializer
    permission_classes = [permissions.AllowAny]
