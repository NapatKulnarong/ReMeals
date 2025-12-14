from django.urls import path
from .views import signup, login, list_delivery_staff, update_profile

urlpatterns = [
    path("signup/", signup),
    path("login/", login),
    path("delivery-staff/", list_delivery_staff),
    path("profile/", update_profile),
]
