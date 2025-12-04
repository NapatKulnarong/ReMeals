from datetime import date, timedelta
from types import SimpleNamespace

from django.db.models import ProtectedError
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from users.models import Recipient, User
from warehouse.models import Warehouse
from .models import Community
from .serializers import CommunitySerializer


class RecipientCommunityWarehouseTests(TestCase):
    def setUp(self):
        self.user = User.objects.create(
            user_id="U0001",
            username="recipientuser",
            fname="Recipient",
            lname="User",
            bod="2000-01-01",
            phone="0123456789",
            email="recipient@example.com",
            password="secret",
        )
        self.warehouse = Warehouse.objects.create(
            warehouse_id="W0001",
            address="123 Storage Ave",
            capacity=100.0,
            stored_date=date.today(),
            exp_date=date.today() + timedelta(days=7),
        )
        self.community = Community.objects.create(
            community_id="C0001",
            name="Test Community",
            address="456 Community Rd",
            received_time=timezone.now(),
            population=500,
            warehouse_id=self.warehouse,
        )

    def test_recipient_links_to_community_and_warehouse(self):
        recipient = Recipient.objects.create(
            user=self.user,
            address="789 Recipient St",
            community_id=self.community,
        )

        self.assertEqual(recipient.community_id, self.community)
        self.assertEqual(recipient.community_id.warehouse_id, self.warehouse)

    def test_cannot_delete_warehouse_with_linked_community(self):
        Recipient.objects.create(
            user=self.user,
            address="789 Recipient St",
            community_id=self.community,
        )

        with self.assertRaises(ProtectedError):
            self.warehouse.delete()

    def test_deleting_community_removes_recipient(self):
        recipient = Recipient.objects.create(
            user=self.user,
            address="789 Recipient St",
            community_id=self.community,
        )

        self.community.delete()

        self.assertFalse(Recipient.objects.filter(pk=recipient.pk).exists())

    def test_community_serializer_representation(self):
        serializer = CommunitySerializer(instance=self.community)
        data = serializer.data

        self.assertEqual(data["community_id"], self.community.community_id)
        self.assertEqual(data["warehouse_id"], self.warehouse.warehouse_id)
        self.assertIn("received_time", data)

    def test_community_serializer_accepts_valid_payload(self):
        payload = {
            "community_id": "C0002",
            "name": "Serializer Town",
            "address": "123 Serializer Rd",
            "received_time": timezone.now(),
            "population": 200,
            "warehouse_id": self.warehouse.warehouse_id,
        }
        serializer = CommunitySerializer(data=payload)
        self.assertTrue(serializer.is_valid(), serializer.errors)


class CommunityWarehouseAPITests(TestCase):
    def setUp(self):
        self.api_client = APIClient()
        self.authenticated_client = APIClient()
        self.authenticated_client.force_authenticate(
            SimpleNamespace(is_authenticated=True)
        )
        self.warehouse = Warehouse.objects.create(
            warehouse_id="W0100",
            address="10 Warehouse Way",
            capacity=250.0,
            stored_date=date.today(),
            exp_date=date.today() + timedelta(days=10),
        )
        self.community = Community.objects.create(
            community_id="C0100",
            name="APIVille",
            address="12 Test Blvd",
            received_time=timezone.now(),
            population=1000,
            warehouse_id=self.warehouse,
        )

    def test_community_list_requires_authentication(self):
        response = self.api_client.get(reverse("community-list"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_authenticated_user_can_list_communities(self):
        response = self.authenticated_client.get(reverse("community-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()), 1)
        self.assertEqual(response.json()[0]["community_id"], self.community.community_id)

    def test_authenticated_user_can_create_community(self):
        payload = {
            "community_id": "C0101",
            "name": "APIVille 2",
            "address": "13 Test Blvd",
            "received_time": timezone.now().isoformat(),
            "population": 750,
            "warehouse_id": self.warehouse.warehouse_id,
        }
        response = self.authenticated_client.post(
            reverse("community-list"),
            data=payload,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Community.objects.filter(community_id="C0101").exists())

    def test_warehouse_list_requires_authentication(self):
        response = self.api_client.get(reverse("warehouse-list"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_authenticated_user_can_list_warehouses(self):
        response = self.authenticated_client.get(reverse("warehouse-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()), 1)
        self.assertEqual(response.json()[0]["warehouse_id"], self.warehouse.warehouse_id)
