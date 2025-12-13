from django import forms
from django.contrib import admin
from django.contrib.auth.hashers import identify_hasher, make_password

from .models import User, Donor, DeliveryStaff, Recipient, Admin as UserAdminModel


def _is_hashed(value: str) -> bool:
    try:
        identify_hasher(value)
        return True
    except Exception:
        return False


class UserAdminForm(forms.ModelForm):
    password = forms.CharField(
        label="Password",
        widget=forms.PasswordInput(render_value=False),
        required=False,
        help_text="Leave blank to keep the current password.",
    )

    class Meta:
        model = User
        fields = "__all__"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance and self.instance.pk:
            self.fields["password"].required = False
        else:
            self.fields["password"].required = True

    def clean_password(self):
        password = self.cleaned_data.get("password")
        if self.instance and self.instance.pk:
            if not password:
                return self.instance.password
            return password
        if not password:
            raise forms.ValidationError("Password is required.")
        return password


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    form = UserAdminForm
    list_display = ("username", "email", "fname", "lname", "phone", "bod")
    search_fields = ("username", "email")
    ordering = ("user_id",)

    def save_model(self, request, obj, form, change):
        password = form.cleaned_data.get("password")
        if password and not _is_hashed(password):
            obj.password = make_password(password)
        super().save_model(request, obj, form, change)

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
