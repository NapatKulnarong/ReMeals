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

    # 1. Recipient links to the community and its warehouse
    def test_recipient_links_to_community_and_warehouse(self):
        recipient = Recipient.objects.create(
            user=self.user,
            address="789 Recipient St",
            community_id=self.community,
        )

        self.assertEqual(recipient.community_id, self.community)
        self.assertEqual(recipient.community_id.warehouse_id, self.warehouse)

    # 2. Warehouse with linked community cannot be deleted
    def test_cannot_delete_warehouse_with_linked_community(self):
        Recipient.objects.create(
            user=self.user,
            address="789 Recipient St",
            community_id=self.community,
        )

        with self.assertRaises(ProtectedError):
            self.warehouse.delete()

    # 3. Deleting a community removes its recipient
    def test_deleting_community_removes_recipient(self):
        recipient = Recipient.objects.create(
            user=self.user,
            address="789 Recipient St",
            community_id=self.community,
        )

        self.community.delete()

        self.assertFalse(Recipient.objects.filter(pk=recipient.pk).exists())

    # 4. Serializer representation includes IDs and timestamps
    def test_community_serializer_representation(self):
        serializer = CommunitySerializer(instance=self.community)
        data = serializer.data

        self.assertEqual(data["community_id"], self.community.community_id)
        self.assertEqual(data["warehouse_id"], self.warehouse.warehouse_id)
        self.assertIn("received_time", data)

    # 5. Serializer accepts a valid payload
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

    # 6. Community list endpoint is publicly accessible
    def test_community_list_is_public(self):
        response = self.api_client.get(reverse("community-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()), 1)
        self.assertEqual(response.json()[0]["community_id"], self.community.community_id)

    # 7. Authenticated user can list communities
    def test_authenticated_user_can_list_communities(self):
        response = self.authenticated_client.get(reverse("community-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()), 1)
        self.assertEqual(response.json()[0]["community_id"], self.community.community_id)

    # 8. Authenticated user can create a community
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

    # 9. Warehouse list endpoint is publicly accessible
    def test_warehouse_list_is_public(self):
        response = self.api_client.get(reverse("warehouse-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()), 1)
        self.assertEqual(response.json()[0]["warehouse_id"], self.warehouse.warehouse_id)

    # 10. Authenticated user can list warehouses
    def test_authenticated_user_can_list_warehouses(self):
        response = self.authenticated_client.get(reverse("warehouse-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()), 1)
        self.assertEqual(response.json()[0]["warehouse_id"], self.warehouse.warehouse_id)

    # 11. Creating community without warehouse fails
    def test_create_community_missing_warehouse(self):
        payload = {
            "community_id": "C0102",
            "name": "Nowhere",
            "address": "Unknown",
            "received_time": timezone.now().isoformat(),
            "population": 10,
        }
        response = self.authenticated_client.post(
            reverse("community-list"), data=payload, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # 12. Authenticated user can retrieve community detail
    def test_authenticated_user_gets_community_detail(self):
        detail_url = reverse("community-detail", args=[self.community.community_id])
        response = self.authenticated_client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["community_id"], self.community.community_id)

    # 13. Authenticated user can patch community name
    def test_authenticated_user_can_patch_community(self):
        detail_url = reverse("community-detail", args=[self.community.community_id])
        response = self.authenticated_client.patch(
            detail_url, {"name": "Renamed"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.community.refresh_from_db()
        self.assertEqual(self.community.name, "Renamed")

    # 14. Unauthenticated delete request succeeds with public permissions
    def test_delete_without_authentication_succeeds(self):
        detail_url = reverse("community-detail", args=[self.community.community_id])
        response = self.api_client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(
            Community.objects.filter(community_id=self.community.community_id).exists()
        )

    # 15. Creating duplicate community_id returns error
    def test_create_duplicate_community_id_fails(self):
        payload = {
            "community_id": self.community.community_id,
            "name": "Dup",
            "address": "Somewhere",
            "received_time": timezone.now().isoformat(),
            "population": 123,
            "warehouse_id": self.warehouse.warehouse_id,
        }
        response = self.authenticated_client.post(
            reverse("community-list"), data=payload, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # 16. Serializer rejects population less than zero
    def test_serializer_rejects_negative_population(self):
        payload = {
            "community_id": "NEG001",
            "name": "NegativeTown",
            "address": "Nope",
            "received_time": timezone.now(),
            "population": -5,
            "warehouse_id": self.warehouse.warehouse_id,
        }
        serializer = CommunitySerializer(data=payload)
        self.assertFalse(serializer.is_valid())

    # 17. Serializer rejects missing community_id
    def test_serializer_requires_community_id(self):
        payload = {
            "name": "MissingId",
            "address": "Somewhere",
            "received_time": timezone.now(),
            "population": 50,
            "warehouse_id": self.warehouse.warehouse_id,
        }
        serializer = CommunitySerializer(data=payload)
        self.assertFalse(serializer.is_valid())

    # 18. API rejects community creation without name
    def test_create_community_requires_name(self):
        payload = {
            "community_id": "NONAME",
            "address": "Road 123",
            "received_time": timezone.now().isoformat(),
            "population": 25,
            "warehouse_id": self.warehouse.warehouse_id,
        }
        response = self.authenticated_client.post(
            reverse("community-list"), data=payload, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # 19. Authenticated user can delete a community
    def test_authenticated_user_can_delete_community(self):
        detail_url = reverse("community-detail", args=[self.community.community_id])
        response = self.authenticated_client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(
            Community.objects.filter(community_id=self.community.community_id).exists()
        )

    # 20. Listing communities returns empty list after deletion
    def test_list_empty_after_deletion(self):
        self.community.delete()
        response = self.authenticated_client.get(reverse("community-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json(), [])

    # 21. Serializer can create a community instance from data
    def test_serializer_can_create_instance(self):
        payload = {
            "community_id": "C0200",
            "name": "Serializer Create",
            "address": "100 Road",
            "received_time": timezone.now(),
            "population": 321,
            "warehouse_id": self.warehouse.warehouse_id,
        }
        serializer = CommunitySerializer(data=payload)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        instance = serializer.save()
        self.assertEqual(instance.community_id, "C0200")

    # 22. API rejects community creation when warehouse does not exist
    def test_create_community_invalid_warehouse(self):
        payload = {
            "community_id": "C0201",
            "name": "Invalid Warehouse",
            "address": "No Warehouse",
            "received_time": timezone.now().isoformat(),
            "population": 111,
            "warehouse_id": "NOT_FOUND",
        }
        response = self.authenticated_client.post(
            reverse("community-list"), data=payload, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # 23. Authenticated user can update community population
    def test_authenticated_user_updates_population(self):
        detail_url = reverse("community-detail", args=[self.community.community_id])
        response = self.authenticated_client.patch(
            detail_url, {"population": 1500}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.community.refresh_from_db()
        self.assertEqual(self.community.population, 1500)

    # 24. Deleting a non-existent community returns 404
    def test_delete_nonexistent_community_returns_404(self):
        response = self.authenticated_client.delete(
            reverse("community-detail", args=["UNKNOWN"])
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # 25. Serializer accepts ISO formatted received_time strings
    def test_serializer_accepts_iso_received_time(self):
        payload = {
            "community_id": "C0202",
            "name": "ISO Time",
            "address": "Time Lane",
            "received_time": timezone.now().isoformat(),
            "population": 222,
            "warehouse_id": self.warehouse.warehouse_id,
        }
        serializer = CommunitySerializer(data=payload)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    # 26. Serializer rejects non-numeric population
    def test_serializer_rejects_non_numeric_population(self):
        payload = {
            "community_id": "C0300",
            "name": "Bad Population",
            "address": "String St",
            "received_time": timezone.now(),
            "population": "invalid",
            "warehouse_id": self.warehouse.warehouse_id,
        }
        serializer = CommunitySerializer(data=payload)
        self.assertFalse(serializer.is_valid())

    # 27. API returns 400 when population is negative
    def test_api_rejects_negative_population(self):
        payload = {
            "community_id": "NEGAPI",
            "name": "Negative API",
            "address": "Bad Road",
            "received_time": timezone.now().isoformat(),
            "population": -10,
            "warehouse_id": self.warehouse.warehouse_id,
        }
        response = self.authenticated_client.post(
            reverse("community-list"), data=payload, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # 28. Serializer reflects partial update values
    def test_serializer_partial_update(self):
        serializer = CommunitySerializer(
            instance=self.community, data={"name": "Partial"}, partial=True
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        instance = serializer.save()
        self.assertEqual(instance.name, "Partial")

    # 29. API filtering by nonexistent warehouse returns empty list
    def test_filter_by_invalid_warehouse_returns_empty(self):
        response = self.authenticated_client.get(
            f"{reverse('community-list')}?warehouse_id=NOTREAL"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json(), [])

    # 30. Serializer rejects overly long community name
    def test_serializer_rejects_long_name(self):
        payload = {
            "community_id": "LONG1",
            "name": "A" * 256,
            "address": "Long Name Street",
            "received_time": timezone.now(),
            "population": 123,
            "warehouse_id": self.warehouse.warehouse_id,
        }
        serializer = CommunitySerializer(data=payload)
        self.assertFalse(serializer.is_valid())
