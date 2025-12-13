from rest_framework import permissions, viewsets
from rest_framework.exceptions import PermissionDenied

from .models import DonationRequest
from .serializers import DonationRequestSerializer
from users.models import User


class DonationRequestViewSet(viewsets.ModelViewSet):
    queryset = DonationRequest.objects.select_related("created_by").all()
    serializer_class = DonationRequestSerializer
    permission_classes = [permissions.AllowAny]

    def _str_to_bool(self, value):
        if value is None:
            return False
        return str(value).lower() in {"true", "1", "yes"}

    def _get_request_user(self):
        user_id = self.request.headers.get("X-USER-ID")
        if not user_id:
            return None
        return User.objects.filter(user_id=user_id).first()

    def _is_admin(self):
        return self._str_to_bool(self.request.headers.get("X-USER-IS-ADMIN"))

    def get_queryset(self):
        return DonationRequest.objects.select_related("created_by").all()

    def perform_create(self, serializer):
        user = self._get_request_user()
        if not user:
            raise PermissionDenied("Login required to submit meal requests.")
        serializer.save(created_by=user)

    def _ensure_can_manage(self, instance):
        if self._is_admin():
            return
        user = self._get_request_user()
        if not user or instance.created_by_id != user.user_id:
            raise PermissionDenied("You do not have permission to modify this request.")

    def perform_update(self, serializer):
        self._ensure_can_manage(serializer.instance)
        serializer.save()

    def perform_destroy(self, instance):
        self._ensure_can_manage(instance)
        super().perform_destroy(instance)
