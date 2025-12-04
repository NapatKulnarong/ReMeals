from django.db import models

class User(models.Model):
    user_id = models.CharField(max_length=10, primary_key=True)
    username = models.CharField(max_length=20, unique=True)
    fname = models.CharField(max_length=100)
    lname = models.CharField(max_length=100)
    bod = models.DateField()
    phone = models.CharField(max_length=10)
    email = models.CharField(max_length=100, unique=True)
    password = models.CharField(max_length=20)

    def __str__(self):
        return f"{self.fname} {self.lname}"
    
class Donor(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    restaurant_id = models.CharField(max_length=10)

    def __str__(self):
        return f"Donor {self.user.user_id}"

class DeliveryStaff(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    assigned_area = models.CharField(max_length=200)
    is_available = models.BooleanField(default=True)

    def __str__(self):
        return f"Staff {self.user.user_id}"
    
class Recipient(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    address = models.CharField(max_length=300)
    community_id = models.ForeignKey(
        "community.Community",
        on_delete=models.CASCADE,
        related_name="recipients",
        null=True,
        blank=True,
    )

    def __str__(self):
        return f"Recipient {self.user.user_id}"
    
class Admin(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)

    def __str__(self):
        return f"Admin {self.user.user_id}"
