from django.urls import path
from .views import signup, login

urlpatterns = [
    path("signup/", signup),
    path("login/", login),
]