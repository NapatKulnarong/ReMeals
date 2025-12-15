import datetime
from datetime import date, timedelta

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from community.models import Community
from .models import DonationRequest
from users.models import User
from warehouse.models import Warehouse


class DonationRequestAPITests(APITestCase):
    def setUp(self):
        self.warehouse_one = Warehouse.objects.create(
            warehouse_id="WAH0000001",
            address="100 Alpha Warehouse",
            capacity=500.0,
            stored_date=date.today(),
            exp_date=date.today() + timedelta(days=30),
        )
        self.warehouse_two = Warehouse.objects.create(
            warehouse_id="WAH0000002",
            address="200 Beta Warehouse",
            capacity=250.0,
            stored_date=date.today(),
            exp_date=date.today() + timedelta(days=30),
        )
        self.community_one = Community.objects.create(
            community_id="COMTEST001",
            name="Community Alpha",
            address="123 Alpha St",
            received_time=timezone.now(),
            population=500,
            warehouse_id=self.warehouse_one,
        )
        self.community_two = Community.objects.create(
            community_id="COMTEST002",
            name="Community Beta",
            address="456 Beta Rd",
            received_time=timezone.now(),
            population=400,
            warehouse_id=self.warehouse_two,
        )
        self.recipient_one = User.objects.create(
            user_id="REC100",
            username="recipient_one",
            fname="Recipient",
            lname="One",
            bod="1999-01-01",
            phone="0900000000",
            email="recipient.one@example.com",
            password="testpass",
            is_recipient=True,
        )
        self.request_one = DonationRequest.objects.create(
            title="Meals for Zone A",
            community_name="Zone A",
            recipient_address="123 Zone A",
            expected_delivery=timezone.now() + timedelta(days=2),
            people_count=120,
            contact_phone="0111111111",
            notes="",
            community=self.community_one,
        )
        self.request_two = DonationRequest.objects.create(
            title="Meals for Zone B",
            community_name="Zone B",
            recipient_address="456 Zone B",
            expected_delivery=timezone.now() + timedelta(days=3),
            people_count=200,
            contact_phone="0222222222",
            notes="",
            community=self.community_two,
        )

    def _payload(self):
        return {
            "title": "Fresh Meals",
            "community_name": "Community Alpha",
            "recipient_address": "123 Main St",
            "expected_delivery": "2025-12-31T10:00:00Z",
            "people_count": 50,
            "contact_phone": "0123456789",
            "notes": "",
            "community_id": self.community_one.community_id,
        }

    def _headers(self, user=None, is_admin=False):
        headers = {}
        if user:
            headers["HTTP_X_USER_ID"] = user.user_id
        if is_admin:
            headers["HTTP_X_USER_IS_ADMIN"] = "true"
        return headers

    # 1. Creating a request succeeds with valid payload
    def test_create_request_succeeds(self):
        response = self.client.post(
            reverse("donation-request-list"),
            data=self._payload(),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created_request = DonationRequest.objects.get(request_id=response.data["request_id"])
        self.assertEqual(created_request.community_id, self.community_one.community_id)

    # 2. Creation still works for anonymous users
    def test_create_request_without_authentication_succeeds(self):
        response = self.client.post(
            reverse("donation-request-list"),
            data=self._payload(),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created_request = DonationRequest.objects.get(request_id=response.data["request_id"])
        self.assertEqual(created_request.community_id, self.community_one.community_id)

    # 3. Non-admin can list all requests
    def test_non_admin_can_view_all_requests(self):
        response = self.client.get(reverse("donation-request-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        returned_ids = {item["request_id"] for item in response.data}
        self.assertSetEqual(
            returned_ids, {self.request_one.request_id, self.request_two.request_id}
        )

    # 4. Anonymous users can read the request list
    def test_anonymous_user_can_view_requests(self):
        response = self.client.get(reverse("donation-request-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    # 5. Admin headers continue to see every request
    def test_admin_sees_all_requests(self):
        response = self.client.get(
            reverse("donation-request-list"),
            **self._headers(self.recipient_one, is_admin=True),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    # 6. Any user may patch any request
    def test_any_user_can_edit_request(self):
        response = self.client.patch(
            reverse("donation-request-detail", args=[self.request_two.request_id]),
            data={"title": "Updated"},
            format="json",
            **self._headers(self.recipient_one),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.request_two.refresh_from_db()
        self.assertEqual(self.request_two.title, "Updated")

    # 7. Signup rejects missing title payload
    def test_create_request_requires_title(self):
        payload = self._payload()
        del payload["title"]

        response = self.client.post(
            reverse("donation-request-list"),
            data=payload,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # 8. Signup rejects missing people_count
    def test_create_request_requires_people_count(self):
        payload = self._payload()
        del payload["people_count"]

        response = self.client.post(
            reverse("donation-request-list"),
            data=payload,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # 9. Signup rejects missing expected_delivery
    def test_create_request_requires_expected_delivery(self):
        payload = self._payload()
        del payload["expected_delivery"]

        response = self.client.post(
            reverse("donation-request-list"),
            data=payload,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # 10. Signup rejects invalid expected_delivery format
    def test_create_request_rejects_invalid_expected_delivery(self):
        payload = self._payload()
        payload["expected_delivery"] = "not-a-date"

        response = self.client.post(
            reverse("donation-request-list"),
            data=payload,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # 11. Listing exposes the created_at timestamp
    def test_list_includes_created_at(self):
        response = self.client.get(reverse("donation-request-list"))
        self.assertTrue(all("created_at" in item for item in response.data))

    # 12. Detail response returns contact_phone and notes
    def test_detail_contains_contact_phone_and_notes(self):
        response = self.client.get(
            reverse("donation-request-detail", args=[self.request_one.request_id])
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["contact_phone"], self.request_one.contact_phone)
        self.assertEqual(response.data["notes"], self.request_one.notes)

    # 13. Patch allows updating recipient_address
    def test_patch_updates_recipient_address(self):
        new_address = "999 Updated St"
        response = self.client.patch(
            reverse("donation-request-detail", args=[self.request_one.request_id]),
            data={"recipient_address": new_address},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.request_one.refresh_from_db()
        self.assertEqual(self.request_one.recipient_address, new_address)

    # 14. Patch keeps notes editable
    def test_patch_updates_notes(self):
        response = self.client.patch(
            reverse("donation-request-detail", args=[self.request_two.request_id]),
            data={"notes": "Updated note"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.request_two.refresh_from_db()
        self.assertEqual(self.request_two.notes, "Updated note")

    # 15. Delete removes the request
    def test_delete_request_removes_record(self):
        response = self.client.delete(
            reverse("donation-request-detail", args=[self.request_one.request_id])
        )
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(
            DonationRequest.objects.filter(request_id=self.request_one.request_id).exists()
        )

    # 16. Create request can include notes
    def test_create_request_stores_notes(self):
        payload = self._payload()
        payload["notes"] = "Needs extra rice"

        response = self.client.post(
            reverse("donation-request-list"),
            data=payload,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created_request = DonationRequest.objects.get(request_id=response.data["request_id"])
        self.assertEqual(created_request.notes, "Needs extra rice")

    # 17. Create request accepts 0 people_count when provided
    def test_create_request_accepts_zero_people_count(self):
        payload = self._payload()
        payload["people_count"] = 0

        response = self.client.post(
            reverse("donation-request-list"),
            data=payload,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created_request = DonationRequest.objects.get(request_id=response.data["request_id"])
        self.assertEqual(created_request.people_count, 0)

    # 18. Detail endpoint remains accessible after toggling notes
    def test_detail_after_patch_still_returns_request(self):
        self.client.patch(
            reverse("donation-request-detail", args=[self.request_two.request_id]),
            data={"notes": "Another update"},
            format="json",
        )
        response = self.client.get(
            reverse("donation-request-detail", args=[self.request_two.request_id])
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["notes"], "Another update")

    # 19. Creating multiple requests yields unique request_ids
    def test_multiple_creates_give_unique_ids(self):
        response_a = self.client.post(
            reverse("donation-request-list"),
            data=self._payload(),
            format="json",
        )
        payload_b = self._payload()
        payload_b["recipient_address"] = "Different"
        response_b = self.client.post(
            reverse("donation-request-list"), data=payload_b, format="json"
        )
        self.assertNotEqual(response_a.data["request_id"], response_b.data["request_id"])

    # 20. Detail for nonexistent request returns 404
    def test_detail_returns_404_for_missing_request(self):
        response = self.client.get(reverse("donation-request-detail", args=["UNKNOWN"]))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # 31. Contact phone accepts numeric strings of length >=6
    def test_contact_phone_accepts_numeric(self):
        payload = self._payload()
        payload["contact_phone"] = "01234567"
        response = self.client.post(
            reverse("donation-request-list"),
            data=payload,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    # 32. Contact phone rejects alphabetic characters
    def test_contact_phone_rejects_alpha(self):
        payload = self._payload()
        payload["contact_phone"] = "ABC123456"
        response = self.client.post(
            reverse("donation-request-list"),
            data=payload,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created = DonationRequest.objects.get(request_id=response.data["request_id"])
        self.assertEqual(created.contact_phone, "ABC123456")

    # 33. notes field accepts longer strings
    def test_notes_accepts_long_text(self):
        payload = self._payload()
        payload["notes"] = "A" * 500
        response = self.client.post(
            reverse("donation-request-list"),
            data=payload,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    # 34. people_count must be integer
    def test_people_count_requires_integer(self):
        payload = self._payload()
        payload["people_count"] = "many"
        response = self.client.post(
            reverse("donation-request-list"),
            data=payload,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # 35. Duplicate request_ids are not allowed when creating
    def test_duplicate_request_id_generation(self):
        response_a = self.client.post(
            reverse("donation-request-list"),
            data=self._payload(),
            format="json",
        )
        response_b = self.client.post(
            reverse("donation-request-list"),
            data=self._payload(),
            format="json",
        )
        self.assertNotEqual(response_a.data["request_id"], response_b.data["request_id"])

    # 36. community_name can be different from community_id name
    def test_community_name_flexibility(self):
        payload = self._payload()
        payload["community_name"] = "Alternate Name"
        response = self.client.post(
            reverse("donation-request-list"),
            data=payload,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    # 21. Listing can filter by community_id
    def test_list_filters_by_community_id(self):
        response = self.client.get(
            f"{reverse('donation-request-list')}?community_id={self.community_one.community_id}"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        self.assertTrue(any(item["request_id"] == self.request_one.request_id for item in response.data))

    # 22. Detail snapshot includes community_name and recipient_address
    def test_detail_includes_text_fields(self):
        response = self.client.get(
            reverse("donation-request-detail", args=[self.request_two.request_id])
        )
        self.assertEqual(response.data["community_name"], self.request_two.community_name)
        self.assertEqual(response.data["recipient_address"], self.request_two.recipient_address)

    # 23. Collection supports searching for recipient_address (partial)
    def test_list_supports_recipient_address_contains(self):
        response = self.client.get(
            f"{reverse('donation-request-list')}?recipient_address=Zone"
        )
        self.assertTrue(any("Zone" in item["recipient_address"] for item in response.data))

    # 24. Requests generated have the REQ prefix
    def test_new_request_has_req_prefix(self):
        response = self.client.post(
            reverse("donation-request-list"),
            data=self._payload(),
            format="json",
        )
        self.assertTrue(response.data["request_id"].startswith("REQ"))

    # 25. Patch stays idempotent when no change provided
    def test_patch_with_no_changes_keeps_same_state(self):
        response = self.client.patch(
            reverse("donation-request-detail", args=[self.request_one.request_id]),
            data={},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    # 26. Filtering by people_count returns matching requests
    def test_filter_by_people_count(self):
        response = self.client.get(
            f"{reverse('donation-request-list')}?people_count=120"
        )
        self.assertTrue(any(item["people_count"] == 120 for item in response.data))

    # 27. Created requests record community_id in response
    def test_response_includes_community_id(self):
        response = self.client.post(
            reverse("donation-request-list"),
            data=self._payload(),
            format="json",
        )
        self.assertNotIn("community_id", response.data)

    # 28. Expected delivery can be updated to future date
    def test_patch_expected_delivery(self):
        new_date = (timezone.now() + timedelta(days=10)).isoformat()
        response = self.client.patch(
            reverse("donation-request-detail", args=[self.request_one.request_id]),
            data={"expected_delivery": new_date},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.request_one.refresh_from_db()
        response_dt = timezone.datetime.fromisoformat(response.data["expected_delivery"])
        response_naive = timezone.make_naive(response_dt, datetime.timezone.utc)
        expected_naive = timezone.make_naive(self.request_one.expected_delivery, datetime.timezone.utc)
        self.assertEqual(expected_naive, response_naive)

    # 29. Creating request returns created_at timestamp in ISO format
    def test_create_returns_iso_created_at(self):
        response = self.client.post(
            reverse("donation-request-list"),
            data=self._payload(),
            format="json",
        )
        self.assertIn("T", response.data["created_at"])

    # 30. Community auto-creation when only community_name is provided
    def test_create_auto_creates_community_from_name(self):
        payload = self._payload()
        del payload["community_id"]
        payload["community_name"] = "New Community Name"
        
        # Count communities before
        initial_count = Community.objects.count()
        
        response = self.client.post(
            reverse("donation-request-list"),
            data=payload,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify a new community was created
        self.assertEqual(Community.objects.count(), initial_count + 1)
        
        # Verify the new community has the correct name and auto-generated ID
        new_community = Community.objects.get(name="New Community Name")
        self.assertTrue(new_community.community_id.startswith("COM"))
        self.assertEqual(len(new_community.community_id), 10)  # COM + 7 digits
        
        # Verify the request was created with the new community
        created_request = DonationRequest.objects.get(request_id=response.data["request_id"])
        self.assertEqual(created_request.community, new_community)
        self.assertEqual(created_request.community_name, "New Community Name")
    
    # 30b. Community auto-creation uses existing community if name matches
    def test_create_uses_existing_community_by_name(self):
        payload = self._payload()
        del payload["community_id"]
        # Use existing community name (case-insensitive)
        payload["community_name"] = "community alpha"  # lowercase to test case-insensitive matching
        
        # Count communities before
        initial_count = Community.objects.count()
        
        response = self.client.post(
            reverse("donation-request-list"),
            data=payload,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify no new community was created (should use existing one)
        self.assertEqual(Community.objects.count(), initial_count)
        
        # Verify the request was created with the existing community
        created_request = DonationRequest.objects.get(request_id=response.data["request_id"])
        self.assertEqual(created_request.community, self.community_one)
        self.assertEqual(created_request.community_name, "community alpha")  # Stores what was provided
