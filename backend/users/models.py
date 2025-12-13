from django.db import models
from django.contrib.auth.hashers import make_password, check_password
from restaurants.models import Restaurant


class User(models.Model):
    user_id = models.CharField(max_length=10, primary_key=True)
    username = models.CharField(max_length=20, unique=True)
    fname = models.CharField(max_length=100)
    lname = models.CharField(max_length=100)
    bod = models.DateField()
    phone = models.CharField(max_length=10)
    email = models.CharField(max_length=100, unique=True)
    password = models.CharField(max_length=128)

    def __str__(self):
        return f"{self.fname} {self.lname}"


class Admin(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='admin_roles')

    def __str__(self):
        return f"Admin {self.user.user_id}"


class Donor(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='donor_roles')
    restaurant_id = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        db_column="restaurant_id",
        related_name="donors",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['user'], name='unique_donor_user'),
        ]

    def __str__(self):
        return f"Donor {self.user.user_id}"


class DeliveryStaff(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='delivery_roles')
    assigned_area = models.CharField(max_length=200)
    is_available = models.BooleanField(default=True)

    def __str__(self):
        return f"Staff {self.user.user_id}"


class Recipient(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='recipient_roles')
    address = models.CharField(max_length=300)
    community_id = models.ForeignKey(
        "community.Community",
        on_delete=models.CASCADE,
        related_name="recipients",
        null=True,
        blank=True,
        db_column="community_id",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['user'], name='unique_recipient_user'),
        ]

    def __str__(self):
        return f"Recipient {self.user.user_id}"
