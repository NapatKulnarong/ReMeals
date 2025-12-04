from django.contrib import admin

from .models import Donation


@admin.register(Donation)
class DonationAdmin(admin.ModelAdmin):
    list_display = ("donation_id", "restaurant", "status", "donated_at")
    search_fields = ("donation_id", "restaurant__name")
    list_filter = ("status", "donated_at")
