from django.contrib import admin

from .models import DonationRequest


@admin.register(DonationRequest)
class DonationRequestAdmin(admin.ModelAdmin):
    list_display = (
        "request_id",
        "title",
        "community_name",
        "people_count",
        "expected_delivery",
        "created_at",
    )
    search_fields = ("request_id", "title", "community_name")
