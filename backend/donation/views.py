from datetime import datetime

from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime
from rest_framework import status, viewsets
from rest_framework.response import Response

from .models import Donation
from .serializers import DonationSerializer
from users.models import User


def _parse_datetime_param(value):
    if not value:
        return None

    dt = parse_datetime(value)
    if dt is None:
        date_only = parse_date(value)
        if date_only:
            dt = datetime.combine(date_only, datetime.min.time())

    if dt is not None and timezone.is_naive(dt):
        dt = timezone.make_aware(dt)

    return dt


class DonationViewSet(viewsets.ModelViewSet):
    queryset = Donation.objects.select_related("restaurant").all()
    serializer_class = DonationSerializer

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

    def _can_manage(self, donation):
        if self._is_admin():
            return True
        request_user = self._get_request_user()
        if not request_user:
            return False
        # If created_by is not set (legacy donations), allow logged-in users to manage
        if donation.created_by_id is None:
            return True
        # Otherwise, must be the owner
        return donation.created_by_id == request_user.user_id

    def _ensure_manageable(self, donation):
        if donation.status != "pending":
            return Response(
                {"detail": "Only pending donations can be modified or deleted."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not self._can_manage(donation):
            return Response(
                {"detail": "You do not have permission to modify this donation."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return None

    def get_queryset(self):
        qs = Donation.objects.select_related("restaurant").all()
        params = self.request.query_params

        restaurant_id = params.get("restaurant_id")
        status_param = params.get("status")
        date_from = _parse_datetime_param(params.get("date_from"))
        date_to = _parse_datetime_param(params.get("date_to"))

        if restaurant_id:
            qs = qs.filter(restaurant__restaurant_id=restaurant_id)

        if status_param is not None:
            status_param = status_param.lower()
            # Support both new enum values and legacy boolean values for backward compatibility
            if status_param in ["pending", "accepted", "declined"]:
                qs = qs.filter(status=status_param)
            elif status_param in ["true", "1", "completed"]:
                qs = qs.filter(status="accepted")
            elif status_param in ["false", "0"]:
                qs = qs.filter(status="pending")
            else:
                return qs.none()

        if date_from:
            qs = qs.filter(donated_at__gte=date_from)

        if date_to:
            qs = qs.filter(donated_at__lte=date_to)

        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self._get_request_user())

    def update(self, request, *args, **kwargs):
        donation = self.get_object()

        permission_error = self._ensure_manageable(donation)
        if permission_error:
            return permission_error

        if "restaurant" in request.data:
            new_restaurant = request.data.get("restaurant")
            if new_restaurant != donation.restaurant.restaurant_id:
                return Response({"detail": "Cannot change restaurant of donation."}, status=400)

        if "donation_id" in request.data:
            if request.data.get("donation_id") != donation.donation_id:
                return Response({"detail": "Cannot change donation_id."}, status=400)

        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        donation = self.get_object()

        permission_error = self._ensure_manageable(donation)
        if permission_error:
            return permission_error

        if "restaurant" in request.data:
            new_restaurant = request.data.get("restaurant")
            if new_restaurant != donation.restaurant.restaurant_id:
                return Response({"detail": "Cannot change restaurant of donation."}, status=400)

        if "donation_id" in request.data:
            if request.data.get("donation_id") != donation.donation_id:
                return Response({"detail": "Cannot change donation_id."}, status=400)

        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        donation = self.get_object()
        permission_error = self._ensure_manageable(donation)
        if permission_error:
            return permission_error
        return super().destroy(request, *args, **kwargs)
