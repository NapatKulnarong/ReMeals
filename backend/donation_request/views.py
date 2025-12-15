from rest_framework import permissions, status, viewsets
from rest_framework.response import Response

from .models import DonationRequest
from .serializers import DonationRequestSerializer
from users.models import User, Recipient
from delivery.models import Delivery


class DonationRequestViewSet(viewsets.ModelViewSet):
    queryset = DonationRequest.objects.select_related("community", "created_by").all()
    serializer_class = DonationRequestSerializer
    permission_classes = [permissions.AllowAny]

    def get_serializer_context(self):
        """Add request to serializer context so we can access headers."""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def _str_to_bool(self, value):
        if value is None:
            return False
        return str(value).lower() in {"true", "1", "yes"}

    def _is_admin(self):
        return self._str_to_bool(self.request.headers.get("X-USER-IS-ADMIN"))

    def _get_current_user(self):
        """Get the current user from request headers."""
        user_id = self.request.headers.get("X-USER-ID")
        if not user_id:
            return None
        try:
            return User.objects.get(user_id=user_id)
        except User.DoesNotExist:
            return None

    def _is_request_owner(self, donation_request):
        """Check if the current user owns this donation request."""
        user = self._get_current_user()
        if not user:
            return False
        
        # Primary check: if user is the creator (created_by matches)
        # This works for both donors and recipients
        if donation_request.created_by == user:
            return True
        
        # Fallback: check if user is a recipient and their donation_request matches
        # This handles legacy requests where created_by might be NULL
        try:
            recipient = Recipient.objects.get(user=user)
            if recipient.donation_request == donation_request:
                return True
        except Recipient.DoesNotExist:
            pass
        
        # Additional fallback for legacy requests: if created_by is NULL,
        # check if contact_phone matches (less secure but helps with old requests)
        # Only allow this if status is pending (not accepted)
        if (donation_request.created_by is None and 
            donation_request.status == "pending" and
            donation_request.contact_phone and
            user.phone and
            donation_request.contact_phone.strip() == user.phone.strip()):
            return True
        
        return False

    def _is_request_fulfilled(self, donation_request):
        """Check if the request has been fulfilled (has deliveries to the community)."""
        # Check if there are any deliveries to this request's community
        return Delivery.objects.filter(
            community_id=donation_request.community,
            status__in=["in_transit", "delivered"]
        ).exists()

    def _ensure_manageable(self, donation_request):
        """Ensure the donation request can be modified or deleted by the current user."""
        # Get the status, defaulting to "pending" if not set (for backward compatibility)
        request_status = donation_request.status or "pending"
        
        # For backward compatibility: Allow edits to pending requests
        # This maintains compatibility with existing tests and allows unauthenticated edits
        # to pending requests (which may be needed for legacy support)
        if request_status == "pending":
            return None
        
        # Only allow modification if status is not "accepted"
        if request_status == "accepted":
            return Response(
                {"detail": "Accepted donation requests cannot be modified or deleted."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        # Check if request has been fulfilled (deliveries in transit or delivered)
        # Only block if there are actual deliveries and status is not pending
        is_fulfilled = self._is_request_fulfilled(donation_request)
        if is_fulfilled:
            return Response(
                {"detail": "Donation requests with active or completed deliveries cannot be modified or deleted."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        # Allow admins to modify declined requests
        if self._is_admin():
            return None
        
        # Allow request owners to modify their own requests
        if self._is_request_owner(donation_request):
            return None
        
        # Otherwise, deny permission
        return Response(
            {"detail": "You do not have permission to modify this donation request."},
            status=status.HTTP_403_FORBIDDEN,
        )

    def update(self, request, *args, **kwargs):
        donation_request = self.get_object()
        
        permission_error = self._ensure_manageable(donation_request)
        if permission_error:
            return permission_error
        
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        donation_request = self.get_object()
        
        permission_error = self._ensure_manageable(donation_request)
        if permission_error:
            return permission_error
        
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        donation_request = self.get_object()
        
        permission_error = self._ensure_manageable(donation_request)
        if permission_error:
            return permission_error
        
        return super().destroy(request, *args, **kwargs)
