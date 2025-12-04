from django.contrib import admin
from .models import Restaurant

@admin.register(Restaurant)
class RestaurantAdmin(admin.ModelAdmin):
    list_display = ("restaurant_id", "name", "branch_name", "is_chain", "chain")
    search_fields = ("restaurant_id", "name", "branch_name")
    list_filter = ("is_chain",)
