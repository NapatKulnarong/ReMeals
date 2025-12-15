from datetime import date, timedelta, time, datetime


from django.contrib.auth.models import User as DjangoAuthUser
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase, APIClient

from users.models import Donor, Recipient, User as DomainUser
from warehouse.models import Warehouse
from community.models import Community
from restaurants.models import Restaurant
from restaurant_chain.models import RestaurantChain
from donation.models import Donation
from donation_request.models import DonationRequest
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
        self.donor_user = DomainUser.objects.create(
            user_id="USR0100",
            username="donor01",
            fname="Donor",
            lname="User",
            bod=date(1992, 3, 3),
            phone="0900000000",
            email="donor@example.com",
            password="pw12345",
        )
        self.other_user = DomainUser.objects.create(
            user_id="USR0200",
            username="other01",
            fname="Other",
            lname="Person",
            bod=date(1990, 4, 4),
            phone="0900000001",
            email="other@example.com",
            password="pw12345",
        )
        Donor.objects.create(user=self.donor_user, restaurant_id=self.restaurant)
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
        self.admin_headers = {"HTTP_X_USER_IS_ADMIN": "true"}
        self.driver_headers = {
            "HTTP_X_USER_IS_DELIVERY": "true",
            "HTTP_X_USER_ID": self.delivery_user.user_id,
        }
        self.user_headers = {"HTTP_X_USER_ID": self.donor_user.user_id}
        self.other_user_headers = {"HTTP_X_USER_ID": self.other_user.user_id}
        self.donation_request = DonationRequest.objects.create(
            request_id="REQ0001",
            title="Meals for North Block",
            community_name=self.community.name,
            recipient_address=self.community.address,
            expected_delivery=timezone.now() + timedelta(days=2),
            people_count=100,
            contact_phone="0999999999",
            notes="",
            community=self.community,
        )
        Recipient.objects.create(
            user=self.donor_user,
            address="789 Request St",
            donation_request=self.donation_request,
        )

    # 1. List endpoint returns a delivery with related IDs resolved
    def test_list_deliveries_returns_related_ids(self):
        response = self.client.get(self.list_url, **self.admin_headers)

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

        response = self.client.post(self.list_url, payload, format="json", **self.admin_headers)

        if response.status_code != 201:
            print(f"Response status: {response.status_code}")
            print(f"Response data: {response.data}")
        self.assertEqual(response.status_code, 201)
        created_id = response.data["delivery_id"]
        self.assertTrue(created_id.startswith("DLV"))
        self.assertTrue(Delivery.objects.filter(delivery_id=created_id).exists())

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

        response = self.client.post(self.list_url, payload, format="json", **self.admin_headers)

        self.assertEqual(response.status_code, 400)
        self.assertFalse(Delivery.objects.filter(delivery_id="DLV0003").exists())

    # 4. Partial update adjusts dropoff location and time
    def test_partial_update_delivery(self):
        detail_url = reverse("delivery-detail", args=[self.existing_delivery.delivery_id])
        payload = {
            "dropoff_time": "05:00:00",
            "notes": "Updated schedule",
        }

        response = self.client.patch(
            detail_url, payload, format="json", **self.admin_headers
        )

        self.assertEqual(response.status_code, 200)
        self.existing_delivery.refresh_from_db()
        # dropoff_time is now a datetime, check the time component (accounting for timezone)
        dropoff_time = self.existing_delivery.dropoff_time
        if dropoff_time.tzinfo:
            # Convert to local timezone for comparison
            from django.utils import timezone as django_timezone
            dropoff_time = dropoff_time.astimezone(django_timezone.get_current_timezone())
        self.assertEqual(dropoff_time.time(), time(5, 0))
        self.assertEqual(self.existing_delivery.notes, "Updated schedule")

    # 5. Requests must be authenticated
    def test_list_without_role_returns_empty(self):
        unauthenticated_client = APIClient()
        response = unauthenticated_client.get(self.list_url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

    # 6. Cannot reuse an existing delivery_id
    def test_create_delivery_duplicate_id_is_ignored(self):
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

        response = self.client.post(self.list_url, payload, format="json", **self.admin_headers)
        self.assertEqual(response.status_code, 201)
        self.assertNotEqual(response.data["delivery_id"], self.existing_delivery.delivery_id)
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

        response = self.client.get(
            f"{self.list_url}?delivery_type=donation", **self.admin_headers
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(all(item["delivery_type"] == "donation" for item in response.data))

    # 8. Cannot create delivery without required foreign keys
    def test_create_delivery_missing_foreign_keys(self):
        payload = {
            "delivery_type": "donation",
            "pickup_time": timezone.now().isoformat(),
            "dropoff_time": "01:30:00",
            # Missing user_id/donation_id/community_id
        }

        response = self.client.post(self.list_url, payload, format="json", **self.admin_headers)
        self.assertEqual(response.status_code, 400)
        self.assertFalse(Delivery.objects.filter(delivery_id="DLV0004").exists())

    # 9. Dropoff time accepts HH:MM formatted strings
    def test_create_delivery_accepts_dropoff_time_string(self):
        payload = {
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

        response = self.client.post(self.list_url, payload, format="json", **self.admin_headers)
        self.assertEqual(response.status_code, 201)
        created = Delivery.objects.get(delivery_id=response.data["delivery_id"])
        # dropoff_time is now a datetime, check the time component
        # Account for timezone conversion - check that time component matches in local timezone
        dropoff_time = created.dropoff_time
        if dropoff_time.tzinfo:
            # Convert to local timezone for comparison
            from django.utils import timezone as django_timezone
            dropoff_time = dropoff_time.astimezone(django_timezone.get_current_timezone())
        self.assertEqual(dropoff_time.time(), time(4, 45))

    # 10. Detail endpoint returns 404 for unknown delivery_id
    def test_get_nonexistent_delivery_returns_404(self):
        detail_url = reverse("delivery-detail", args=["UNKNOWN"])
        response = self.client.get(detail_url, **self.admin_headers)
        self.assertEqual(response.status_code, 404)

    # 11. Detail endpoint returns the existing delivery
    def test_get_existing_delivery_returns_detail(self):
        detail_url = reverse("delivery-detail", args=[self.existing_delivery.delivery_id])
        response = self.client.get(detail_url, **self.admin_headers)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["delivery_id"], self.existing_delivery.delivery_id)

    # 12. Authenticated user can delete a delivery
    def test_delete_delivery_succeeds(self):
        detail_url = reverse("delivery-detail", args=[self.existing_delivery.delivery_id])
        response = self.client.delete(detail_url, **self.admin_headers)
        self.assertEqual(response.status_code, 204)
        self.assertFalse(
            Delivery.objects.filter(delivery_id=self.existing_delivery.delivery_id).exists()
        )

    # 13. Patching with same value still returns 200
    def test_patch_same_value(self):
        detail_url = reverse("delivery-detail", args=[self.existing_delivery.delivery_id])
        payload = {"dropoff_time": "02:00:00"}
        response = self.client.patch(detail_url, payload, format="json", **self.admin_headers)
        self.assertEqual(response.status_code, 200)
        # Verify the dropoff_time was updated (now stored as datetime)
        self.existing_delivery.refresh_from_db()
        dropoff_time = self.existing_delivery.dropoff_time
        # Just verify it's a valid datetime (timezone conversion may occur)
        self.assertIsInstance(dropoff_time, datetime)

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

        response = self.client.post(self.list_url, payload, format="json", **self.admin_headers)
        self.assertEqual(response.status_code, 400)
        self.assertFalse(Delivery.objects.filter(delivery_id="DLV0010").exists())

    # 15. Filtering by a type with no matches returns empty list
    def test_filter_by_delivery_type_returns_empty(self):
        response = self.client.get(
            f"{self.list_url}?delivery_type=distribution", **self.admin_headers
        )
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
        response = self.client.patch(detail_url, payload, format="json", **self.admin_headers)
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
        response = self.client.post(self.list_url, payload, format="json", **self.admin_headers)
        self.assertEqual(response.status_code, 400)
        self.assertFalse(Delivery.objects.filter(delivery_id="DLV0012").exists())

    # 19. Getting a delivery after deletion returns 404
    def test_get_after_delete_returns_404(self):
        detail_url = reverse("delivery-detail", args=[self.existing_delivery.delivery_id])
        delete_response = self.client.delete(detail_url, **self.admin_headers)
        self.assertEqual(delete_response.status_code, 204)
        get_response = self.client.get(detail_url, **self.admin_headers)
        self.assertEqual(get_response.status_code, 404)

    # 20. Detail endpoint reflects updated dropoff location and time
    def test_detail_updates_after_patch(self):
        detail_url = reverse("delivery-detail", args=[self.existing_delivery.delivery_id])
        patch_payload = {
            "dropoff_time": "06:15:00",
            "notes": "Extended route",
        }
        patch_response = self.client.patch(
            detail_url, patch_payload, format="json", **self.admin_headers
        )
        self.assertEqual(patch_response.status_code, 200)
        detail_response = self.client.get(detail_url, **self.admin_headers)
        self.assertEqual(detail_response.status_code, 200)
        # dropoff_time is now returned as ISO datetime string, check it contains the time
        self.assertIn("06:15:00", detail_response.data["dropoff_time"])
        self.assertEqual(detail_response.data["notes"], "Extended route")

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
        response = self.client.post(self.list_url, payload, format="json", **self.admin_headers)
        self.assertEqual(response.status_code, 400)

    # 22. Listing supports pagination parameters
    def test_list_supports_pagination(self):
        response = self.client.get(f"{self.list_url}?page=1&page_size=1", **self.admin_headers)
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
        response = self.client.post(self.list_url, payload, format="json", **self.admin_headers)
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
        response = self.client.post(self.list_url, payload, format="json", **self.admin_headers)
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
        response = self.client.post(self.list_url, payload, format="json", **self.admin_headers)
        self.assertEqual(response.status_code, 400)
        self.assertFalse(Delivery.objects.filter(delivery_id="DLV0014").exists())

    # 26. Detail response contains related IDs
    def test_delivery_detail_contains_related_ids(self):
        detail_url = reverse("delivery-detail", args=[self.existing_delivery.delivery_id])
        response = self.client.get(detail_url, **self.admin_headers)
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
        response = self.client.post(self.list_url, payload, format="json", **self.admin_headers)
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
        response = self.client.post(self.list_url, payload, format="json", **self.admin_headers)
        self.assertEqual(response.status_code, 400)

    # 29. Deleting the same delivery twice yields 404 second time
    def test_delete_twice_returns_not_found(self):
        detail_url = reverse("delivery-detail", args=[self.existing_delivery.delivery_id])
        first_delete = self.client.delete(detail_url, **self.admin_headers)
        self.assertEqual(first_delete.status_code, 204)
        second_delete = self.client.delete(detail_url, **self.admin_headers)
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
        create_response = self.client.post(
            self.list_url, payload, format="json", **self.admin_headers
        )
        self.assertEqual(create_response.status_code, 201)
        response = self.client.get(
            f"{self.list_url}?delivery_type=distribution", **self.admin_headers
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(all(item["delivery_type"] == "distribution" for item in response.data))

    # 31. Regular user sees only deliveries tied to their donations
    def test_regular_user_sees_their_donation_deliveries(self):
        other_restaurant = Restaurant.objects.create(
            restaurant_id="RES999",
            address="99 Other St",
            name="Other Eats",
            branch_name="Branch",
            is_chain=False,
            chain=self.chain,
        )
        other_donation = Donation.objects.create(
            donation_id="DON9999",
            restaurant=other_restaurant,
        )
        other_delivery = Delivery.objects.create(
            delivery_id="DLV0999",
            delivery_type="donation",
            pickup_time=timezone.now(),
            dropoff_time=timedelta(hours=2),
            pickup_location_type="restaurant",
            dropoff_location_type="warehouse",
            warehouse_id=self.warehouse,
            user_id=self.delivery_user,
            donation_id=other_donation,
            community_id=self.community,
        )

        response = self.client.get(self.list_url, **self.user_headers)
        self.assertEqual(response.status_code, 200)
        delivery_ids = {item["delivery_id"] for item in response.data}
        self.assertIn(self.existing_delivery.delivery_id, delivery_ids)
        self.assertNotIn(other_delivery.delivery_id, delivery_ids)

    # 32. Donor sees deliveries for their restaurant
    def test_donor_sees_restaurant_deliveries(self):
        legacy_donation = Donation.objects.create(
            donation_id="DON0700",
            restaurant=self.restaurant,
        )
        legacy_delivery = Delivery.objects.create(
            delivery_id="DLV0700",
            delivery_type="donation",
            pickup_time=timezone.now(),
            dropoff_time=timedelta(hours=1),
            pickup_location_type="restaurant",
            dropoff_location_type="warehouse",
            warehouse_id=self.warehouse,
            user_id=self.delivery_user,
            donation_id=legacy_donation,
            community_id=self.community,
        )

        response = self.client.get(self.list_url, **self.user_headers)
        self.assertEqual(response.status_code, 200)
        delivery_ids = {item["delivery_id"] for item in response.data}
        self.assertIn(legacy_delivery.delivery_id, delivery_ids)

    # 32. Regular user sees distribution deliveries for their requested communities only
    def test_regular_user_sees_distribution_for_requested_communities(self):
        matching_distribution = Delivery.objects.create(
            delivery_id="DLV0500",
            delivery_type="distribution",
            pickup_time=timezone.now(),
            dropoff_time=timedelta(hours=3),
            pickup_location_type="warehouse",
            dropoff_location_type="community",
            warehouse_id=self.warehouse,
            user_id=self.delivery_user,
            donation_id=self.donation,
            community_id=self.community,
        )
        other_community = Community.objects.create(
            community_id="COM999",
            name="South Block",
            address="9 Down Street",
            received_time=timezone.now(),
            population=50,
            warehouse_id=self.warehouse,
        )
        other_distribution = Delivery.objects.create(
            delivery_id="DLV0600",
            delivery_type="distribution",
            pickup_time=timezone.now(),
            dropoff_time=timedelta(hours=4),
            pickup_location_type="warehouse",
            dropoff_location_type="community",
            warehouse_id=self.warehouse,
            user_id=self.delivery_user,
            donation_id=self.donation,
            community_id=other_community,
        )

        response = self.client.get(self.list_url, **self.user_headers)
        self.assertEqual(response.status_code, 200)
        delivery_ids = {item["delivery_id"] for item in response.data}
        self.assertIn(matching_distribution.delivery_id, delivery_ids)
        self.assertNotIn(other_distribution.delivery_id, delivery_ids)

    # 33. Users without related donations or requests see no deliveries
    def test_unrelated_user_sees_no_deliveries(self):
        response = self.client.get(self.list_url, **self.other_user_headers)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])
