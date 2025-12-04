from django.contrib import admin

from .models import User, Donor, DeliveryStaff, Recipient, Admin as UserAdminModel


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ("username", "email", "fname", "lname", "phone", "bod")
    search_fields = ("username", "email")
    ordering = ("user_id",)

@admin.register(Donor)
class DonorAdmin(admin.ModelAdmin):
    list_display = ("user", "restaurant_id")
    search_fields = ("user__username", "user__fname", "user__lname", "restaurant_id")

@admin.register(Recipient)
class RecipientAdmin(admin.ModelAdmin):
    list_display = ("user", "address", "community_id")
    search_fields = ("user__fname", "user__lname", "community_id")

@admin.register(DeliveryStaff)
class DeliveryStaffAdmin(admin.ModelAdmin):
    list_display = ("user", "assigned_area", "is_available")
    list_filter = ("is_available",)
    search_fields = ("user__fname", "user__lname", "assigned_area")

@admin.register(UserAdminModel)
class PlatformAdmin(admin.ModelAdmin):
    list_display = ("user",)
