from django.contrib import admin
from .models import Warehouse, Community

@admin.register(Warehouse)
class WarehouseAdmin(admin.ModelAdmin):
    list_display = ("warehouse_id", "address", "capacity", "stored_date", "exp_date")
    search_fields = ("warehouse_id", "address")

@admin.register(Community)
class CommunityAdmin(admin.ModelAdmin):
    list_display = ("community_id", "name", "warehouse_id", "population", "received_time")
    list_filter = ("warehouse_id",)
    search_fields = ("community_id", "name", "address")