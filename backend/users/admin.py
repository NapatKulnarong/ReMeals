from django.contrib import admin

from .models import User


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = (
        "username",
        "email",
        "fname",
        "lname",
        "phone",
        "bod",
    )
    search_fields = ("username", "email")
