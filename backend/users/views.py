import bcrypt
import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from rest_framework.decorators import api_view
from rest_framework.response import Response

from drf_yasg.utils import swagger_auto_schema

from .serializers import SignupSerializer, LoginSerializer
from .models import User

def generate_user_id():
    last_user = User.objects.order_by('user_id').last()
    if not last_user:
        return "U0001"
    last_id = int(last_user.user_id[1:])
    new_id = last_id + 1
    return f"U{new_id:04d}"

@swagger_auto_schema(method="post", request_body=SignupSerializer)
@api_view(["POST"])
def signup(request):
    serializer = SignupSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    data = serializer.validated_data

    from datetime import datetime
    bod = datetime.strptime(data["bod"], "%d/%m/%Y").date()

    uid = generate_user_id()
    hashed_pw = bcrypt.hashpw(data["password"].encode(), bcrypt.gensalt()).decode()

    user = User.objects.create(
        user_id=uid,
        fname=data["fname"],
        lname=data["lname"],
        bod=bod,
        phone=data["phone"],
        email=data["email"],
        password=hashed_pw,
    )

    return Response({"message": "User created", "user_id": uid}, status=201)

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
            user = User.objects.get(user_id=identifier)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)

    if not bcrypt.checkpw(password.encode(), user.password.encode()):
        return Response({"error": "Invalid password"}, status=400)

    return Response({
        "message": "Login success",
        "user_id": user.user_id,
        "email": user.email
    })