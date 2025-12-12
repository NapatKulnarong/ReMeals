from datetime import datetime

from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime
from rest_framework import viewsets
from rest_framework.response import Response

from .models import Donation
from .serializers import DonationSerializer


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

    def update(self, request, *args, **kwargs):
        donation = self.get_object()

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

        if "restaurant" in request.data:
            new_restaurant = request.data.get("restaurant")
            if new_restaurant != donation.restaurant.restaurant_id:
                return Response({"detail": "Cannot change restaurant of donation."}, status=400)

        if "donation_id" in request.data:
            if request.data.get("donation_id") != donation.donation_id:
                return Response({"detail": "Cannot change donation_id."}, status=400)

        return super().partial_update(request, *args, **kwargs)
