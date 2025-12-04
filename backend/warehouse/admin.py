from django.contrib import admin
from .models import Warehouse

@admin.register(Warehouse)
class WarehouseAdmin(admin.ModelAdmin):
    list_display = ("warehouse_id", "address", "capacity", "stored_date", "exp_date")
    search_fields = ("warehouse_id", "address")
