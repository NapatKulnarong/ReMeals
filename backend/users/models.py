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
    is_donor = models.BooleanField(default=False)
    is_recipient = models.BooleanField(default=False)
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column="restaurant_id",
        related_name="users",
    )
    branch = models.CharField(max_length=100, blank=True, default="")
    restaurant_address = models.CharField(max_length=300, blank=True, default="")

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

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        updated_fields = []
        if not self.user.is_donor:
            self.user.is_donor = True
            updated_fields.append("is_donor")
        if updated_fields:
            self.user.save(update_fields=updated_fields)


class DeliveryStaff(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='delivery_roles')
    assigned_area = models.CharField(max_length=200)
    is_available = models.BooleanField(default=True)

    def __str__(self):
        return f"Staff {self.user.user_id}"


class Recipient(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='recipient_roles')
    address = models.CharField(max_length=300)
    donation_request = models.ForeignKey(
        "donation_request.DonationRequest",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="recipients",
        db_column="request_id",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['user'], name='unique_recipient_user'),
        ]

    def __str__(self):
        return f"Recipient {self.user.user_id}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        updated_fields = []
        if not self.user.is_recipient:
            self.user.is_recipient = True
            updated_fields.append("is_recipient")
        if updated_fields:
            self.user.save(update_fields=updated_fields)
