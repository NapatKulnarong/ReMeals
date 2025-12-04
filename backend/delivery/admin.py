from django.contrib import admin
from .models import Delivery


@admin.register(Delivery)
class DeliveryAdmin(admin.ModelAdmin):
    list_display = (
        "delivery_id",
        "delivery_type",
        "pickup_time",
        "dropoff_time",
        "pickup_location_type",
        "dropoff_location_type",
        "warehouse_id",
        "community_id",
        "user_id",
        "donation_id",
    )
    list_filter = (
        "delivery_type",
        "pickup_location_type",
        "dropoff_location_type",
        "warehouse_id",
        "community_id",
    )
    search_fields = (
        "delivery_id",
        "warehouse_id__warehouse_id",
        "community_id__community_id",
        "user_id__username",
        "donation_id__donation_id",
    )
    ordering = ("-pickup_time",)
