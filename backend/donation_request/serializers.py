from rest_framework import serializers

from community.models import Community
from .models import DonationRequest


class DonationRequestSerializer(serializers.ModelSerializer):
    request_id = serializers.CharField(read_only=True)
    community_id = serializers.PrimaryKeyRelatedField(
        queryset=Community.objects.all(),
        source="community",
        write_only=True,
    )
    community_name = serializers.CharField()

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
            "community_id",
        ]
        read_only_fields = ["created_at", "request_id"]
