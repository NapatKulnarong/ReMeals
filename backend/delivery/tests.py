from datetime import date, timedelta

from django.contrib.auth.models import User as DjangoAuthUser
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase, APIClient

from users.models import User as DomainUser
from warehouse.models import Warehouse
from community.models import Community
from restaurants.models import Restaurant
from donation.models import Donation
from .models import Delivery


class DeliveryAPITests(APITestCase):
    def setUp(self):
        self.auth_user = DjangoAuthUser.objects.create_user(
            username="apiadmin", password="strong-pass"
        )
        self.client.force_authenticate(self.auth_user)

        self.warehouse = Warehouse.objects.create(
            warehouse_id="W001",
            address="123 Storage Ave",
            capacity=750.0,
            stored_date=date(2025, 1, 1),
            exp_date=date(2025, 3, 1),
        )
        self.community = Community.objects.create(
            community_id="C001",
            name="North Block",
            address="45 Main Street",
            received_time=timezone.now(),
            population=120,
            warehouse_id=self.warehouse,
        )
        self.restaurant = Restaurant.objects.create(
            restaurant_id="R001",
            address="77 Food Park",
            name="GoodEats",
            branch_name="Central",
            is_chain=False,
        )
        self.donation = Donation.objects.create(
            donation_id="DN001",
            restaurant=self.restaurant,
        )
        self.delivery_user = DomainUser.objects.create(
            user_id="USR0001",
            username="recipient01",
            fname="Recipient",
            lname="User",
            bod=date(1995, 5, 5),
            phone="0911111111",
            email="recipient@example.com",
            password="pw12345",
        )

        self.existing_delivery = Delivery.objects.create(
            delivery_id="DLV0001",
            delivery_type="donation",
            pickup_time=timezone.now(),
            dropoff_time=timedelta(hours=2),
            pickup_location_type="restaurant",
            dropoff_location_type="warehouse",
            warehouse_id=self.warehouse,
            user_id=self.delivery_user,
            donation_id=self.donation,
            community_id=self.community,
        )
        self.list_url = reverse("delivery-list")

    def test_list_deliveries_returns_related_ids(self):
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        item = response.data[0]
        self.assertEqual(item["delivery_id"], self.existing_delivery.delivery_id)
        self.assertEqual(item["warehouse_id"], self.warehouse.warehouse_id)
        self.assertEqual(item["community_id"], self.community.community_id)
        self.assertEqual(item["donation_id"], self.donation.donation_id)
        self.assertEqual(item["user_id"], self.delivery_user.user_id)

    def test_create_delivery_successfully(self):
        payload = {
            "delivery_id": "DLV0002",
            "delivery_type": "distribution",
            "pickup_time": timezone.now().isoformat(),
            "dropoff_time": "03:30:00",
            "pickup_location_type": "warehouse",
            "dropoff_location_type": "community",
            "warehouse_id": self.warehouse.warehouse_id,
            "user_id": self.delivery_user.user_id,
            "donation_id": self.donation.donation_id,
            "community_id": self.community.community_id,
        }

        response = self.client.post(self.list_url, payload, format="json")

        self.assertEqual(response.status_code, 201)
        self.assertTrue(Delivery.objects.filter(delivery_id="DLV0002").exists())

    def test_create_delivery_rejects_invalid_type(self):
        payload = {
            "delivery_id": "DLV0003",
            "delivery_type": "unknown",
            "pickup_time": timezone.now().isoformat(),
            "dropoff_time": "01:00:00",
            "pickup_location_type": "warehouse",
            "dropoff_location_type": "community",
        }

        response = self.client.post(self.list_url, payload, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertFalse(Delivery.objects.filter(delivery_id="DLV0003").exists())

    def test_partial_update_delivery(self):
        detail_url = reverse("delivery-detail", args=[self.existing_delivery.delivery_id])
        payload = {
            "dropoff_location_type": "community",
            "dropoff_time": "05:00:00",
        }

        response = self.client.patch(detail_url, payload, format="json")

        self.assertEqual(response.status_code, 200)
        self.existing_delivery.refresh_from_db()
        self.assertEqual(self.existing_delivery.dropoff_location_type, "community")
        self.assertEqual(self.existing_delivery.dropoff_time, timedelta(hours=5))

    def test_authentication_is_required(self):
        unauthenticated_client = APIClient()
        response = unauthenticated_client.get(self.list_url)

        self.assertEqual(response.status_code, 403)
