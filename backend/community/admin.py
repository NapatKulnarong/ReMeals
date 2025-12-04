from django.contrib import admin
from .models import Community

@admin.register(Community)
class CommunityAdmin(admin.ModelAdmin):
    list_display = ("community_id", "name", "warehouse_id", "population", "received_time")
    list_filter = ("warehouse_id",)
    search_fields = ("community_id", "name", "address")