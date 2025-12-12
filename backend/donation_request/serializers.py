from rest_framework import serializers

from .models import DonationRequest


class DonationRequestSerializer(serializers.ModelSerializer):
    request_id = serializers.CharField(read_only=True)

    class Meta:
        model = DonationRequest
        fields = [
            "request_id",
            "title",
            "community_name",
            "recipient_address",
            "expected_delivery",
            "people_count",
            "contact_phone",
            "notes",
            "created_at",
        ]
        read_only_fields = ["created_at", "request_id"]
