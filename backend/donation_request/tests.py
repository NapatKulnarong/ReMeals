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

    def test_create_request_succeeds(self):
        response = self.client.post(
            reverse("donation-request-list"),
            data=self._payload(),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created_request = DonationRequest.objects.get(request_id=response.data["request_id"])
        self.assertEqual(created_request.community_id, self.community_one.community_id)

    def test_create_request_without_authentication_succeeds(self):
        response = self.client.post(
            reverse("donation-request-list"),
            data=self._payload(),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created_request = DonationRequest.objects.get(request_id=response.data["request_id"])
        self.assertEqual(created_request.community_id, self.community_one.community_id)

    def test_non_admin_can_view_all_requests(self):
        response = self.client.get(reverse("donation-request-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        returned_ids = {item["request_id"] for item in response.data}
        self.assertSetEqual(
            returned_ids, {self.request_one.request_id, self.request_two.request_id}
        )

    def test_anonymous_user_can_view_requests(self):
        response = self.client.get(reverse("donation-request-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_admin_sees_all_requests(self):
        response = self.client.get(
            reverse("donation-request-list"),
            **self._headers(self.recipient_one, is_admin=True),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

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
