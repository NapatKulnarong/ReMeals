import os
import uuid
from datetime import datetime

from rest_framework.decorators import api_view
from rest_framework.response import Response

from drf_yasg.utils import swagger_auto_schema

from django.contrib.auth.hashers import make_password, check_password

from .serializers import SignupSerializer, LoginSerializer
from .models import User, Admin, DeliveryStaff


def _admin_emails():
    raw = os.environ.get("ADMIN_EMAILS", "")
    return {email.strip().lower() for email in raw.split(",") if email.strip()}


def _delivery_staff_emails():
    raw = os.environ.get("DELIVERY_STAFF_EMAILS", "")
    return {email.strip().lower() for email in raw.split(",") if email.strip()}


@swagger_auto_schema(method="post", request_body=SignupSerializer)
@api_view(["POST"])
def signup(request):
    data = request.data

    required_fields = ["username", "fname", "lname", "phone", "email", "password"]

    for field in required_fields:
        if not data.get(field):
            return Response({"error": f"{field} is required"}, status=400)

    if User.objects.filter(username=data.get("username")).exists():
        return Response({"error": "Username already exists"}, status=400)

    if User.objects.filter(email=data.get("email")).exists():
        return Response({"error": "Email already exists"}, status=400)

    raw_bod = data.get("bod")
    bod = None
    if raw_bod:
        try:
            bod = datetime.strptime(raw_bod, "%d/%m/%Y").date()
        except ValueError:
            try:
                bod = datetime.strptime(raw_bod, "%Y-%m-%d").date()
            except ValueError:
                return Response({"error": "Invalid bod format"}, status=400)

    random_id = uuid.uuid4().hex[:10].upper()

    user = User.objects.create(
        user_id=random_id,
        username=data.get("username"),
        fname=data.get("fname"),
        lname=data.get("lname"),
        bod=bod,
        phone=data.get("phone"),
        email=data.get("email"),
        password=make_password(data.get("password")),
    )

    is_admin = False
    is_delivery_staff = False

    if user.email.lower() in _admin_emails():
        Admin.objects.get_or_create(user=user)
        is_admin = True
    if user.email.lower() in _delivery_staff_emails():
        DeliveryStaff.objects.get_or_create(
            user=user,
            defaults={
                "assigned_area": os.environ.get("DELIVERY_STAFF_DEFAULT_AREA", "General"),
                "is_available": True,
            },
        )
        is_delivery_staff = True

    return Response({
        "message": "Signup successful",
        "username": user.username,
        "email": user.email,
        "user_id": user.user_id,
        "is_admin": is_admin,
        "is_delivery_staff": is_delivery_staff,
    }, status=200)

@swagger_auto_schema(method="post", request_body=LoginSerializer)
@api_view(["POST"])
def login(request):
    serializer = LoginSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    identifier = serializer.validated_data["identifier"]
    password = serializer.validated_data["password"]

    try:
        user = User.objects.get(email=identifier)
    except User.DoesNotExist:
        try:
            user = User.objects.get(username=identifier)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)

    if not check_password(password, user.password):
        return Response({"error": "Invalid password"}, status=400)

    is_admin = Admin.objects.filter(user=user).exists()
    if not is_admin and user.email.lower() in _admin_emails():
        Admin.objects.get_or_create(user=user)
        is_admin = True
    is_delivery_staff = DeliveryStaff.objects.filter(user=user).exists()
    if not is_delivery_staff and user.email.lower() in _delivery_staff_emails():
        DeliveryStaff.objects.get_or_create(
            user=user,
            defaults={
                "assigned_area": os.environ.get("DELIVERY_STAFF_DEFAULT_AREA", "General"),
                "is_available": True,
            },
        )
        is_delivery_staff = True

    return Response(
        {
            "message": "Login success",
            "username": user.username,
            "email": user.email,
            "user_id": user.user_id,
            "is_admin": is_admin,
            "is_delivery_staff": is_delivery_staff,
        },
        status=200,
    )


@api_view(["GET"])
def list_delivery_staff(request):
    staff = DeliveryStaff.objects.select_related("user").all()
    data = []
    for member in staff:
        user = member.user
        data.append(
            {
                "user_id": user.user_id,
                "username": user.username,
                "name": f"{user.fname} {user.lname}".strip(),
                "email": user.email,
                "assigned_area": member.assigned_area,
                "is_available": member.is_available,
            }
        )
    return Response(data, status=200)
