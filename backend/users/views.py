from rest_framework.decorators import api_view
from rest_framework.response import Response

from drf_yasg.utils import swagger_auto_schema

from .serializers import SignupSerializer, LoginSerializer
from .models import User

from datetime import datetime
import uuid


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
        password=data.get("password"),
    )

    return Response({"message": "Signup successful"}, status=200)

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

    if password != user.password:
        return Response({"error": "Invalid password"}, status=400)

    return Response({
        "message": "Login success",
        "username": user.username,
        "email": user.email
    }, status=200)