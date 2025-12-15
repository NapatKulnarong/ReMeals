from django.utils import timezone
from rest_framework import serializers

from community.models import Community
from warehouse.models import Warehouse
from users.models import User
from .models import DonationRequest


class DonationRequestSerializer(serializers.ModelSerializer):
    request_id = serializers.CharField(read_only=True)
    community_id = serializers.PrimaryKeyRelatedField(
        queryset=Community.objects.all(),
        source="community",
        write_only=True,
        required=False,
        allow_null=True,
    )
    
    def validate(self, attrs):
        """Validate that community_id or community_name is provided."""
        # Check if community_id was in the original request data
        initial_data = getattr(self, 'initial_data', {})
        community_id_in_request = "community_id" in initial_data
        community_name_in_request = "community_name" in initial_data
        community = attrs.get("community")
        community_name = attrs.get("community_name", "").strip()
        
        # If community_id was explicitly provided in the request (even if None), it must be valid
        if community_id_in_request and not community:
            raise serializers.ValidationError({
                "community_id": "Invalid community_id provided."
            })
        
        # For CREATE operations: require either community_id or community_name
        if self.instance is None:
            if not community_id_in_request and not community_name_in_request:
                # Neither community_id nor community_name provided
                raise serializers.ValidationError({
                    "community_id": "Either community_id or community_name is required."
                })
            # If only community_name is provided, it will be auto-created in create() method
            # If only community_id is provided, it must be valid (checked above)
        
        return attrs
    community_name = serializers.CharField(required=False)

    created_by_user_id = serializers.CharField(source='created_by.user_id', read_only=True, allow_null=True)

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
            "created_by_user_id",
            "status",
        ]
        read_only_fields = ["created_at", "request_id", "created_by_user_id"]

    def create(self, validated_data):
        community = validated_data.get("community")
        community_name = validated_data.get("community_name", "").strip()
        
        # If community_id is provided and valid, use it
        if community:
            validated_data["community"] = community
        elif community_name:
            # Auto-creation: if community_id is not provided but community_name is,
            # try to find or create the community
            # Try to find existing community by name first (case-insensitive)
            community = Community.objects.filter(name__iexact=community_name).first()
            
            # If not found, create a new community with auto-generated ID (using prefix/suffix)
            if not community:
                # Get or create a default warehouse (use first available or create one)
                warehouse = Warehouse.objects.first()
                if not warehouse:
                    # Create a default warehouse if none exists
                    from datetime import date, timedelta
                    warehouse = Warehouse.objects.create(
                        address="Default Warehouse",
                        capacity=1000.0,
                        stored_date=date.today(),
                        exp_date=date.today() + timedelta(days=365),
                    )
                
                # Create new community with auto-generated ID using prefix "COM" and suffix
                # The save() method in Community model will automatically generate the ID
                community = Community.objects.create(
                    name=community_name,
                    address=validated_data.get("recipient_address", community_name),
                    received_time=timezone.now(),
                    population=validated_data.get("people_count", 100),
                    warehouse_id=warehouse,
                )
            
            validated_data["community"] = community
        else:
            # This should not happen due to validate() method, but keep as fallback
            raise serializers.ValidationError({
                "community_id": "Either community_id or community_name is required."
            })
        # Set created_by from request context if available
        request = self.context.get('request')
        if request:
            # Try to get user from headers
            user_id = request.headers.get("X-USER-ID")
            if user_id:
                try:
                    user = User.objects.get(user_id=user_id)
                    validated_data["created_by"] = user
                except User.DoesNotExist:
                    pass
        return super().create(validated_data)

    def update(self, instance, validated_data):
        community_name = validated_data.get("community_name", "").strip()
        community_id = validated_data.get("community")
        
        # If community_id is provided, use it
        if community_id:
            community = community_id
        elif community_name:
            # Try to find existing community by name
            community = Community.objects.filter(name__iexact=community_name).first()
            
            # If not found, create a new community
            if not community:
                # Get or create a default warehouse (use first available or create one)
                warehouse = Warehouse.objects.first()
                if not warehouse:
                    # Create a default warehouse if none exists
                    from datetime import date, timedelta
                    warehouse = Warehouse.objects.create(
                        address="Default Warehouse",
                        capacity=1000.0,
                        stored_date=date.today(),
                        exp_date=date.today() + timedelta(days=365),
                    )
                
                # Create new community with auto-generated ID
                community = Community.objects.create(
                    name=community_name,
                    address=validated_data.get("recipient_address", instance.recipient_address),
                    received_time=timezone.now(),
                    population=validated_data.get("people_count", instance.people_count),
                    warehouse_id=warehouse,
                )
            validated_data["community"] = community
        
        return super().update(instance, validated_data)
