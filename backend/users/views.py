import os
import uuid
from datetime import datetime

from rest_framework.decorators import api_view
from rest_framework.response import Response

from drf_yasg.utils import swagger_auto_schema

from django.contrib.auth.hashers import make_password, check_password, identify_hasher

from .serializers import SignupSerializer, LoginSerializer, UpdateProfileSerializer
from .models import User, Admin, DeliveryStaff
from restaurants.models import Restaurant
from restaurant_chain.models import RestaurantChain

def _is_hashed(value: str) -> bool:
    try:
        identify_hasher(value)
        return True
    except Exception:
        return False


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

    # Handle restaurant assignment
    restaurant = None
    restaurant_id = data.get("restaurant_id", "").strip()
    restaurant_name = data.get("restaurant_name", "").strip()
    branch = data.get("branch", "").strip()
    restaurant_address = data.get("restaurant_address", "").strip()

    if restaurant_id:
        # Use existing restaurant
        try:
            restaurant = Restaurant.objects.get(restaurant_id=restaurant_id)
        except Restaurant.DoesNotExist:
            return Response({"error": "Restaurant not found"}, status=400)
    elif restaurant_name:
        # Create new restaurant if it doesn't exist
        chain = RestaurantChain.objects.filter(chain_name__iexact=restaurant_name).first()
        if chain is None:
            chain = RestaurantChain(chain_name=restaurant_name)
            chain.save()

        branch_name = branch or "Main Location"
        address = restaurant_address or branch or restaurant_name

        # Check if restaurant already exists
        restaurant = Restaurant.objects.filter(
            name__iexact=restaurant_name,
            branch_name__iexact=branch_name,
        ).first()

        if restaurant is None:
            restaurant = Restaurant.objects.create(
                name=restaurant_name,
                branch_name=branch_name,
                address=address,
                is_chain=bool(branch),
                chain=chain,
            )
    else:
        return Response({"error": "Restaurant information is required"}, status=400)

    user = User.objects.create(
        user_id=random_id,
        username=data.get("username"),
        fname=data.get("fname"),
        lname=data.get("lname"),
        bod=bod,
        phone=data.get("phone"),
        email=data.get("email"),
        password=make_password(data.get("password")),
        restaurant=restaurant,
        branch=branch,
        restaurant_address=restaurant_address or restaurant.address if restaurant else "",
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
        "restaurant_id": user.restaurant.restaurant_id if user.restaurant else None,
        "restaurant_name": user.restaurant.name if user.restaurant else None,
        "branch": user.branch,
        "restaurant_address": user.restaurant_address or (user.restaurant.address if user.restaurant else ""),
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

    password_valid = check_password(password, user.password)
    if not password_valid:
        if not _is_hashed(user.password) and user.password == password:
            user.password = make_password(password)
            user.save(update_fields=["password"])
            password_valid = True

    if not password_valid:
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
            "restaurant_id": user.restaurant.restaurant_id if user.restaurant else None,
            "restaurant_name": user.restaurant.name if user.restaurant else None,
            "branch": user.branch,
            "restaurant_address": user.restaurant_address or (user.restaurant.address if user.restaurant else ""),
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


@swagger_auto_schema(method="patch", request_body=UpdateProfileSerializer)
@api_view(["PATCH"])
def update_profile(request):
    """
    Update user profile information.
    Requires X-USER-ID header to identify the user.
    """
    user_id = request.headers.get("X-USER-ID")
    if not user_id:
        return Response({"error": "User ID required"}, status=401)

    try:
        user = User.objects.get(user_id=user_id)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=404)

    serializer = UpdateProfileSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    data = serializer.validated_data

    # Check for username uniqueness if changing username
    if "username" in data and data["username"] != user.username:
        if User.objects.filter(username=data["username"]).exists():
            return Response({"error": "Username already exists"}, status=400)
        user.username = data["username"]

    # Check for email uniqueness if changing email
    if "email" in data and data["email"] != user.email:
        if User.objects.filter(email=data["email"]).exists():
            return Response({"error": "Email already exists"}, status=400)
        user.email = data["email"]

    # Update other fields
    if "fname" in data:
        user.fname = data["fname"]
    if "lname" in data:
        user.lname = data["lname"]
    if "phone" in data:
        user.phone = data["phone"]

    # Handle restaurant changes
    restaurant_id = data.get("restaurant_id", "").strip()
    restaurant_name = data.get("restaurant_name", "").strip()
    branch = data.get("branch", "").strip()
    restaurant_address = data.get("restaurant_address", "").strip()

    if restaurant_id:
        # Use existing restaurant
        try:
            restaurant = Restaurant.objects.get(restaurant_id=restaurant_id)
            user.restaurant = restaurant
        except Restaurant.DoesNotExist:
            return Response({"error": "Restaurant not found"}, status=400)
    elif restaurant_name:
        # Create or find restaurant
        chain = RestaurantChain.objects.filter(chain_name__iexact=restaurant_name).first()
        if chain is None:
            chain = RestaurantChain(chain_name=restaurant_name)
            chain.save()

        branch_name = branch or "Main Location"
        address = restaurant_address or branch or restaurant_name

        restaurant = Restaurant.objects.filter(
            name__iexact=restaurant_name,
            branch_name__iexact=branch_name,
        ).first()

        if restaurant is None:
            restaurant = Restaurant.objects.create(
                name=restaurant_name,
                branch_name=branch_name,
                address=address,
                is_chain=bool(branch),
                chain=chain,
            )
        user.restaurant = restaurant

    if "branch" in data:
        user.branch = branch
    if "restaurant_address" in data:
        user.restaurant_address = restaurant_address or (user.restaurant.address if user.restaurant else "")

    user.save()

    return Response({
        "message": "Profile updated successfully",
        "username": user.username,
        "email": user.email,
        "fname": user.fname,
        "lname": user.lname,
        "phone": user.phone,
        "restaurant_id": user.restaurant.restaurant_id if user.restaurant else None,
        "restaurant_name": user.restaurant.name if user.restaurant else None,
        "branch": user.branch,
        "restaurant_address": user.restaurant_address,
    }, status=200)
