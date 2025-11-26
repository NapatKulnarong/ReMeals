from rest_framework import serializers

class SignupSerializer(serializers.Serializer):
    fname = serializers.CharField()
    lname = serializers.CharField()
    bod = serializers.CharField()  # รับเป็น dd/mm/yyyy เป็น string ก่อน
    phone = serializers.CharField()
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    class Meta:
        swagger_schema_fields = {
            "example": {
                "fname": "Pattrick",
                "lname": "Loveson",
                "bod": "02/01/2004",  # <-- dd/mm/yyyy
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