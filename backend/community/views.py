from rest_framework import viewsets, permissions
from .models import Community
from .serializers import CommunitySerializer

class CommunityViewSet(viewsets.ModelViewSet):
    queryset = Community.objects.all()
    serializer_class = CommunitySerializer
    permission_classes = [permissions.IsAuthenticated]
