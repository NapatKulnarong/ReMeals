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

    # 1. List endpoint returns a delivery with related IDs resolved
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

    # 2. Successfully create a new delivery
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

    # 3. Reject creation when delivery_type is invalid
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

    # 4. Partial update adjusts dropoff location and time
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

    # 5. Requests must be authenticated
    def test_authentication_is_required(self):
        unauthenticated_client = APIClient()
        response = unauthenticated_client.get(self.list_url)

        self.assertEqual(response.status_code, 403)

    # 6. Cannot reuse an existing delivery_id
    def test_create_delivery_duplicate_id_fails(self):
        payload = {
            "delivery_id": self.existing_delivery.delivery_id,
            "delivery_type": "distribution",
            "pickup_time": timezone.now().isoformat(),
            "dropoff_time": "02:00:00",
            "pickup_location_type": "warehouse",
            "dropoff_location_type": "community",
            "warehouse_id": self.warehouse.warehouse_id,
            "user_id": self.delivery_user.user_id,
            "donation_id": self.donation.donation_id,
            "community_id": self.community.community_id,
        }

        response = self.client.post(self.list_url, payload, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            Delivery.objects.filter(delivery_id=self.existing_delivery.delivery_id).count(), 1
        )

    # 7. Listing can be filtered by delivery_type
    def test_filter_by_delivery_type(self):
        Delivery.objects.create(
            delivery_id="DLV0003",
            delivery_type="distribution",
            pickup_time=timezone.now(),
            dropoff_time=timedelta(hours=1),
            pickup_location_type="warehouse",
            dropoff_location_type="community",
            warehouse_id=self.warehouse,
            user_id=self.delivery_user,
            donation_id=self.donation,
            community_id=self.community,
        )

        response = self.client.get(f"{self.list_url}?delivery_type=donation")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(all(item["delivery_type"] == "donation" for item in response.data))

    # 8. Cannot create delivery without required foreign keys
    def test_create_delivery_missing_foreign_keys(self):
        payload = {
            "delivery_id": "DLV0004",
            "delivery_type": "donation",
            "pickup_time": timezone.now().isoformat(),
            "dropoff_time": "01:30:00",
            # Missing user_id/donation_id/community_id
        }

        response = self.client.post(self.list_url, payload, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertFalse(Delivery.objects.filter(delivery_id="DLV0004").exists())

    # 9. Dropoff time accepts HH:MM formatted strings
    def test_create_delivery_accepts_dropoff_time_string(self):
        payload = {
            "delivery_id": "DLV0005",
            "delivery_type": "donation",
            "pickup_time": timezone.now().isoformat(),
            "dropoff_time": "04:45:00",
            "pickup_location_type": "restaurant",
            "dropoff_location_type": "warehouse",
            "warehouse_id": self.warehouse.warehouse_id,
            "user_id": self.delivery_user.user_id,
            "donation_id": self.donation.donation_id,
            "community_id": self.community.community_id,
        }

        response = self.client.post(self.list_url, payload, format="json")
        self.assertEqual(response.status_code, 201)
        created = Delivery.objects.get(delivery_id="DLV0005")
        self.assertEqual(created.dropoff_time, timedelta(hours=4, minutes=45))

    # 10. Detail endpoint returns 404 for unknown delivery_id
    def test_get_nonexistent_delivery_returns_404(self):
        detail_url = reverse("delivery-detail", args=["UNKNOWN"])
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, 404)

    # 11. Detail endpoint returns the existing delivery
    def test_get_existing_delivery_returns_detail(self):
        detail_url = reverse("delivery-detail", args=[self.existing_delivery.delivery_id])
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["delivery_id"], self.existing_delivery.delivery_id)

    # 12. Authenticated user can delete a delivery
    def test_delete_delivery_succeeds(self):
        detail_url = reverse("delivery-detail", args=[self.existing_delivery.delivery_id])
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, 204)
        self.assertFalse(
            Delivery.objects.filter(delivery_id=self.existing_delivery.delivery_id).exists()
        )

    # 13. Patching with same value still returns 200
    def test_patch_same_value(self):
        detail_url = reverse("delivery-detail", args=[self.existing_delivery.delivery_id])
        payload = {"dropoff_location_type": self.existing_delivery.dropoff_location_type}
        response = self.client.patch(detail_url, payload, format="json")
        self.assertEqual(response.status_code, 200)

    # 14. Creating delivery without pickup_time is rejected
    def test_create_delivery_missing_pickup_time(self):
        payload = {
            "delivery_id": "DLV0010",
            "delivery_type": "donation",
            "dropoff_time": "02:15:00",
            "pickup_location_type": "restaurant",
            "dropoff_location_type": "warehouse",
            "warehouse_id": self.warehouse.warehouse_id,
            "user_id": self.delivery_user.user_id,
            "donation_id": self.donation.donation_id,
            "community_id": self.community.community_id,
        }

        response = self.client.post(self.list_url, payload, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertFalse(Delivery.objects.filter(delivery_id="DLV0010").exists())

    # 15. Filtering by a type with no matches returns empty list
    def test_filter_by_delivery_type_returns_empty(self):
        response = self.client.get(f"{self.list_url}?delivery_type=distribution")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 0)
