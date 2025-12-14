from rest_framework import serializers

class SignupSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=20)  
    fname = serializers.CharField()
    lname = serializers.CharField()
    bod = serializers.CharField() 
    phone = serializers.CharField()
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    restaurant_id = serializers.CharField(required=False, allow_blank=True)
    restaurant_name = serializers.CharField(required=False, allow_blank=True)
    branch = serializers.CharField(required=False, allow_blank=True, default="")
    restaurant_address = serializers.CharField(required=False, allow_blank=True, default="")

    class Meta:
        swagger_schema_fields = {
            "example": {
                "username": "pattrick",
                "fname": "Pattrick",
                "lname": "Loveson",
                "bod": "02/01/2004",
                "phone": "0863380481",
                "email": "paranyu@gmail.com",
                "password": "12345"
            }
        }

class LoginSerializer(serializers.Serializer):
    identifier = serializers.CharField()
    password = serializers.CharField(write_only=True)

    class Meta:
        swagger_schema_fields = {
            "example": {
                "identifier": "PattrickSon@gmail.com",
                "password": "12345"
            }
        }

class UpdateProfileSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=20, required=False)
    fname = serializers.CharField(required=False)
    lname = serializers.CharField(required=False)
    phone = serializers.CharField(required=False)
    email = serializers.EmailField(required=False)
    restaurant_id = serializers.CharField(required=False, allow_blank=True)
    restaurant_name = serializers.CharField(required=False, allow_blank=True)
    branch = serializers.CharField(required=False, allow_blank=True)
    restaurant_address = serializers.CharField(required=False, allow_blank=True)