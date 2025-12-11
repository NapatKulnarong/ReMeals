from datetime import datetime

from django.utils import timezone
from rest_framework.test import APITestCase, APIClient

from .models import Donation
from restaurants.models import Restaurant
from restaurant_chain.models import RestaurantChain


class DonationTests(APITestCase):

    def setUp(self):
        self.client = APIClient()

        self.chain = RestaurantChain.objects.create(
            chain_id="CHA01",
            chain_name="KFC Group",
        )
        self.restaurant = Restaurant.objects.create(
            restaurant_id="RES001",
            address="Bangkok",
            name="KFC",
            branch_name="Central",
            is_chain=True,
            chain=self.chain,
        )

    # 1. Create donation successfully
    def test_create_donation(self):
        data = {
            "donation_id": "DON001",
            "status": "pending",
            "restaurant": "RES001"
        }

        response = self.client.post("/api/donations/", data, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertTrue(Donation.objects.filter(donation_id="DON001").exists())

    # 2. List all donations
    def test_list_donations(self):
        Donation.objects.create(donation_id="DON001", restaurant=self.restaurant)
        Donation.objects.create(donation_id="DON002", restaurant=self.restaurant)

        response = self.client.get("/api/donations/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2)

    # 3. Filter donations by restaurant_id
    def test_filter_by_restaurant(self):
        Donation.objects.create(donation_id="DON001", restaurant=self.restaurant)

        response = self.client.get("/api/donations/?restaurant_id=RES001")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    # 4. Filter donations by status
    def test_filter_by_status(self):
        Donation.objects.create(donation_id="DON001", restaurant=self.restaurant, status="pending")
        Donation.objects.create(donation_id="DON002", restaurant=self.restaurant, status="accepted")

        response = self.client.get("/api/donations/?status=accepted")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["donation_id"], "DON002")

    # 5. Patch donation status
    def test_update_donation_status(self):
        Donation.objects.create(donation_id="DON001", restaurant=self.restaurant, status="pending")

        response = self.client.patch("/api/donations/DON001/", {"status": "accepted"}, format="json")
        self.assertEqual(response.status_code, 200)

        updated = Donation.objects.get(donation_id="DON001")
        self.assertEqual(updated.status, "accepted")

    # 6. Deleting restaurant should delete its donations (CASCADE)
    def test_cascade_delete(self):
        Donation.objects.create(donation_id="DON001", restaurant=self.restaurant)

        self.client.delete("/api/restaurants/RES001/")
        self.assertEqual(Donation.objects.count(), 0)

    # 7. Creating donation fails when restaurant does not exist
    def test_create_invalid_restaurant(self):
        data = {
            "donation_id": "DON010",
            "status": "pending",
            "restaurant": "NOPE"
        }
        response = self.client.post("/api/donations/", data, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Donation.objects.count(), 0)

    # 8. Creating duplicate donation_id should fail
    def test_create_duplicate_donation_id(self):
        Donation.objects.create(donation_id="DON001", restaurant=self.restaurant)
        data = {
            "donation_id": "DON001",
            "status": "pending",
            "restaurant": "RES001"
        }
        response = self.client.post("/api/donations/", data, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Donation.objects.count(), 1)

    # 9. Get specific donation by ID
    def test_get_single_donation(self):
        Donation.objects.create(donation_id="DON001", restaurant=self.restaurant)
        response = self.client.get("/api/donations/DON001/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["donation_id"], "DON001")

    # 10. Deleting a donation removes it from database
    def test_delete_donation(self):
        Donation.objects.create(donation_id="DON001", restaurant=self.restaurant)
        self.client.delete("/api/donations/DON001/")
        self.assertEqual(Donation.objects.count(), 0)

    # 11. Filtering donations with status=pending returns correct ones
    def test_filter_status_false(self):
        Donation.objects.create(donation_id="DON1", restaurant=self.restaurant, status="pending")
        Donation.objects.create(donation_id="DON2", restaurant=self.restaurant, status="accepted")
        response = self.client.get("/api/donations/?status=pending")
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["donation_id"], "DON1")

    # 12. donated_at should be automatically generated
    def test_donated_at_auto_created(self):
        Donation.objects.create(donation_id="DON001", restaurant=self.restaurant)
        d = Donation.objects.get(donation_id="DON001")
        self.assertIsNotNone(d.donated_at)

    # 13. Updating only status should not modify donation_id or restaurant
    def test_partial_update_status_only(self):
        Donation.objects.create(donation_id="DON001", restaurant=self.restaurant, status="pending")
        self.client.patch("/api/donations/DON001/", {"status": "accepted"}, format="json")
        d = Donation.objects.get(donation_id="DON001")
        self.assertEqual(d.status, "accepted")
        self.assertEqual(d.donation_id, "DON001")
        self.assertEqual(d.restaurant.restaurant_id, "RES001")

    # 14. Donation list returns empty if no donations exist
    def test_empty_donations_list(self):
        response = self.client.get("/api/donations/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 0)

    # 15. Cannot update donation restaurant (FK should be immutable)
    def test_cannot_change_restaurant_fk(self):
        Donation.objects.create(donation_id="DON001", restaurant=self.restaurant)

        r2_chain = RestaurantChain.objects.create(chain_id="CHA02", chain_name="Pizza Group")
        r2 = Restaurant.objects.create(
            restaurant_id="RES002",
            address="X",
            name="X",
            branch_name="X",
            is_chain=False,
            chain=r2_chain,
        )

        response = self.client.patch("/api/donations/DON001/", {"restaurant": "RES002"}, format="json")
        self.assertEqual(response.status_code, 400)

    # 16. Donation fails when missing required donation_id
    def test_create_missing_donation_id(self):
        data = {
            "status": "pending",
            "restaurant": "RES001"
        }
        response = self.client.post("/api/donations/", data, format="json")
        self.assertEqual(response.status_code, 400)

    # 17. Filter date_from returns only newer donations
    def test_filter_date_from(self):
        Donation.objects.create(donation_id="DON1", restaurant=self.restaurant)
        d_old = Donation.objects.create(donation_id="DON2", restaurant=self.restaurant)

        d_old.donated_at = timezone.make_aware(datetime(2020, 1, 1))
        d_old.save(update_fields=["donated_at"])

        response = self.client.get("/api/donations/?date_from=2023-01-01T00:00:00Z")
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["donation_id"], "DON1")

    # 18. Filter date_to returns only older donations
    def test_filter_date_to(self):
        Donation.objects.create(donation_id="DON1", restaurant=self.restaurant)
        d_old = Donation.objects.create(donation_id="DON2", restaurant=self.restaurant)

        d_old.donated_at = timezone.make_aware(datetime(2020, 1, 1))
        d_old.save(update_fields=["donated_at"])

        response = self.client.get("/api/donations/?date_to=2021-01-01T00:00:00Z")
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["donation_id"], "DON2")

    # 19. Invalid status value in filter should return 0 results
    def test_invalid_status_param(self):
        Donation.objects.create(donation_id="DON1", restaurant=self.restaurant, status="pending")
        response = self.client.get("/api/donations/?status=maybe")
        self.assertEqual(len(response.data), 0)

    # 20. PUT donation allowed but FK cannot change
    def test_put_without_changing_fk(self):
        Donation.objects.create(donation_id="DON1", restaurant=self.restaurant, status="pending")
        data = {
            "donation_id": "DON1",
            "status": "accepted",
            "restaurant": "RES001"
        }
        response = self.client.put("/api/donations/DON1/", data, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Donation.objects.get(donation_id="DON1").status, "accepted")

    # 21. PUT donation cannot change restaurant
    def test_put_cannot_change_restaurant(self):
        Donation.objects.create(donation_id="DON1", restaurant=self.restaurant, status="pending")

        r2_chain = RestaurantChain.objects.create(chain_id="CHA03", chain_name="Burger Group")
        r2 = Restaurant.objects.create(
            restaurant_id="RES002",
            address="X",
            name="X",
            branch_name="X",
            is_chain=False,
            chain=r2_chain,
        )

        data = {
            "donation_id": "DON1",
            "status": "accepted",
            "restaurant": "RES002"
        }
        response = self.client.put("/api/donations/DON1/", data, format="json")
        self.assertEqual(response.status_code, 400)

    # 22. Creating donation without status defaults to pending
    def test_create_without_status_defaults_false(self):
        self.client.post("/api/donations/", {
            "donation_id": "DON1",
            "restaurant": "RES001"
        }, format="json")
        d = Donation.objects.get(donation_id="DON1")
        self.assertEqual(d.status, "pending")

    # 23. Massive creation 50 donations
    def test_mass_create(self):
        for i in range(50):
            Donation.objects.create(
                donation_id=f"DON{i}",
                restaurant=self.restaurant
            )
        self.assertEqual(Donation.objects.count(), 50)

    # 24. Donations list sorted by donated_at ascending (default)
    def test_list_ordering_donated_at(self):
        Donation.objects.create(donation_id="DON1", restaurant=self.restaurant)
        Donation.objects.create(donation_id="DON2", restaurant=self.restaurant)
        response = self.client.get("/api/donations/")
        ids = [d["donation_id"] for d in response.data]
        self.assertEqual(ids, ["DON1", "DON2"])

    # 25. PATCH with same donation_id should succeed and keep original ID
    def test_patch_same_donation_id(self):
        Donation.objects.create(donation_id="DON1", restaurant=self.restaurant, status="pending")

        response = self.client.patch("/api/donations/DON1/", {
            "donation_id": "DON1",
            "status": "accepted"
        }, format="json")

        self.assertEqual(response.status_code, 200)

        d = Donation.objects.get(donation_id="DON1")
        self.assertEqual(d.status, "accepted")

    # 26. Donation API ignores unknown fields
    def test_unknown_fields_ignored(self):
        Donation.objects.create(donation_id="DON1", restaurant=self.restaurant)
        response = self.client.patch("/api/donations/DON1/", {"hello": "world"}, format="json")
        self.assertEqual(response.status_code, 200)

    # 27. Donation works with lowercase restaurant id
    def test_create_lowercase_restaurant_id(self):
        data = {
            "donation_id": "DONLOW",
            "restaurant": "res001"
        }
        response = self.client.post("/api/donations/", data, format="json")
        self.assertEqual(response.status_code, 400)

    # 28. Querying non-existing donation returns 404
    def test_get_nonexistent_donation(self):
        response = self.client.get("/api/donations/DONOESNOTEXIST/")
        self.assertEqual(response.status_code, 404)

    # 29. Deleting non-existing donation returns 404
    def test_delete_nonexistent(self):
        response = self.client.delete("/api/donations/NOPE/")
        self.assertEqual(response.status_code, 404)

    # 30. Patch without body should return 200 and do nothing
    def test_empty_patch(self):
        Donation.objects.create(donation_id="DON1", restaurant=self.restaurant, status="pending")
        response = self.client.patch("/api/donations/DON1/", {}, format="json")
        self.assertEqual(response.status_code, 200)

    # 31. PUT without status should keep original status
    def test_put_without_status_keeps_status(self):
        Donation.objects.create(donation_id="DON1", restaurant=self.restaurant, status="accepted")

        response = self.client.put("/api/donations/DON1/", {
            "donation_id": "DON1",
            "restaurant": "RES001"
        }, format="json")

        self.assertEqual(response.status_code, 200)

        d = Donation.objects.get(donation_id="DON1")
        self.assertEqual(d.status, "accepted")

    # 32. Filtering donation with restaurant_id + status together
    def test_filter_multiple_params(self):
        Donation.objects.create(donation_id="DON1", restaurant=self.restaurant, status="pending")
        Donation.objects.create(donation_id="DON2", restaurant=self.restaurant, status="accepted")

        response = self.client.get("/api/donations/?restaurant_id=RES001&status=accepted")
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["donation_id"], "DON2")

    # 33. Donation response contains required fields
    def test_donation_response_structure(self):
        Donation.objects.create(donation_id="DON1", restaurant=self.restaurant, status="accepted")

        response = self.client.get("/api/donations/DON1/")
        self.assertEqual(response.status_code, 200)

        expected_keys = {"donation_id", "donated_at", "status", "restaurant"}
        self.assertEqual(set(response.data.keys()), expected_keys)

    # 34. Creating donation with uppercase restaurant ID should work
    def test_create_uppercase_restaurant_id(self):
        data = {
            "donation_id": "DONUP",
            "restaurant": "RES001",
            "status": "pending",
        }
        response = self.client.post("/api/donations/", data, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertTrue(Donation.objects.filter(donation_id="DONUP").exists())
