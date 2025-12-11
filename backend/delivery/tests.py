from datetime import date, timedelta

from django.contrib.auth.models import User as DjangoAuthUser
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase, APIClient

from users.models import User as DomainUser
from warehouse.models import Warehouse
from community.models import Community
from restaurants.models import Restaurant
from restaurant_chain.models import RestaurantChain
from donation.models import Donation
from .models import Delivery


class DeliveryAPITests(APITestCase):
    def setUp(self):
        self.auth_user = DjangoAuthUser.objects.create_user(
            username="apiadmin", password="strong-pass"
        )
        self.client.force_authenticate(self.auth_user)

        self.warehouse = Warehouse.objects.create(
            warehouse_id="WAR001",
            address="123 Storage Ave",
            capacity=750.0,
            stored_date=date(2025, 1, 1),
            exp_date=date(2025, 3, 1),
        )
        self.community = Community.objects.create(
            community_id="COM001",
            name="North Block",
            address="45 Main Street",
            received_time=timezone.now(),
            population=120,
            warehouse_id=self.warehouse,
        )
        self.chain = RestaurantChain.objects.create(chain_id="CHA01", chain_name="KFC Group")
        self.restaurant = Restaurant.objects.create(
            restaurant_id="RES001",
            address="77 Food Park",
            name="GoodEats",
            branch_name="Central",
            is_chain=False,
            chain=self.chain,
        )
        self.donation = Donation.objects.create(
            donation_id="DON001",
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

    # 16. Unauthenticated user cannot create a delivery
    def test_create_delivery_requires_authentication(self):
        unauthenticated_client = APIClient()
        payload = {
            "delivery_id": "DLV0011",
            "delivery_type": "donation",
            "pickup_time": timezone.now().isoformat(),
            "dropoff_time": "03:00:00",
            "pickup_location_type": "restaurant",
            "dropoff_location_type": "warehouse",
            "warehouse_id": self.warehouse.warehouse_id,
            "user_id": self.delivery_user.user_id,
            "donation_id": self.donation.donation_id,
            "community_id": self.community.community_id,
        }
        response = unauthenticated_client.post(self.list_url, payload, format="json")
        self.assertEqual(response.status_code, 403)
        self.assertFalse(Delivery.objects.filter(delivery_id="DLV0011").exists())

    # 17. Patch with invalid dropoff location type fails
    def test_patch_invalid_dropoff_location_type(self):
        detail_url = reverse("delivery-detail", args=[self.existing_delivery.delivery_id])
        payload = {"dropoff_location_type": "invalid"}
        response = self.client.patch(detail_url, payload, format="json")
        self.assertEqual(response.status_code, 400)

    # 18. Creating delivery requires pickup_location_type
    def test_create_delivery_requires_pickup_location_type(self):
        payload = {
            "delivery_id": "DLV0012",
            "delivery_type": "donation",
            "pickup_time": timezone.now().isoformat(),
            "dropoff_time": "01:45:00",
            "dropoff_location_type": "warehouse",
            "warehouse_id": self.warehouse.warehouse_id,
            "user_id": self.delivery_user.user_id,
            "donation_id": self.donation.donation_id,
            "community_id": self.community.community_id,
        }
        response = self.client.post(self.list_url, payload, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertFalse(Delivery.objects.filter(delivery_id="DLV0012").exists())

    # 19. Getting a delivery after deletion returns 404
    def test_get_after_delete_returns_404(self):
        detail_url = reverse("delivery-detail", args=[self.existing_delivery.delivery_id])
        delete_response = self.client.delete(detail_url)
        self.assertEqual(delete_response.status_code, 204)
        get_response = self.client.get(detail_url)
        self.assertEqual(get_response.status_code, 404)

    # 20. Detail endpoint reflects updated dropoff location and time
    def test_detail_updates_after_patch(self):
        detail_url = reverse("delivery-detail", args=[self.existing_delivery.delivery_id])
        patch_payload = {
            "dropoff_location_type": "community",
            "dropoff_time": "06:15:00",
        }
        patch_response = self.client.patch(detail_url, patch_payload, format="json")
        self.assertEqual(patch_response.status_code, 200)
        detail_response = self.client.get(detail_url)
        self.assertEqual(detail_response.status_code, 200)
        self.assertEqual(detail_response.data["dropoff_location_type"], "community")
        self.assertEqual(detail_response.data["dropoff_time"], "06:15:00")

    # 21. Creating delivery with invalid pickup location type fails
    def test_create_delivery_invalid_pickup_location(self):
        payload = {
            "delivery_id": "DLV0020",
            "delivery_type": "donation",
            "pickup_time": timezone.now().isoformat(),
            "dropoff_time": "02:15:00",
            "pickup_location_type": "invalid",
            "dropoff_location_type": "warehouse",
            "warehouse_id": self.warehouse.warehouse_id,
            "user_id": self.delivery_user.user_id,
            "donation_id": self.donation.donation_id,
            "community_id": self.community.community_id,
        }
        response = self.client.post(self.list_url, payload, format="json")
        self.assertEqual(response.status_code, 400)

    # 22. Listing supports pagination parameters
    def test_list_supports_pagination(self):
        response = self.client.get(f"{self.list_url}?page=1&page_size=1")
        self.assertEqual(response.status_code, 200)
        # Response may be paginated data structure; ensure at least one item is returned
        if isinstance(response.data, list):
            self.assertEqual(len(response.data), 1)
        else:
            self.assertEqual(response.data["count"], 1)

    # 23. Creating delivery requires dropoff_time
    def test_create_delivery_requires_dropoff_time(self):
        payload = {
            "delivery_id": "DLV0021",
            "delivery_type": "distribution",
            "pickup_time": timezone.now().isoformat(),
            "pickup_location_type": "warehouse",
            "dropoff_location_type": "community",
            "warehouse_id": self.warehouse.warehouse_id,
            "user_id": self.delivery_user.user_id,
            "donation_id": self.donation.donation_id,
            "community_id": self.community.community_id,
        }
        response = self.client.post(self.list_url, payload, format="json")
        self.assertEqual(response.status_code, 400)

    # 24. Creating delivery with invalid delivery_type fails
    def test_create_delivery_invalid_delivery_type(self):
        payload = {
            "delivery_id": "DLV0022",
            "delivery_type": "invalid",
            "pickup_time": timezone.now().isoformat(),
            "dropoff_time": "03:15:00",
            "pickup_location_type": "warehouse",
            "dropoff_location_type": "community",
            "warehouse_id": self.warehouse.warehouse_id,
            "user_id": self.delivery_user.user_id,
            "donation_id": self.donation.donation_id,
            "community_id": self.community.community_id,
        }
        response = self.client.post(self.list_url, payload, format="json")
        self.assertEqual(response.status_code, 400)

    # 25. Creating delivery with invalid donation_id fails
    def test_create_delivery_invalid_donation(self):
        payload = {
            "delivery_id": "DLV0014",
            "delivery_type": "donation",
            "pickup_time": timezone.now().isoformat(),
            "dropoff_time": "02:00:00",
            "pickup_location_type": "restaurant",
            "dropoff_location_type": "warehouse",
            "warehouse_id": self.warehouse.warehouse_id,
            "user_id": self.delivery_user.user_id,
            "donation_id": "NOTEXIST",
            "community_id": self.community.community_id,
        }
        response = self.client.post(self.list_url, payload, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertFalse(Delivery.objects.filter(delivery_id="DLV0014").exists())

    # 26. Detail response contains related IDs
    def test_delivery_detail_contains_related_ids(self):
        detail_url = reverse("delivery-detail", args=[self.existing_delivery.delivery_id])
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["warehouse_id"], self.warehouse.warehouse_id)
        self.assertEqual(response.data["community_id"], self.community.community_id)
        self.assertEqual(response.data["donation_id"], self.donation.donation_id)

    # 27. Creating delivery requires dropoff_location_type
    def test_create_delivery_missing_dropoff_location_type(self):
        payload = {
            "delivery_id": "DLV0015",
            "delivery_type": "donation",
            "pickup_time": timezone.now().isoformat(),
            "dropoff_time": "02:30:00",
            "pickup_location_type": "restaurant",
            "warehouse_id": self.warehouse.warehouse_id,
            "user_id": self.delivery_user.user_id,
            "donation_id": self.donation.donation_id,
            "community_id": self.community.community_id,
        }
        response = self.client.post(self.list_url, payload, format="json")
        self.assertEqual(response.status_code, 400)

    # 28. Creating delivery without community_id fails
    def test_create_delivery_requires_community_id(self):
        payload = {
            "delivery_id": "DLV0016",
            "delivery_type": "distribution",
            "pickup_time": timezone.now().isoformat(),
            "dropoff_time": "06:00:00",
            "pickup_location_type": "warehouse",
            "dropoff_location_type": "community",
            "warehouse_id": self.warehouse.warehouse_id,
            "user_id": self.delivery_user.user_id,
            "donation_id": self.donation.donation_id,
        }
        response = self.client.post(self.list_url, payload, format="json")
        self.assertEqual(response.status_code, 400)

    # 29. Deleting the same delivery twice yields 404 second time
    def test_delete_twice_returns_not_found(self):
        detail_url = reverse("delivery-detail", args=[self.existing_delivery.delivery_id])
        first_delete = self.client.delete(detail_url)
        self.assertEqual(first_delete.status_code, 204)
        second_delete = self.client.delete(detail_url)
        self.assertEqual(second_delete.status_code, 404)

    # 30. Filtering by type after creates returns only requested type
    def test_filter_by_type_after_multiple_creates(self):
        payload = {
            "delivery_id": "DLV0017",
            "delivery_type": "distribution",
            "pickup_time": timezone.now().isoformat(),
            "dropoff_time": "03:00:00",
            "pickup_location_type": "warehouse",
            "dropoff_location_type": "community",
            "warehouse_id": self.warehouse.warehouse_id,
            "user_id": self.delivery_user.user_id,
            "donation_id": self.donation.donation_id,
            "community_id": self.community.community_id,
        }
        create_response = self.client.post(self.list_url, payload, format="json")
        self.assertEqual(create_response.status_code, 201)
        response = self.client.get(f"{self.list_url}?delivery_type=distribution")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(all(item["delivery_type"] == "distribution" for item in response.data))
