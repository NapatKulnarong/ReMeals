from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import DonationRequest


class DonationRequestAPITests(APITestCase):
    def test_create_request(self):
        payload = {
            "title": "Fresh Meals",
            "community_name": "Community Alpha",
            "recipient_address": "123 Main St",
            "expected_delivery": "2025-12-31T10:00:00Z",
            "people_count": 50,
            "contact_phone": "0123456789",
            "notes": "",
        }
        response = self.client.post(
            reverse("donation-request-list"), data=payload, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(DonationRequest.objects.count(), 1)
        created_request = DonationRequest.objects.first()
        self.assertTrue(created_request.request_id.startswith("REQ"))
