from rest_framework import serializers

class SignupSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=20)  
    fname = serializers.CharField()
    lname = serializers.CharField()
    bod = serializers.CharField() 
    phone = serializers.CharField()
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    class Meta:
        swagger_schema_fields = {
            "example": {
                "username": "pattrick",
                "fname": "Pattrick",
                "lname": "Loveson",
                "bod": "02/01/2004",
                "phone": "0863380481",
                "email": "parunyu@gmail.com",
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