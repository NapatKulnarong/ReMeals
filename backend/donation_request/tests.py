from datetime import date, timedelta

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from .models import DonationRequest
from users.models import User


class DonationRequestAPITests(APITestCase):
    def setUp(self):
        self.recipient_one = User.objects.create(
            user_id="REC100001",
            username="recipient_one",
            fname="Recipient",
            lname="One",
            bod=date(1990, 1, 1),
            phone="0100000001",
            email="recipient.one@example.com",
            password="testpass",
        )
        self.recipient_two = User.objects.create(
            user_id="REC100002",
            username="recipient_two",
            fname="Recipient",
            lname="Two",
            bod=date(1991, 2, 2),
            phone="0100000002",
            email="recipient.two@example.com",
            password="testpass",
        )
        self.request_one = DonationRequest.objects.create(
            title="Meals for Zone A",
            community_name="Zone A",
            recipient_address="123 Zone A",
            expected_delivery=timezone.now() + timedelta(days=2),
            people_count=120,
            contact_phone="0111111111",
            notes="",
            created_by=self.recipient_one,
        )
        self.request_two = DonationRequest.objects.create(
            title="Meals for Zone B",
            community_name="Zone B",
            recipient_address="456 Zone B",
            expected_delivery=timezone.now() + timedelta(days=3),
            people_count=200,
            contact_phone="0222222222",
            notes="",
            created_by=self.recipient_two,
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
        }

    def _headers(self, user=None, *, is_admin=False):
        headers = {
            "HTTP_X_USER_IS_ADMIN": "true" if is_admin else "false",
        }
        if user:
            headers["HTTP_X_USER_ID"] = user.user_id
        return headers

    def test_create_request_sets_owner(self):
        response = self.client.post(
            reverse("donation-request-list"),
            data=self._payload(),
            format="json",
            **self._headers(self.recipient_one),
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created_request = DonationRequest.objects.get(request_id=response.data["request_id"])
        self.assertEqual(created_request.created_by, self.recipient_one)

    def test_create_request_requires_authentication(self):
        response = self.client.post(
            reverse("donation-request-list"),
            data=self._payload(),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_non_admin_can_view_all_requests(self):
        response = self.client.get(
            reverse("donation-request-list"),
            **self._headers(self.recipient_one),
        )
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

    def test_non_admin_cannot_edit_other_request(self):
        response = self.client.patch(
            reverse("donation-request-detail", args=[self.request_two.request_id]),
            data={"title": "Updated"},
            format="json",
            **self._headers(self.recipient_one),
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
